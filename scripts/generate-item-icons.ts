#!/usr/bin/env node
/**
 * Extracts item icons from the HD item sprites the ESR clone ships into public/game-data/icons/*.webp and
 * public/game-data/icons.json (file and size by base code, unique name and set item name). Scope: the codes of the
 * committed bases.json, every uniqueitems.txt and setitems.txt row with a base (own art from hd/items/uniques.json /
 * sets.json, else the base's art).
 *
 *   node scripts/generate-item-icons.ts [--esr <dir>] [--check]
 *
 * Source: --esr <dir> | ESR_SOURCE_DIR | ../Eastern_Sun_Resurrected (relative to the repo root).
 * --check regenerates in memory and exits 1 when icons.json or any image differs from the committed files.
 * Run generate-game-data.ts afterwards: it lists icons.json (hash) in the manifest (`npm run game-data:icons` does both).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import type { BasesBundle } from '../src/features/game-data/engine/schema.ts';
import { ESR_EXCEL_DIR, readModVersion, readStringFiles } from '../src/features/game-data/build/esrSources.ts';
import { readUniqueOrSetRows } from '../src/features/game-data/build/itemNames.ts';
import { buildStringTable } from '../src/features/game-data/build/strings.ts';
import { parseTsv } from '../src/features/game-data/build/tsv.ts';
import {
  buildIconsBundle,
  buildSpriteIndex,
  cropRgba,
  ESR_HD_ITEM_SPRITES_DIR,
  ESR_HD_ITEMS_FILE,
  ESR_HD_SETS_FILE,
  ESR_HD_UNIQUES_FILE,
  fitInside,
  type NamedIconStats,
  listFilesRecursive,
  opaqueBounds,
  parseItemAssets,
  parseNamedArt,
  planItemIcons,
} from '../src/features/game-data/build/itemIcons.ts';
import { serializeBundle } from '../src/features/game-data/build/writeBundle.ts';
import { decodeSprite } from '../src/features/loot-filter/engine/sprite.ts';
import { git, REPO_ROOT, resolveEsrDir } from './lib/esrClone.ts';

const OUTPUT_DIR = join(REPO_ROOT, 'public', 'game-data');
const ICONS_DIR = join(OUTPUT_DIR, 'icons');
const EXTENSION = 'webp';
const WEBP_QUALITY = 80;

interface EncodedIcon {
  width: number;
  height: number;
  bytes: Buffer;
}

async function encodeIcon(spritePath: string): Promise<EncodedIcon> {
  const sprite = decodeSprite(new Uint8Array(readFileSync(spritePath)));
  const box = opaqueBounds(sprite.width, sprite.height, sprite.rgba);
  if (box === null) throw new Error('fully transparent');
  const cropped = cropRgba(sprite.width, sprite.rgba, box);
  const size = fitInside(box.width, box.height);
  const bytes = await sharp(cropped, { raw: { width: box.width, height: box.height, channels: 4 } })
    .resize(size.width, size.height, { fit: 'fill', kernel: 'lanczos3' })
    .webp({ quality: WEBP_QUALITY, alphaQuality: 100, effort: 4, smartSubsample: true })
    .toBuffer();
  return { ...size, bytes };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      esr: { type: 'string' },
      check: { type: 'boolean', default: false },
    },
  });

  const esrDir = resolveEsrDir(values.esr);
  const spritesDir = join(esrDir, ESR_HD_ITEM_SPRITES_DIR);
  const itemsFile = join(esrDir, ESR_HD_ITEMS_FILE);
  const uniquesFile = join(esrDir, ESR_HD_UNIQUES_FILE);
  const setsFile = join(esrDir, ESR_HD_SETS_FILE);
  if (!existsSync(spritesDir) || !existsSync(itemsFile) || !existsSync(uniquesFile) || !existsSync(setsFile)) {
    console.error(`HD item art not found in the ESR clone: ${esrDir}`);
    console.error('Run npm run game-data:update (clones it with the HD paths), or pass --esr <dir>.');
    process.exit(1);
  }

  const esrTag = git(esrDir, ['describe', '--tags', '--exact-match']);
  const esrVersion = readModVersion(esrDir);
  console.log(`ESR source: ${esrDir}`);
  console.log(`  version ${esrVersion}, tag ${esrTag ?? '(none)'}`);

  const { bases } = JSON.parse(readFileSync(join(OUTPUT_DIR, 'bases.json'), 'utf8')) as BasesBundle;
  const codes = bases.map((base) => base.code);
  const { assets, duplicates } = parseItemAssets(JSON.parse(readFileSync(itemsFile, 'utf8')));
  const uniqueArt = parseNamedArt(JSON.parse(readFileSync(uniquesFile, 'utf8')), 'uniques.json');
  const setArt = parseNamedArt(JSON.parse(readFileSync(setsFile, 'utf8')), 'sets.json');
  // Names resolve exactly as lootfilter.json / sets.json do (same string table, same reader)
  const { strings } = buildStringTable(readStringFiles(esrDir));
  const table = (name: string) => parseTsv(readFileSync(join(esrDir, ESR_EXCEL_DIR, `${name}.txt`), 'utf8'), `${name}.txt`);
  const uniques = readUniqueOrSetRows(table('uniqueitems'), 'code', strings);
  const sets = readUniqueOrSetRows(table('setitems'), 'item', strings);
  const index = buildSpriteIndex(listFilesRecursive(spritesDir));
  const plan = planItemIcons({ codes, uniques, sets, assets, uniqueArt: uniqueArt.art, setArt: setArt.art, index });

  const images = new Map<string, EncodedIcon>();
  const failures: string[] = [];
  for (const [slug, sprite] of plan.sprites) {
    try {
      images.set(slug, await encodeIcon(join(spritesDir, sprite)));
    } catch (error) {
      failures.push(`${sprite}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const bundle = buildIconsBundle({ esrVersion, esrTag, plan, images, extension: EXTENSION });
  const bundleText = serializeBundle(bundle);
  const files = new Map([...images].map(([slug, image]) => [`${slug}.${EXTENSION}`, image.bytes]));
  const totalBytes = [...files.values()].reduce((sum, bytes) => sum + bytes.byteLength, 0);
  const failedEntries = [plan.bases, plan.uniques, plan.sets].reduce(
    (sum, map) => sum + [...map.values()].filter((slug) => !images.has(slug)).length,
    0
  );

  console.log('\nCounts:');
  console.log(`  codes requested (bases.json): ${String(new Set(codes).size)}`);
  console.log(`  items.json entries: ${String(assets.size)} (${String(duplicates.length)} repeated codes ignored)`);
  console.log(`  sprites in the clone: ${String(index.size)}`);
  console.log(`  codes with an icon: ${String(Object.keys(bundle.bases).length)}`);
  console.log(`  icons written (distinct assets): ${String(files.size)}, ${(totalBytes / 1024).toFixed(1)} KB`);
  console.log(`  codes without an items.json entry: ${String(plan.missingEntry.length)}${listCodes(plan.missingEntry)}`);
  console.log(`  codes whose art is not in the clone (vanilla): ${String(plan.missingArt.length)}`);
  printNamed('uniques (uniqueitems.txt rows with a base, by name)', uniques.length, plan.uniqueStats, uniqueArt.duplicates);
  printNamed('set items (setitems.txt rows, by name)', sets.length, plan.setStats, setArt.duplicates);
  console.log(`  decode failures: ${String(failures.length)} sprites, ${String(failedEntries)} entries`);
  for (const failure of failures) console.log(`    - ${failure}`);

  if (values.check) {
    const stale: string[] = [];
    const iconsJson = join(OUTPUT_DIR, 'icons.json');
    if (!existsSync(iconsJson) || readFileSync(iconsJson, 'utf8') !== bundleText) stale.push('icons.json');
    for (const [name, bytes] of files) {
      const path = join(ICONS_DIR, name);
      if (!existsSync(path) || !readFileSync(path).equals(bytes)) stale.push(`icons/${name}`);
    }
    for (const name of listIconFiles()) if (!files.has(name)) stale.push(`icons/${name} (orphan)`);
    if (stale.length > 0) {
      const shown = stale.slice(0, 10).join(', ') + (stale.length > 10 ? `, … (${String(stale.length)} in all)` : '');
      console.error(`\nStale item icons: ${shown}. Run npm run game-data:icons.`);
      process.exit(1);
    }
    console.log('\nItem icons are up to date.');
    return;
  }

  mkdirSync(ICONS_DIR, { recursive: true });
  for (const name of listIconFiles()) if (!files.has(name)) rmSync(join(ICONS_DIR, name));
  for (const [name, bytes] of files) writeFileSync(join(ICONS_DIR, name), bytes);
  writeFileSync(join(OUTPUT_DIR, 'icons.json'), bundleText, 'utf8');
  console.log(`\nWritten: public/game-data/icons.json (${(Buffer.byteLength(bundleText, 'utf8') / 1024).toFixed(1)} KB)`);
  console.log(`         public/game-data/icons/ (${String(files.size)} files)`);
  console.log('Run node scripts/generate-game-data.ts to list icons.json in the manifest.');
}

function listIconFiles(): string[] {
  if (!existsSync(ICONS_DIR)) return [];
  return readdirSync(ICONS_DIR).filter((name) => name.endsWith(`.${EXTENSION}`));
}

function printNamed(label: string, rows: number, stats: NamedIconStats, duplicates: readonly string[]): void {
  console.log(`  ${label}: ${String(stats.requested)} names from ${String(rows)} rows`);
  console.log(`    own art: ${String(stats.own)}, base art only: ${String(stats.base)}, no art: ${String(stats.none)}`);
  console.log(`    own art entry pointing at art the clone lacks: ${String(stats.ownArtMissing)}`);
  console.log(`    art keys no row matched: ${String(stats.unusedKeys.length)}${listCodes(stats.unusedKeys)}`);
  if (duplicates.length > 0) console.log(`    repeated art keys (first wins): ${duplicates.join(', ')}`);
}

function listCodes(codes: readonly string[]): string {
  return codes.length === 0 ? '' : ` (${codes.slice(0, 20).join(', ')}${codes.length > 20 ? ', …' : ''})`;
}

await main();
