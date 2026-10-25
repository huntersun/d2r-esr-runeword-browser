#!/usr/bin/env node
/**
 * Crops the skill icons of public/game-data/skilldetails.json (`icon` keys) from the ESR clone's HD skill icon sheets
 * into public/game-data/icons/skills/<key>.webp (see src/features/game-data/build/skillIcons.ts for the sheet layout).
 *
 *   node scripts/generate-skill-icons.ts [--esr <dir>] [--check]
 *
 * Source: --esr <dir> | ESR_SOURCE_DIR | ../Eastern_Sun_Resurrected (relative to the repo root). No vanilla art is
 * needed. Run generate-game-data.ts first: the keys come from the committed skilldetails.json, which also carries the
 * index (the key names the file) and the manifest count (`skillIcons`).
 * --check regenerates in memory and exits 1 when an image differs, is missing or is an orphan.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import type { SkillDetailsBundle } from '../src/features/game-data/engine/schema.ts';
import { fitInside, listFilesRecursive } from '../src/features/game-data/build/itemIcons.ts';
import { cropCel, ESR_HD_SKILL_SPRITES_DIR, parseSkillIconKey, skillSheets } from '../src/features/game-data/build/skillIcons.ts';
import { decodeSprite, type DecodedSprite } from '../src/features/loot-filter/engine/sprite.ts';
import { REPO_ROOT, resolveEsrDir } from './lib/esrClone.ts';

const OUTPUT_DIR = join(REPO_ROOT, 'public', 'game-data');
const ICONS_DIR = join(OUTPUT_DIR, 'icons', 'skills');
const EXTENSION = 'webp';
/** Shown at up to 48 CSS px; 64 keeps them sharp on 1.5× screens and the set small */
const ICON_SIDE = 64;
const WEBP_QUALITY = 80;
/** The sheets are horizontal strips (ESR's widest, submenu/skillicon.sprite, is 16236 px) */
const MAX_SHEET_SIDE = 32768;

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { esr: { type: 'string' }, check: { type: 'boolean', default: false } } });
  const esrDir = resolveEsrDir(values.esr);
  const spritesDir = join(esrDir, ESR_HD_SKILL_SPRITES_DIR);
  if (!existsSync(spritesDir)) {
    console.error(`HD skill icon sheets not found in the ESR clone: ${spritesDir}`);
    console.error('Run npm run game-data:update (clones it with the HD paths), or pass --esr <dir>.');
    process.exit(1);
  }
  const detailsPath = join(OUTPUT_DIR, 'skilldetails.json');
  if (!existsSync(detailsPath)) {
    console.error('public/game-data/skilldetails.json is missing; run npm run game-data:generate first.');
    process.exit(1);
  }
  const { skills } = JSON.parse(readFileSync(detailsPath, 'utf8')) as SkillDetailsBundle;
  const keys = [...new Set(skills.flatMap((skill) => (skill.icon === undefined ? [] : [skill.icon])))].sort();
  const sheets = skillSheets(listFilesRecursive(spritesDir));
  console.log(`ESR source: ${esrDir}`);
  console.log(`  sheets: ${[...sheets].map(([prefix, file]) => `${prefix} = ${file}`).join(', ')}`);

  const decoded = new Map<string, DecodedSprite>();
  const files = new Map<string, Buffer>();
  const failures: string[] = [];
  for (const key of keys) {
    const parsed = parseSkillIconKey(key);
    const sheetFile = parsed === null ? undefined : sheets.get(parsed.prefix);
    if (parsed === null || sheetFile === undefined) {
      failures.push(`${key}: no sheet`);
      continue;
    }
    let sheet = decoded.get(sheetFile);
    if (sheet === undefined) {
      sheet = decodeSprite(new Uint8Array(readFileSync(join(spritesDir, sheetFile))), MAX_SHEET_SIDE);
      decoded.set(sheetFile, sheet);
    }
    const cel = cropCel(sheet, parsed.cel);
    if (cel === null) {
      failures.push(`${key}: cel ${String(parsed.cel)} outside ${sheetFile} (${String(sheet.frames)} cels)`);
      continue;
    }
    const size = fitInside(cel.width, cel.height, ICON_SIDE);
    const bytes = await sharp(cel.rgba, { raw: { width: cel.width, height: cel.height, channels: 4 } })
      .resize(size.width, size.height, { fit: 'fill', kernel: 'lanczos3' })
      .webp({ quality: WEBP_QUALITY, alphaQuality: 100, effort: 4, smartSubsample: true })
      .toBuffer();
    files.set(`${key}.${EXTENSION}`, bytes);
  }

  const totalBytes = [...files.values()].reduce((sum, bytes) => sum + bytes.byteLength, 0);
  console.log('\nCounts:');
  console.log(`  icon keys in skilldetails.json: ${String(keys.length)} (${String(skills.length)} skills)`);
  console.log(`  icons: ${String(files.size)}, ${(totalBytes / 1024).toFixed(1)} KB`);
  console.log(`  failures: ${String(failures.length)}`);
  for (const failure of failures) console.log(`    - ${failure}`);

  const existing = existsSync(ICONS_DIR) ? readdirSync(ICONS_DIR).filter((name) => name.endsWith(`.${EXTENSION}`)) : [];
  if (values.check) {
    const stale = [...files]
      .filter(([name, bytes]) => {
        const path = join(ICONS_DIR, name);
        return !existsSync(path) || !readFileSync(path).equals(bytes);
      })
      .map(([name]) => `icons/skills/${name}`);
    for (const name of existing) if (!files.has(name)) stale.push(`icons/skills/${name} (orphan)`);
    if (stale.length > 0 || failures.length > 0) {
      const shown = stale.slice(0, 10).join(', ') + (stale.length > 10 ? `, … (${String(stale.length)} in all)` : '');
      console.error(`\nStale skill icons: ${shown || '(none)'}; failures: ${String(failures.length)}. Run npm run game-data:icons.`);
      process.exit(1);
    }
    console.log('\nSkill icons are up to date.');
    return;
  }
  if (failures.length > 0) {
    console.error('\nSome icon keys could not be cropped; fix the sheet mapping before writing.');
    process.exit(1);
  }
  mkdirSync(ICONS_DIR, { recursive: true });
  for (const name of existing) if (!files.has(name)) rmSync(join(ICONS_DIR, name));
  for (const [name, bytes] of files) writeFileSync(join(ICONS_DIR, name), bytes);
  console.log(`\nWritten: public/game-data/icons/skills/ (${String(files.size)} files)`);
}

await main();
