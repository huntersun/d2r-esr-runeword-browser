#!/usr/bin/env node
/**
 * What changed in the ESR repository between the revision our committed game data was built from and the clone's
 * HEAD: patch notes, changelog entries, game tables, strings, official docs pages, launcher configs, everything else.
 * Read-only: never modifies the clone (except an on-demand `git fetch` of a missing --from commit in a shallow clone).
 *
 *   node scripts/esr-release-diff.ts [--esr <dir>] [--from <rev>] [--to <rev>] [--json]
 *
 * --from defaults to esrCommit of public/game-data/manifest.json as committed in HEAD (the working-tree copy already
 * holds the new commit after game-data:update), --to to the clone's HEAD. Exit 0 also when nothing changed, 1 on
 * errors, 2 when --from cannot be found even after a fetch.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { REPO_ROOT, resolveEsrDir } from './lib/esrClone.ts';
import {
  classifyPath,
  diffStrings,
  diffTsv,
  docKind,
  formatReleaseDiff,
  LAUNCHER_DIFF_MAX_LINES,
  newChangelogEntries,
  parseChanges,
  patchNoteVersion,
  type FileChange,
  type ReleaseDiff,
  type RevisionInfo,
} from './lib/releaseDiff.ts';

const MANIFEST_PATH = 'public/game-data/manifest.json';

class UsageError extends Error {
  exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

/** Runs git and returns stdout untrimmed, or null when it fails. Large buffer: some tables are several MB. */
function run(cwd: string, args: string[]): string | null {
  try {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 512 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function manifestCommit(text: string | null): string | null {
  if (text === null) return null;
  try {
    const parsed = JSON.parse(text) as { esrCommit?: unknown };
    return typeof parsed.esrCommit === 'string' && parsed.esrCommit !== '' ? parsed.esrCommit : null;
  } catch {
    return null;
  }
}

/** esrCommit of the manifest committed in HEAD, else of the working-tree manifest. */
function defaultFrom(): string {
  const committed = manifestCommit(run(REPO_ROOT, ['show', `HEAD:${MANIFEST_PATH}`]));
  if (committed !== null) return committed;
  const file = join(REPO_ROOT, MANIFEST_PATH);
  const working = existsSync(file) ? manifestCommit(readFileSync(file, 'utf8')) : null;
  if (working === null) throw new UsageError(`No esrCommit in ${MANIFEST_PATH} (HEAD or working tree); pass --from <rev>.`);
  return working;
}

function resolveCommit(esrDir: string, rev: string): string | null {
  return run(esrDir, ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`])?.trim() ?? null;
}

/** Resolves --from; in a shallow clone fetches the missing commit once (best effort). */
function resolveFrom(esrDir: string, rev: string): string {
  const local = resolveCommit(esrDir, rev);
  if (local !== null) return local;
  console.error(`--from ${rev} is not in the clone (shallow?); trying: git -C ${esrDir} fetch --depth 1 origin ${rev}`);
  if (run(esrDir, ['fetch', '--depth', '1', '--no-tags', 'origin', rev]) !== null) {
    const fetched = resolveCommit(esrDir, rev) ?? (/^[0-9a-f]{7,40}$/i.test(rev) ? null : resolveCommit(esrDir, 'FETCH_HEAD'));
    if (fetched !== null) return fetched;
  }
  throw new UsageError(
    `Revision ${rev} is not available in ${esrDir}, and fetching it from origin failed.\n` +
      'Fetch more history (git fetch --unshallow) or pass --from with a revision the clone has.',
    2
  );
}

function revisionInfo(esrDir: string, rev: string, commit: string): RevisionInfo {
  return {
    rev,
    commit,
    describe: run(esrDir, ['describe', '--tags', commit])?.trim() ?? null,
    date: run(esrDir, ['log', '-1', '--format=%cs', commit])?.trim() ?? null,
  };
}

function main(): void {
  const { values } = parseArgs({
    options: { esr: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, json: { type: 'boolean', default: false } },
  });
  const esrDir = resolveEsrDir(values.esr);
  if (!existsSync(esrDir) || run(esrDir, ['rev-parse', '--git-dir']) === null) {
    throw new UsageError(`No ESR git clone at ${esrDir} (use --esr <dir> or ESR_SOURCE_DIR, or run npm run game-data:update).`);
  }

  const toRev = values.to ?? 'HEAD';
  const toCommit = resolveCommit(esrDir, toRev);
  if (toCommit === null) throw new UsageError(`Unknown --to revision: ${toRev}`);
  const fromRev = values.from ?? defaultFrom();
  const fromCommit = resolveFrom(esrDir, fromRev);

  const show = (commit: string, path: string) => run(esrDir, ['show', `${commit}:${path}`]) ?? '';
  const size = (commit: string, path: string) => {
    const out = run(esrDir, ['cat-file', '-s', `${commit}:${path}`]);
    return out === null ? null : Number(out.trim());
  };
  const unified = (path: string) => run(esrDir, ['diff', '--no-color', '--no-renames', fromCommit, toCommit, '--', path]) ?? '';
  const before = (change: FileChange) => (change.status === 'A' ? '' : show(fromCommit, change.path));
  const after = (change: FileChange) => (change.status === 'D' ? '' : show(toCommit, change.path));

  const nameStatus = run(esrDir, ['diff', '--name-status', '--no-renames', fromCommit, toCommit]);
  const numstat = run(esrDir, ['diff', '--numstat', '--no-renames', fromCommit, toCommit]);
  if (nameStatus === null || numstat === null) throw new UsageError(`git diff ${fromCommit} ${toCommit} failed in ${esrDir}.`);

  const diff: ReleaseDiff = {
    from: revisionInfo(esrDir, fromRev, fromCommit),
    to: revisionInfo(esrDir, toRev, toCommit),
    patchNotes: [],
    changelog: null,
    tables: [],
    tablesBaseIgnored: 0,
    strings: [],
    docs: [],
    launcher: [],
    other: [],
  };

  for (const change of parseChanges(nameStatus, numstat)) {
    switch (classifyPath(change.path)) {
      case 'patchNotes':
        diff.patchNotes.push({
          path: change.path,
          status: change.status,
          version: patchNoteVersion(change.path),
          text: change.status === 'A' ? after(change) : null,
          diff: change.status === 'A' ? null : unified(change.path),
        });
        break;
      case 'changelog':
        diff.changelog = newChangelogEntries(before(change), after(change));
        break;
      case 'tables':
        diff.tables.push(diffTsv(change.path, change.status, before(change), after(change)));
        break;
      case 'tablesBase':
        diff.tablesBaseIgnored++;
        break;
      case 'strings':
        diff.strings.push(diffStrings(change.path, change.status, before(change), after(change)));
        break;
      case 'docs':
        diff.docs.push({
          path: change.path,
          status: change.status,
          kind: docKind(change.path),
          bytesBefore: change.status === 'A' ? null : size(fromCommit, change.path),
          bytesAfter: change.status === 'D' ? null : size(toCommit, change.path),
        });
        break;
      case 'launcher': {
        const text = change.added !== null;
        const lines = text && change.status !== 'D' ? after(change).split('\n').length : 0;
        const small = text && lines <= LAUNCHER_DIFF_MAX_LINES && (change.added ?? 0) + (change.removed ?? 0) <= LAUNCHER_DIFF_MAX_LINES;
        diff.launcher.push({ ...change, diff: small ? unified(change.path) : null });
        break;
      }
      case 'other':
        diff.other.push(change);
        break;
    }
  }

  if (values.json) console.log(JSON.stringify(diff, null, 2));
  else for (const line of formatReleaseDiff(diff)) console.log(line);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(error instanceof UsageError ? error.exitCode : 1);
}
