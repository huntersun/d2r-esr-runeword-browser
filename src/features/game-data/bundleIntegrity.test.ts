import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { readEsrSources } from './build/esrSources.ts';
import { generateBundles } from './build/generateBundles.ts';
import { serializeBundle } from './build/writeBundle.ts';
import {
  GAME_DATA_SCHEMA,
  type AffixesBundle,
  type BaseItem,
  type BasesBundle,
  type GameDataManifest,
  type TxtRunewordsBundle,
  type TypesBundle,
} from './engine/schema.ts';

const OUTPUT_DIR = resolve(__dirname, '../../../public/game-data');
const ESR_DIR = resolve(__dirname, '../../../', process.env.ESR_SOURCE_DIR ?? '../Eastern_Sun_Resurrected');

function readText(name: string): string {
  return readFileSync(resolve(OUTPUT_DIR, `${name}.json`), 'utf-8');
}

const manifest = JSON.parse(readText('manifest')) as GameDataManifest;
const typesText = readText('types');
const basesText = readText('bases');
const runewordsText = readText('runewords');
const affixesText = readText('affixes');
const { types } = JSON.parse(typesText) as TypesBundle;
const { bases } = JSON.parse(basesText) as BasesBundle;
const { runewords } = JSON.parse(runewordsText) as TxtRunewordsBundle;
const { affixes } = JSON.parse(affixesText) as AffixesBundle;

describe('committed game-data bundles', () => {
  it('match the app schema', () => {
    expect(manifest.schema).toBe(GAME_DATA_SCHEMA);
  });

  it('match the manifest hashes and sizes', () => {
    for (const [name, text] of [
      ['types', typesText],
      ['bases', basesText],
      ['runewords', runewordsText],
      ['affixes', affixesText],
    ] as const) {
      expect(manifest.files[name]?.hash).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
      expect(manifest.files[name]?.bytes).toBe(Buffer.byteLength(text, 'utf8'));
    }
  });

  it('contain the player-facing weapons and armors', () => {
    expect(bases.filter((base) => base.kind === 'weapon')).toHaveLength(369);
    expect(bases.filter((base) => base.kind === 'armor')).toHaveLength(255);
    expect(bases.filter((base) => base.kind === 'misc')).toHaveLength(29);
    expect(manifest.counts.bases).toBe(bases.length);
  });

  it('drop exact duplicate bases (cx1-3 copies of cm1-3)', () => {
    expect(manifest.counts.duplicateBases).toBe(3);
    expect(bases.some((base) => ['cx1', 'cx2', 'cx3'].includes(base.code))).toBe(false);
    expect(bases.some((base) => base.code === 'c11')).toBe(true);
  });

  it('name mythical accessories after the name column and keep string conflicts out of the manifest', () => {
    for (const code of ['mam', 'mrn', 'mjw']) expect(bases.find((base) => base.code === code)?.name).toMatch(/^Mythical /);
    expect(manifest.warnings.some((warning) => warning.startsWith('string '))).toBe(false);
    expect(manifest.counts.stringConflicts).toBeGreaterThan(0);
  });

  it('have unique base and type codes', () => {
    expect(new Set(bases.map((base) => base.code)).size).toBe(bases.length);
    expect(new Set(types.map((type) => type.code)).size).toBe(types.length);
  });

  it('only reference existing item types', () => {
    const codes = new Set(types.map((type) => type.code));
    for (const type of types) {
      for (const code of [...type.parents, ...type.ancestors]) expect(codes, `${type.code} → ${code}`).toContain(code);
    }
    for (const base of bases) {
      for (const code of [base.type, base.type2, ...base.ancestors]) {
        if (code !== null) expect(codes, `${base.code} → ${code}`).toContain(code);
      }
    }
  });

  it('only reference family codes that exist among the bases or are reported as warnings', () => {
    const codes = new Set(bases.map((base) => base.code));
    const missing = bases.flatMap((base) => base.family.filter((code) => code !== '' && !codes.has(code)));
    for (const code of missing)
      expect(
        manifest.warnings.some((warning) => warning.includes(`"${code}"`)),
        code
      ).toBe(true);
  });

  it('contain every runes.txt Runeword* key with its rows (391 keys / 449 rows in ESR 3.2.10)', () => {
    expect(runewords).toHaveLength(391);
    expect(runewords.flatMap((runeword) => runeword.rows)).toHaveLength(449);
    expect(manifest.counts.runewords).toBe(runewords.length);
    expect(manifest.counts.runewordRows).toBe(449);
    const codes = new Set(types.map((type) => type.code));
    for (const runeword of runewords) {
      for (const row of runeword.rows) {
        for (const code of [...row.itypes, ...row.etypes]) expect(codes, `${runeword.key} → ${code}`).toContain(code);
        expect(row.sockets).toBe(row.ingredients.length + row.jewels);
      }
    }
  });

  it('contain the spawnable affixes with rendered text and known item types', () => {
    expect(manifest.counts.affixes).toBe(affixes.length);
    expect(affixes.length).toBeGreaterThan(2000);
    expect(new Set(affixes.map((affix) => `${affix.kind}${String(affix.id)}`)).size).toBe(affixes.length);
    const codes = new Set(types.map((type) => type.code));
    for (const affix of affixes) {
      for (const code of [...affix.itypes, ...affix.etypes]) expect(codes, `${affix.kind}${String(affix.id)} → ${code}`).toContain(code);
    }
    expect(affixes.filter((affix) => affix.text.length > 0).length / affixes.length).toBeGreaterThan(0.95);
    expect(affixes.flatMap((affix) => affix.text).some((line) => /%[+di0-9s]|undefined|NaN/.test(line))).toBe(false);
    expect(runewords.flatMap((rw) => rw.rows).filter((row) => row.text.length > 0).length).toBeGreaterThan(400);
  });

  it('resolve the merc/helm name collision and class-only bases', () => {
    expect(types.find((type) => type.code === 'merc')?.name).toBe('Helm (merc)');
    expect(types.find((type) => type.code === 'helm')?.name).toBe('Helm');
    expect(bases.filter((base) => base.cls !== null).length).toBeGreaterThan(0);
    expect(manifest.counts.classes).toBe(8);
  });
});

const CODE = /^[a-z0-9]{2,4}$/;

/**
 * Base names keyed by code from the ESR docs pages. weapons.htm rows start with "Name<br>code",
 * armors.htm rows with a name cell followed by a code cell.
 */
function readHtmBaseNames(file: string): Map<string, string> {
  const doc = new DOMParser().parseFromString(readFileSync(file, 'utf-8'), 'text/html');
  const names = new Map<string, string>();
  for (const row of doc.querySelectorAll('tr')) {
    const cells = row.querySelectorAll('td');
    const first = cells[0];
    if (first === undefined) continue;
    const [name = '', code = ''] = first.innerHTML.includes('<br>')
      ? first.innerHTML.split('<br>').map((part) => part.replace(/<[^>]*>/g, '').trim())
      : [first.textContent.trim(), cells[1]?.textContent.trim() ?? ''];
    if (name !== '' && CODE.test(code) && !names.has(code)) names.set(code, name.replace(/&amp;/g, '&'));
  }
  return names;
}

describe.skipIf(!existsSync(ESR_DIR))('game data generated from the ESR clone', () => {
  const generated = generateBundles(readEsrSources(ESR_DIR));
  const htm = new Map([
    ...readHtmBaseNames(resolve(ESR_DIR, 'docs/weapons.htm')),
    ...readHtmBaseNames(resolve(ESR_DIR, 'docs/armors.htm')),
  ]);
  const gear: BaseItem[] = generated.bases.bases.filter((base) => base.kind !== 'misc');

  it('produces the committed bundles (run npm run game-data:generate if this fails)', () => {
    expect(serializeBundle(generated.types)).toBe(typesText);
    expect(serializeBundle(generated.bases)).toBe(basesText);
    expect(serializeBundle(generated.runewords)).toBe(runewordsText);
    expect(serializeBundle(generated.affixes)).toBe(affixesText);
  });

  it('names spawnable bases like the ESR docs pages (≥ 95 % overlap)', () => {
    const htmNames = new Set(htm.values());
    const missing = gear.filter((base) => !htmNames.has(base.name));
    const differing = gear.filter((base) => htm.has(base.code) && htm.get(base.code) !== base.name);
    console.log(
      `Docs oracle: ${String(gear.length - missing.length)}/${String(gear.length)} base names found, ${String(differing.length)} differ by code`
    );
    if (missing.length > 0) console.log(`Base names not in the docs: ${missing.map((b) => `${b.code}=${b.name}`).join(', ')}`);
    if (differing.length > 0) {
      console.log(`Names differing by code: ${differing.map((b) => `${b.code}: "${b.name}" vs "${htm.get(b.code) ?? ''}"`).join(', ')}`);
    }
    expect((gear.length - missing.length) / gear.length).toBeGreaterThanOrEqual(0.95);
  });
});
