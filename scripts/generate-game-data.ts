#!/usr/bin/env node
/**
 * Converts the ESR txt game tables into the static JSON bundles under public/game-data/.
 *
 *   node scripts/generate-game-data.ts [--esr <dir>] [--check]
 *
 * Source: --esr <dir> | ESR_SOURCE_DIR | ../Eastern_Sun_Resurrected (relative to the repo root).
 * --check regenerates in memory and exits 1 when the committed files are stale.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { GameDataManifest } from '../src/features/game-data/engine/schema.ts';
import { readEsrSources } from '../src/features/game-data/build/esrSources.ts';
import { generateBundles } from '../src/features/game-data/build/generateBundles.ts';
import { buildManifest, serializeBundle } from '../src/features/game-data/build/writeBundle.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = join(REPO_ROOT, 'public', 'game-data');

function git(esrDir: string, args: string[]): string | null {
  try {
    return execFileSync('git', ['-C', esrDir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function readPreviousManifest(): GameDataManifest | null {
  const path = join(OUTPUT_DIR, 'manifest.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as GameDataManifest;
  } catch {
    return null;
  }
}

function main(): void {
  const { values } = parseArgs({
    options: {
      esr: { type: 'string' },
      check: { type: 'boolean', default: false },
    },
  });

  const esrDir = resolve(REPO_ROOT, values.esr ?? process.env.ESR_SOURCE_DIR ?? '../Eastern_Sun_Resurrected');
  if (!existsSync(esrDir)) {
    console.error(`ESR clone not found: ${esrDir}`);
    console.error('Clone CelestialRayOne/Eastern_Sun_Resurrected next to this repo or pass --esr <dir>.');
    process.exit(1);
  }

  const esrCommit = git(esrDir, ['rev-parse', 'HEAD']);
  if (esrCommit === null) {
    console.error(`Not a git checkout: ${esrDir}`);
    process.exit(1);
  }
  const esrTag = git(esrDir, ['describe', '--tags', '--exact-match']);
  const dirty = git(esrDir, ['status', '--porcelain']);

  console.log(`ESR source: ${esrDir}`);
  const sources = readEsrSources(esrDir);
  console.log(`  version ${sources.esrVersion}, tag ${esrTag ?? '(none)'}, commit ${esrCommit.slice(0, 7)}`);
  if (dirty !== null && dirty !== '') console.warn('  WARNING: the ESR clone has uncommitted changes; output will not match the commit');

  const generated = generateBundles(sources);
  const files = {
    types: serializeBundle(generated.types),
    bases: serializeBundle(generated.bases),
    runewords: serializeBundle(generated.runewords),
    affixes: serializeBundle(generated.affixes),
  };
  const manifest = buildManifest({
    esrVersion: sources.esrVersion,
    esrTag,
    esrCommit,
    files,
    counts: generated.counts,
    warnings: generated.warnings,
    previous: readPreviousManifest(),
    now: new Date(),
  });
  const outputs: Record<string, string> = { ...files, manifest: serializeBundle(manifest) };

  console.log('\nCounts:');
  for (const [key, value] of Object.entries(generated.counts)) console.log(`  ${key}: ${String(value)}`);
  console.log(`\nString conflicts (${String(generated.stringWarnings.length)}, not stored in the manifest):`);
  for (const warning of generated.stringWarnings) console.log(`  - ${warning}`);
  console.log(`\nWarnings (${String(generated.warnings.length)}):`);
  for (const warning of generated.warnings) console.log(`  - ${warning}`);

  if (values.check) {
    const stale = Object.entries(outputs).filter(([name, text]) => {
      const path = join(OUTPUT_DIR, `${name}.json`);
      return !existsSync(path) || readFileSync(path, 'utf8') !== text;
    });
    if (stale.length > 0) {
      console.error(`\nStale game data: ${stale.map(([name]) => `${name}.json`).join(', ')}. Run npm run game-data:generate.`);
      process.exit(1);
    }
    console.log('\nGame data is up to date.');
    return;
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('\nWritten:');
  for (const [name, text] of Object.entries(outputs)) {
    writeFileSync(join(OUTPUT_DIR, `${name}.json`), text, 'utf8');
    console.log(`  public/game-data/${name}.json (${(Buffer.byteLength(text, 'utf8') / 1024).toFixed(1)} KB)`);
  }
}

main();
