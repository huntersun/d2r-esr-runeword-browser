#!/usr/bin/env node
/**
 * Builds the static guide bundle under public/guide/ from content/guide/, the ESR clone and public/game-data/.
 *
 *   node scripts/generate-guide.ts [--esr <dir>] [--content <dir>] [--sources <file>] [--check] [--watch]
 *
 * --check regenerates in memory and exits 1 when the committed files are stale.
 * --watch regenerates whenever content/guide changes (run next to `npm run dev`; the page reloads on its own).
 * All build errors are printed at once, then the script exits 1 (in --watch mode it keeps watching).
 */
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { GuideManifest } from '../src/features/guide/engine/schema.ts';
import { generateGuide } from '../src/features/guide/build/generateGuide.ts';
import type { GameDataInputs } from '../src/features/guide/build/context.ts';
import {
  readEsrForGuide,
  type EsrForGuide,
  readGameDataInputs,
  readGameDataManifest,
  readGuideContent,
} from '../src/features/guide/build/readGuideInputs.ts';
import { buildGuideManifest, serializeBundle } from '../src/features/guide/build/writeGuide.ts';
import { git, REPO_ROOT, resolveEsrDir } from './lib/esrClone.ts';

const OUTPUT_DIR = join(REPO_ROOT, 'public', 'guide');
const GAME_DATA_DIR = join(REPO_ROOT, 'public', 'game-data');
const WATCH_DEBOUNCE_MS = 150;

function readPreviousManifest(): GuideManifest | null {
  const path = join(OUTPUT_DIR, 'manifest.json');
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

/** One generation run; returns false on build errors or a stale --check. */
function run(options: Options): boolean {
  const { gameData, esr, revision } = loadInputs(options);

  const generated = generateGuide({
    content: readGuideContent(options.contentDir),
    gameData,
    esr: esr?.tables ?? null,
    docs: esr?.docs ?? null,
  });

  console.log('\nCounts:');
  for (const [key, value] of Object.entries(generated.counts)) console.log(`  ${key}: ${String(value)}`);
  console.log(`\nWarnings (${String(generated.warnings.length)}):`);
  for (const warning of generated.warnings) console.log(`  - ${warning}`);
  if (generated.errors.length > 0) {
    console.error(`\nErrors (${String(generated.errors.length)}):`);
    for (const error of generated.errors) console.error(`  - ${error}`);
    console.error('\nGuide not written.');
    return false;
  }

  const guide = serializeBundle(generated.bundle);
  const manifest = buildGuideManifest({
    ...revision,
    files: { guide },
    counts: generated.counts,
    warnings: generated.warnings,
    previous: readPreviousManifest(),
    now: new Date(),
  });
  const outputs: Record<string, string> = { guide, manifest: serializeBundle(manifest) };

  if (options.check) {
    const stale = Object.entries(outputs).filter(([name, text]) => {
      const path = join(OUTPUT_DIR, `${name}.json`);
      return !existsSync(path) || readFileSync(path, 'utf8') !== text;
    });
    if (stale.length > 0) {
      console.error(`\nStale guide: ${stale.map(([name]) => `${name}.json`).join(', ')}. Run npm run guide:generate.`);
      return false;
    }
    console.log('\nGuide is up to date.');
    return true;
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('\nWritten:');
  for (const [name, text] of Object.entries(outputs)) {
    const path = join(OUTPUT_DIR, `${name}.json`);
    if (existsSync(path) && readFileSync(path, 'utf8') === text) {
      console.log(`  public/guide/${name}.json (unchanged)`);
      continue;
    }
    writeFileSync(path, text, 'utf8');
    console.log(`  public/guide/${name}.json (${(Buffer.byteLength(text, 'utf8') / 1024).toFixed(1)} KB)`);
  }
  return true;
}

function safeRun(options: Options): boolean {
  try {
    return run(options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

function main(): void {
  const { values } = parseArgs({
    options: {
      esr: { type: 'string' },
      content: { type: 'string' },
      sources: { type: 'string' },
      check: { type: 'boolean', default: false },
      watch: { type: 'boolean', default: false },
    },
  });
  const options: Options = {
    esrDir: resolveEsrDir(values.esr),
    contentDir: resolve(REPO_ROOT, values.content ?? 'content/guide'),
    sourcesFile: resolve(REPO_ROOT, values.sources ?? 'public/game-data/sources.json'),
    check: values.check,
  };

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
