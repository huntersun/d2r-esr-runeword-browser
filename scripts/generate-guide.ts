#!/usr/bin/env node
/**
 * Builds the static guide bundle under public/guide/ from content/guide/, the ESR clone and public/game-data/.
 *
 *   node scripts/generate-guide.ts [--esr <dir>] [--content <dir>] [--sources <file>] [--out <dir>] [--check] [--watch]
 *   node scripts/generate-guide.ts verify <slug> [<slug>…]   (npm run guide:verify -- <slug> …)
 *   node scripts/generate-guide.ts report                     (npm run guide:report)
 *
 * --check regenerates in memory and exits 1 when the committed files are stale.
 * --watch regenerates whenever content/guide changes (run next to `npm run dev`; the page reloads on its own).
 * --out writes (or checks) somewhere other than public/guide (scratch runs).
 * verify sets `verified:` in each note's frontmatter to the game-data manifest's esrVersion and records the note's
 * data-block hashes in content/guide/.verify-lock.json. It does not regenerate public/guide (run guide:generate).
 * report prints notes by freshness state with their staleReasons, volatility: high notes and drafts; writes nothing.
 * All build errors are printed at once, then the script exits 1 (in --watch mode it keeps watching).
 */
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { GuideManifest } from '../src/features/guide/engine/schema.ts';
import { generateGuide, type GeneratedGuide } from '../src/features/guide/build/generateGuide.ts';
import type { GameDataInputs } from '../src/features/guide/build/context.ts';
import {
  readEsrForGuide,
  type EsrForGuide,
  readGameDataInputs,
  readGameDataManifest,
  readGuideContent,
} from '../src/features/guide/build/readGuideInputs.ts';
import {
  formatGuideReport,
  LOCK_FILE,
  parseVerifyLock,
  serializeVerifyLock,
  setVerifiedInFrontmatter,
} from '../src/features/guide/build/staleness.ts';
import { buildGuideManifest, serializeBundle } from '../src/features/guide/build/writeGuide.ts';
import { git, REPO_ROOT, resolveEsrDir } from './lib/esrClone.ts';

const GAME_DATA_DIR = join(REPO_ROOT, 'public', 'game-data');
const WATCH_DEBOUNCE_MS = 150;

/** Repo-relative when inside the repo (the usual case), absolute otherwise (scratch --content/--out). */
function displayPath(path: string): string {
  const rel = relative(REPO_ROOT, path);
  return rel.startsWith('..') ? path : rel;
}

function readPreviousManifest(outputDir: string): GuideManifest | null {
  const path = join(outputDir, 'manifest.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as GuideManifest;
  } catch {
    return null;
  }
}

interface Options {
  esrDir: string;
  contentDir: string;
  sourcesFile: string;
  outputDir: string;
  check: boolean;
}

interface Inputs {
  gameData: GameDataInputs;
  esr: EsrForGuide | null;
  revision: { esrVersion: string; esrTag: string | null; esrCommit: string };
}

/** Game data and ESR tables do not change while watching the content; read them once. */
let cachedInputs: Inputs | null = null;

function loadInputs(options: Options): Inputs {
  if (cachedInputs !== null) return cachedInputs;
  const gameData = readGameDataInputs(GAME_DATA_DIR, options.sourcesFile);
  const esr = readEsrForGuide(options.esrDir);
  let revision: Inputs['revision'];
  if (esr === null) {
    console.warn(`ESR clone not found: ${options.esrDir} (pass --esr <dir>); using the game-data manifest's version`);
    const gameDataManifest = readGameDataManifest(GAME_DATA_DIR);
    revision = { esrVersion: gameDataManifest.esrVersion, esrTag: gameDataManifest.esrTag, esrCommit: gameDataManifest.esrCommit };
  } else {
    revision = {
      esrVersion: esr.esrVersion,
      esrTag: git(options.esrDir, ['describe', '--tags', '--exact-match']),
      esrCommit: git(options.esrDir, ['rev-parse', 'HEAD']) ?? 'unknown',
    };
    console.log(`ESR source: ${options.esrDir} (version ${esr.esrVersion}, commit ${revision.esrCommit.slice(0, 7)})`);
  }
  cachedInputs = { gameData, esr, revision };
  return cachedInputs;
}

function generate(options: Options): { generated: GeneratedGuide; revision: Inputs['revision'] } {
  const { gameData, esr, revision } = loadInputs(options);
  const generated = generateGuide({
    content: readGuideContent(options.contentDir),
    gameData,
    esr: esr?.tables ?? null,
    docs: esr?.docs ?? null,
    patchNotes: esr?.patchNotes ?? [],
  });
  return { generated, revision };
}

function printErrors(errors: readonly string[]): void {
  console.error(`\nErrors (${String(errors.length)}):`);
  for (const error of errors) console.error(`  - ${error}`);
}

/** One generation run; returns false on build errors or a stale --check. */
function run(options: Options): boolean {
  const { generated, revision } = generate(options);

  console.log('\nCounts:');
  for (const [key, value] of Object.entries(generated.counts)) console.log(`  ${key}: ${String(value)}`);
  console.log(`\nWarnings (${String(generated.warnings.length)}):`);
  for (const warning of generated.warnings) console.log(`  - ${warning}`);
  if (generated.errors.length > 0) {
    printErrors(generated.errors);
    console.error('\nGuide not written.');
    return false;
  }

  const guide = serializeBundle(generated.bundle);
  const manifest = buildGuideManifest({
    ...revision,
    files: { guide },
    counts: generated.counts,
    warnings: generated.warnings,
    previous: readPreviousManifest(options.outputDir),
    now: new Date(),
  });
  const outputs: Record<string, string> = { guide, manifest: serializeBundle(manifest) };

  if (options.check) {
    const stale = Object.entries(outputs).filter(([name, text]) => {
      const path = join(options.outputDir, `${name}.json`);
      return !existsSync(path) || readFileSync(path, 'utf8') !== text;
    });
    if (stale.length > 0) {
      console.error(`\nStale guide: ${stale.map(([name]) => `${name}.json`).join(', ')}. Run npm run guide:generate.`);
      return false;
    }
    console.log('\nGuide is up to date.');
    return true;
  }

  mkdirSync(options.outputDir, { recursive: true });
  console.log('\nWritten:');
  for (const [name, text] of Object.entries(outputs)) {
    const path = join(options.outputDir, `${name}.json`);
    const shown = displayPath(path);
    if (existsSync(path) && readFileSync(path, 'utf8') === text) {
      console.log(`  ${shown} (unchanged)`);
      continue;
    }
    writeFileSync(path, text, 'utf8');
    console.log(`  ${shown} (${(Buffer.byteLength(text, 'utf8') / 1024).toFixed(1)} KB)`);
  }
  return true;
}

/** guide:report: build in memory and print the freshness report; false on build errors. */
function report(options: Options): boolean {
  const { generated, revision } = generate(options);
  if (generated.errors.length > 0) {
    printErrors(generated.errors);
    return false;
  }
  console.log('');
  for (const line of formatGuideReport(generated.bundle.notes, revision.esrVersion)) console.log(line);
  return true;
}

/** guide:verify: stamp the notes with the game-data version and record their block hashes in the lock file. */
function verify(options: Options, slugs: readonly string[]): boolean {
  if (slugs.length === 0) {
    console.error('Usage: npm run guide:verify -- <slug> [<slug>…]');
    return false;
  }
  const version = readGameDataManifest(GAME_DATA_DIR).esrVersion;
  const { generated } = generate(options);
  if (generated.errors.length > 0) {
    printErrors(generated.errors);
    console.error('\nNothing verified: fix the build errors first.');
    return false;
  }
  const lockPath = join(options.contentDir, LOCK_FILE);
  const lockErrors: string[] = [];
  const lock = parseVerifyLock(existsSync(lockPath) ? readFileSync(lockPath, 'utf8') : null, LOCK_FILE, lockErrors);
  if (lockErrors.length > 0) {
    printErrors(lockErrors);
    return false;
  }

  const edits: { path: string; text: string }[] = [];
  const problems: string[] = [];
  for (const slug of slugs) {
    const blocks = generated.blockHashes.get(slug);
    const path = join(options.contentDir, 'notes', `${slug}.md`);
    if (blocks === undefined || !existsSync(path)) {
      problems.push(`unknown note "${slug}" (no notes/${slug}.md)`);
      continue;
    }
    const text = setVerifiedInFrontmatter(readFileSync(path, 'utf8'), version);
    if (typeof text !== 'string') {
      problems.push(`notes/${slug}.md: ${text.error}`);
      continue;
    }
    edits.push({ path, text });
    lock[slug] = { verified: version, blocks };
  }
  if (problems.length > 0) {
    printErrors(problems);
    console.error('\nNothing verified.');
    return false;
  }
  for (const { path, text } of edits) {
    writeFileSync(path, text, 'utf8');
    console.log(`  ${displayPath(path)}: verified ${version}`);
  }
  writeFileSync(lockPath, serializeVerifyLock(lock), 'utf8');
  console.log(`  ${displayPath(lockPath)}: ${String(edits.length)} entr${edits.length === 1 ? 'y' : 'ies'} recorded`);
  console.log('\nNext: npm run guide:generate');
  return true;
}

function safeRun(options: Options, action: (options: Options) => boolean = run): boolean {
  try {
    return action(options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      esr: { type: 'string' },
      content: { type: 'string' },
      sources: { type: 'string' },
      out: { type: 'string' },
      check: { type: 'boolean', default: false },
      watch: { type: 'boolean', default: false },
    },
  });
  const options: Options = {
    esrDir: resolveEsrDir(values.esr),
    contentDir: resolve(REPO_ROOT, values.content ?? 'content/guide'),
    sourcesFile: resolve(REPO_ROOT, values.sources ?? 'public/game-data/sources.json'),
    outputDir: resolve(REPO_ROOT, values.out ?? 'public/guide'),
    check: values.check,
  };

  const [command = 'generate', ...args] = positionals;
  if (command === 'verify' || command === 'report') {
    const ok = command === 'verify' ? safeRun(options, (opts) => verify(opts, args)) : safeRun(options, report);
    if (!ok) process.exit(1);
    return;
  }
  if (command !== 'generate' || args.length > 0) {
    console.error(`Unknown command: ${positionals.join(' ')} (expected generate, verify <slug…> or report)`);
    process.exit(1);
  }

  if (!values.watch) {
    if (!safeRun(options)) process.exit(1);
    return;
  }

  safeRun(options);
  console.log(`\nWatching ${options.contentDir} (Ctrl+C to stop)`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(options.contentDir, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`\n--- ${new Date().toLocaleTimeString()} regenerating ---`);
      safeRun(options);
    }, WATCH_DEBOUNCE_MS);
  });
}

main();
