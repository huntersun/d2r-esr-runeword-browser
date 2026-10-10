import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUBE_FAMILIES, collectFamily, familyBlock, familyRows, findCubeFamily, MAX_FAMILY_ROWS, type CubeFamily } from './cubeFamilies.ts';
import { capGroup, clusterVariants, MAX_GROUP_ROWS } from './cubeText.ts';
import { buildEsrGuideTables, readEsrGuideSources, type EsrGuideTables } from './esrGuideSources.ts';
import { LEAF_DIRECTIVES } from './directives/index.ts';
import { markdownToBlocks } from './markdown.ts';
import { ARMOR, DIFFICULTYLEVELS, fixtureContext, STRINGS, tsv, WEAPONS } from './testContext.mock.ts';

const ESR_DIR = resolve(__dirname, '../../../..', process.env.ESR_SOURCE_DIR ?? '../Eastern_Sun_Resurrected');

const HEADER = [
  'description',
  'enabled',
  'class',
  'numinputs',
  'input 1',
  'input 2',
  'input 3',
  'output',
  'output b',
  'output c',
  '*eol',
  'b mod 1',
];

const ITEMTYPES = tsv([
  ['ItemType', 'Code'],
  ['Weapon', 'weap'],
  ['Gem Can 8', 'can8'],
  ['Coupon norm', 'cpn1'],
]);

/** Filler rows for the row cap test (matched by no curated family) */
const FILLER = Array.from({ length: MAX_FAMILY_ROWS + 2 }, (_, i) => [
  `Filler ${String(i)}`,
  '1',
  '',
  '1',
  `"ppp,qty=${String(i + 1)}"`,
  '',
  '',
  `"hly,qty=${String(i + 1)}"`,
  '',
  '',
  '0',
]);

const CUBEMAIN = tsv([
  HEADER,
  ['Dstone Transformation', '1', '', '1', 'ppp', '', '', 'hly', '', '', '0'],
  ['Dstone Transformation', '1', '', '1', 'hly', '', '', 'ppp', '', '', '0'],
  ['Dstone Transformation x2', '1', '', '1', '"ppp,qty=2"', '', '', 'hly', 'hly', '', '0'],
  ['Dstone Transformation', '0', '', '1', 'zzz', '', '', 'ppp', '', '', '0'],
  ['Weapon Skill Forging Ama', '1', '', '3', '"weap,nru"', '"qqq,qty=2"', 'gcg', 'useitem', '', '', '0'],
  ['Ring Skill Forging Ama', '1', '', '3', 'ring', '"qqq,qty=2"', 'gcg', 'useitem', '', '', '0'],
  ['Weapon Skill Forging Sor', '1', '', '3', '"weap,nru"', '"qqq,qty=2"', 'gcb', 'useitem', '', '', '0'],
  ['Remove Weapon Skill Forging Ama', '1', '', '2', '"weap,nru"', '"wms,qty=3"', '', 'useitem', 'qqq', 'qqq', '0'],
  ["Adventurer's Pack", '1', 'ama', '1', 'ag8', '', '', 'qqq', '', '', '0'],
  ["Adventurer's Pack", '1', 'sor', '1', 'ag8', '', '', 'qqq', '', '', '0'],
  ['Anvil Stone', '1', '', '1', '"ppp,qty=4"', '', '', 'qqq', '', '', '0'],
  ['"Multi Stocker + Key -> +1 Anvil Stone"', '1', '', '2', 't70', 'key', '', 'useitem', 'qqq', 'key', '0'],
  ['Coupon', '1', '', '1', '"cpn1,qty=8"', '', '', '99j', '', '', '0'],
  ['Coupon', '1', '', '1', '"01c,qty=3"', '', '', 'Pelta Lunata', '', '', '0'],
  ['Coupon', '1', '', '1', '"02c,qty=3"', '', '', "Biggin's Bonnet", '', '', '0'],
  ['Coupon', '1', '', '2', '"01c,qty=2"', '99j', '', 'Pelta Lunata', '', '', '0'],
  ['Coupon Reroll', '1', '', '2', 'rnd', '"cpn1,qty=3"', '', '01c', '', '', '0'],
  ['Coupon Reroll', '1', '', '2', 'rnd', '"cpn1,qty=3"', '', '02c', '', '', '0'],
  ["Inarius' Everburning Halo Ring", '1', '', '2', 'ring', 'u40', '', 'useitem', 'cloneitem', '', '0', 'branded'],
  ["Inarius' Everburning Halo Amulet", '1', '', '2', 'can8', 'u40', '', 'useitem', 'cloneitem', '', '0', 'branded'],
  ...FILLER,
]);

const MISC = tsv([
  ['name', 'code', 'namestr', 'type'],
  ['Dragon Stone', 'ppp', 'ppp'],
  ['Holy Symbol', 'hly', 'hly'],
  ['Anvil Stone', 'qqq', 'qqq'],
  ['Thawing Potion', 'wms', 'wms'],
  ['Chipped Emerald', 'gcg', 'gcg'],
  ['Chipped Sapphire', 'gcb', 'gcb'],
  ['Ring', 'ring', 'ring'],
  ["Starter's Pack", 'ag8', 'ag8'],
  ['Coupon Wild Card', '99j', '99j'],
  ['Multi Stocker', 't70', 'can8', 'can8'],
  ['Multi Stocker', 't71', 'can8', 'can8'],
  ['Randomize Stone', 'rnd', 'rnd'],
  ['Coupon nor Armor 1', '01c', '01c', 'cpn1'],
  ['Coupon nor Armor 2', '02c', '02c', 'cpn1'],
  ['Inarius Everburning Halo', 'u40', 'u40'],
  ['Skeleton Key', 'key', 'key'],
]);

const FAMILY_STRINGS = JSON.stringify([
  ...(JSON.parse(STRINGS) as object[]),
  { Key: 'wms', enUS: '*Thaw' },
  { Key: '99j', enUS: '(Wild Card)\nAncient Coupon' },
  { Key: 'can8', enUS: 'Multi Stocker' },
  { Key: 'rnd', enUS: 'Randomizing Stone' },
  { Key: '01c', enUS: '(Buckler, Pelta Lunata)\nAncient Coupon' },
  { Key: '02c', enUS: "(Cap, Biggin's Bonnet)\nAncient Coupon" },
  { Key: 'u40', enUS: "Inarius' Everburning Halo" },
]);

function esr(): EsrGuideTables {
  return buildEsrGuideTables({
    tables: { cubemain: CUBEMAIN, misc: MISC, armor: ARMOR, weapons: WEAPONS, itemtypes: ITEMTYPES, difficultylevels: DIFFICULTYLEVELS },
    strings: [{ name: 'item-names.json', text: FAMILY_STRINGS }],
  });
}

function family(id: string): CubeFamily {
  const found = findCubeFamily(id);
  if (found === undefined) throw new Error(`no family ${id}`);
  return found;
}

describe('cube families', () => {
  it('has unique ids', () => {
    const ids = CUBE_FAMILIES.map((candidate) => candidate.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists each distinct recipe once in file order, merging repeated outputs', () => {
    expect(collectFamily(family('dstone-cycle'), esr())).toEqual([
      { inputs: ['Dragon Stone'], output: 'Holy Symbol', note: null },
      { inputs: ['Holy Symbol'], output: 'Dragon Stone', note: null },
    ]);
    // Per-class duplicates collapse to one row
    expect(collectFamily(family('starter-pack'), esr())).toEqual([{ inputs: ['Starter Pack'], output: 'Anvil Stone', note: null }]);
  });

  it('collapses by the family key and names abbreviated potions by their full name', () => {
    expect(collectFamily(family('skill-forging'), esr())).toEqual([
      {
        inputs: ['Weapon (no runeword) / Ring', '2× Anvil Stone', 'Chipped Emerald'],
        output: 'The same item (+Amazon skills)',
        note: null,
      },
      { inputs: ['Weapon (no runeword)', '2× Anvil Stone', 'Chipped Sapphire'], output: 'The same item (+Sorceress skills)', note: null },
    ]);
    expect(collectFamily(family('remove-forging'), esr())).toEqual([
      {
        inputs: ['Weapon (no runeword)', '3× Thawing Potion'],
        output: 'The same item + 2× Anvil Stone',
        note: null,
      },
    ]);
  });

  it('leaves out returned items and shows no txt descriptions', () => {
    expect(collectFamily(family('anvil-stone'), esr())).toEqual([
      { inputs: ['4× Dragon Stone'], output: 'Anvil Stone', note: null },
      { inputs: ['Multi Stocker', 'Skeleton Key'], output: 'The same item + Anvil Stone', note: null },
    ]);
  });

  it('makes the per-unique coupon rows generic and keeps the Wild Card trade apart', () => {
    expect(collectFamily(family('coupon-tiers'), esr())).toEqual([
      { inputs: ['8× normal coupons (any)'], output: 'Ancient Coupon (Wild Card)', note: null },
      { inputs: ['3× matching coupons (any tier)'], output: 'The LoD unique named on the coupons', note: null },
      { inputs: ['2× matching normal coupons', '1 Wild Card'], output: 'The LoD unique named on the coupons', note: null },
      { inputs: ['Randomizing Stone', '3× normal coupons (any)'], output: 'A random normal coupon', note: null },
    ]);
  });

  it('shows a cloned item as the same item with its mods, and a type by the one name its items share', () => {
    expect(collectFamily(family('legendary-consumables'), esr())).toEqual([
      {
        inputs: ['Ring / Multi Stocker', "Inarius' Everburning Halo"],
        output: 'The same item (Branded)',
        note: null,
      },
    ]);
  });

  it('caps a block at MAX_FAMILY_ROWS rows and counts the rest in the caption', () => {
    const many: CubeFamily = { id: 'many', label: 'Many', match: /^Filler / };
    const block = familyBlock(many, esr());
    expect(block.rows).toHaveLength(MAX_FAMILY_ROWS);
    expect(block.rows[0]).toEqual({ inputs: ['Dragon Stone'], output: 'Holy Symbol', note: null });
    expect(block.caption).toBe('Many (… and 2 more)');
  });
});

describe('clusterVariants', () => {
  it('pools outputs of identical inputs, merges one differing slot and keeps everything else apart', () => {
    expect(
      clusterVariants([
        { inputs: ['A', 'Gem'], output: 'X' },
        { inputs: ['B', 'Gem'], output: 'X' },
        { inputs: ['C', 'Gem'], output: 'Y' },
        { inputs: ['C', 'Gem'], output: 'Z' },
        { inputs: ['C', 'Gem'], output: 'Z' },
        { inputs: ['D', 'Rune'], output: 'X' },
      ])
    ).toEqual([
      { inputs: ['A / B', 'Gem'], output: 'X' },
      { inputs: ['C', 'Gem'], output: 'Z / Y' },
      { inputs: ['D', 'Rune'], output: 'X' },
    ]);
  });

  it('caps a merged group at MAX_GROUP_ROWS rows', () => {
    const rows = capGroup(
      ['a', 'b', 'c', 'd', 'e'].map((input) => ({ inputs: [input], output: input })),
      () => null
    );
    expect(rows).toHaveLength(MAX_GROUP_ROWS);
    expect(rows.at(-1)?.note).toBe('… and 2 more');
  });
});

describe('::recipes', () => {
  const resolve = LEAF_DIRECTIVES.recipes;
  const ctx = fixtureContext({ esr: esr() });

  it('resolves a family to a recipes block captioned with its label', () => {
    expect(resolve('dstone-cycle', ctx)).toEqual({
      kind: 'recipes',
      caption: family('dstone-cycle').label,
      rows: collectFamily(family('dstone-cycle'), esr()),
    });
  });

  it('fails for a missing or unknown id (listing the ids), an empty family and a missing clone', () => {
    expect(resolve(null, ctx)).toHaveProperty('error', expect.stringContaining('dstone-cycle, anvil-stone'));
    expect(resolve('nope', ctx)).toHaveProperty(
      'error',
      expect.stringMatching(/^::recipes\[nope\]: unknown recipe family \(known: dstone-cycle, /)
    );
    expect(resolve('map-upgrade', ctx)).toHaveProperty('error', expect.stringContaining('no cubemain.txt row matches'));
    expect(resolve('dstone-cycle', fixtureContext({ esr: null }))).toEqual({
      error: '::recipes needs the ESR clone (not found; pass --esr <dir>)',
    });
  });

  it('keys the block by its directive in a note', () => {
    const result = markdownToBlocks('::recipes[dstone-cycle]', ctx, 'notes/test.md');
    expect(result.errors).toEqual([]);
    expect(result.dataBlocks.map((block) => block.key)).toEqual(['recipes:dstone-cycle']);
  });
});

describe.skipIf(!existsSync(ESR_DIR))('cube families against the ESR clone', () => {
  const tables = existsSync(ESR_DIR) ? buildEsrGuideTables(readEsrGuideSources(ESR_DIR)) : null;

  it.each(CUBE_FAMILIES.map((candidate) => [candidate.id, candidate] as const))('%s matches at least one row', (_, candidate) => {
    if (tables === null) return;
    expect(familyRows(candidate, tables).length).toBeGreaterThan(0);
    expect(familyBlock(candidate, tables).rows.length).toBeGreaterThan(0);
  });
});
