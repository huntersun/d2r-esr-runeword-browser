#!/usr/bin/env node
/**
 * One-shot update after an ESR release: clone or pull the ESR repo, regenerate public/game-data/, refresh the HTM
 * test fixtures, run the game-data tests and the staleness check, regenerate and check public/guide/, print the guide
 * freshness report (guide:report), then print a summary. Never commits.
 *
 *   node scripts/update-game-data.ts [--esr <dir>] [--tag <tag>] [--no-fixtures]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { cloneEsr, readRevision, REPO_ROOT, resolveEsrDir, updateEsr } from './lib/esrClone.ts';
import { formatChange, formatSummary, parsePorcelain, shortCommit, type ManifestSnapshot } from './lib/updateSummary.ts';

const MANIFEST = join(REPO_ROOT, 'public', 'game-data', 'manifest.json');

function header(title: string): void {
  console.log(`\n=== ${title} ===\n`);
}

function readManifest(): ManifestSnapshot | null {
  if (!existsSync(MANIFEST)) return null;
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8')) as ManifestSnapshot;
  } catch {
    return null;
  }
}

/** Runs a command from the repo root with inherited stdio; returns true on exit code 0. */
function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): boolean {
  console.log(`$ ${command === process.execPath ? 'node' : command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: REPO_ROOT, stdio: 'inherit', env });
  if (result.error) console.error(result.error.message);
  return result.status === 0;
}

function main(): void {
  const { values } = parseArgs({
    options: {
      esr: { type: 'string' },
      tag: { type: 'string' },
      fixtures: { type: 'boolean', default: true },
    },
    allowNegative: true,
  });
  const esrDir = resolveEsrDir(values.esr);
  const steps: { name: string; ok: boolean; note?: string }[] = [];

  header(`1/5 ESR clone (${esrDir})`);
  const oldRevision = existsSync(esrDir) ? readRevision(esrDir) : null;
  try {
    if (oldRevision === null) cloneEsr(esrDir, values.tag);
    else updateEsr(esrDir, values.tag);
  } catch (error) {
    console.error(`\nESR clone update failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  const newRevision = readRevision(esrDir);
  console.log(`\nCommit: ${formatChange(shortCommit(oldRevision?.commit), shortCommit(newRevision.commit))}`);
  console.log(`Tag:    ${formatChange(oldRevision?.tag ?? '(none)', newRevision.tag ?? '(none)')}`);

  header('2/5 Previous manifest');
  const before = readManifest();
  console.log(before ? `ESR ${before.esrVersion}, tag ${before.esrTag ?? '(none)'}, commit ${before.esrCommit.slice(0, 7)}` : '(none)');

  header('3/5 Generate');
  const generated = run(process.execPath, ['scripts/generate-game-data.ts', '--esr', esrDir]);
  steps.push({ name: 'generate', ok: generated });
  const after = readManifest();

  header('4/5 Test fixtures');
  if (!values.fixtures) {
    console.log('Skipped (--no-fixtures).');
    steps.push({ name: 'fixtures', ok: true, note: 'skipped' });
  } else if (run(process.execPath, ['scripts/fetch-test-fixtures.js'])) {
    steps.push({ name: 'fixtures', ok: true });
  } else {
    console.warn('WARNING: fixture download failed; continuing (tests that need missing fixtures skip themselves).');
    steps.push({ name: 'fixtures', ok: true, note: 'download failed, warning only' });
  }

  header('5/5 Verify');
  if (generated) {
    // The clone-dependent tests resolve the clone from ESR_SOURCE_DIR (an absolute path wins over the repo root).
    const tests = run('npx', ['vitest', 'run', 'src/features/game-data'], { ...process.env, ESR_SOURCE_DIR: esrDir });
    steps.push({ name: 'tests (src/features/game-data)', ok: tests });
    steps.push({ name: 'check', ok: run(process.execPath, ['scripts/generate-game-data.ts', '--check', '--esr', esrDir]) });
  } else {
    console.log('Skipped: generation failed.');
  }

  header('Guide');
  if (!existsSync(join(REPO_ROOT, 'content', 'guide', 'spine.yml'))) {
    console.log('Skipped: no content/guide/spine.yml.');
    steps.push({ name: 'guide', ok: true, note: 'skipped, no content' });
  } else if (generated) {
    // The guide's data blocks (secret recipes, vendors, sources) come from the clone and the fresh game data.
    const guide = run(process.execPath, ['scripts/generate-guide.ts', '--esr', esrDir]);
    steps.push({ name: 'guide:generate', ok: guide });
    // --check regenerates in memory and verifies the files just written match it (catches non-deterministic output).
    steps.push({ name: 'guide:check', ok: guide && run(process.execPath, ['scripts/generate-guide.ts', '--check', '--esr', esrDir]) });
    if (guide) {
      // Which verified notes the new data or patch notes flagged for review (informational, never fails the update).
      header('Guide freshness');
      if (!run(process.execPath, ['scripts/generate-guide.ts', 'report', '--esr', esrDir])) console.warn('WARNING: guide:report failed.');
    }
  } else {
    console.log('Skipped: generation failed.');
  }

  const porcelain = execFileSync('git', ['status', '--porcelain', '--', 'public/game-data', 'public/guide'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  header('Summary');
  for (const line of formatSummary({ before, after, steps, changedFiles: parsePorcelain(porcelain) })) console.log(line);

  const failed = !generated || steps.some((step) => !step.ok);
  if (failed) {
    console.error('\nUpdate FAILED; see the steps above.');
    process.exit(1);
  }
  const version = after?.esrVersion ?? 'X.Y.Z';
  console.log(
    `\nNext: review the diff, then commit:\n  git add public/game-data public/guide && git commit -m 'chore(game-data): update to ESR ${version}'`
  );
}

main();
