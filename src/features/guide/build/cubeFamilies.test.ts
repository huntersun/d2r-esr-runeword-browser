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
  'input 4',
  'input 5',
];

/** A cubemain row with up to five inputs and three outputs, in the HEADER column order */
function cube(description: string, inputs: string[], outputs: string[]): string[] {
  const [first = '', second = '', third = '', fourth = '', fifth = ''] = inputs;
  const [output = '', b = '', c = ''] = outputs;
  return [description, '1', '', String(inputs.length), first, second, third, output, b, c, '0', '', fourth, fifth];
}

const ITEMTYPES = tsv([
  ['ItemType', 'Code'],
  ['Weapon', 'weap'],
  ['Any Armor', 'armo'],
  ['Jewel', 'jewl'],
  ['Chipped Gem', 'gem0'],
  ['Blemished Gem', 'gem4'],
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
  // Stat and all skills forging: equipment of any quality is one row, jewels keep their own
  cube('Set Stat Forging Dru_else', ['"any,set"', 'qqq', 'gcg'], ['useitem']),
  cube('Stat Forging Mag/Rar Jewel', ['jewl', 'qqq', 'gcg'], ['useitem']),
  cube('Uni Stat Forging Sor_weap', ['"weap,uni"', 'qqq', 'gcb'], ['useitem']),
  cube('All Skill Forging Set', ['"any,set"', 'map', 'qqq', 'gem0'], ['useitem']),
  cube('All Skill Forging Normal', ['"weap,nor,nru"', 'map', 'qqq', 'gem0'], ['useitem']),
  // Rune forging: one row per rune and slot; the wand rows only override bonuses and are left out
  cube('Rune Forging Jewel W', ['jewl', '"r01,qty=2"', 'gem0', 'tsc'], ['useitem', 'tsc']),
  cube('Rune Forging Jewel H', ['jewl', '"r01,qty=2"', 'gem0', 'isc'], ['useitem', 'isc']),
  cube('Rune Forging wand', ['"wand,nru"', '"r02,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging weap', ['"weap,nru"', '"r01,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging weap', ['"weap,nru"', '"r02,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging weap', ['"weap,nru"', '"r03,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging weap', ['"weap,nru"', '"r84,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging armo', ['"armo,nru"', '"r01,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging armo', ['"armo,nru"', '"r02,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging armo', ['"armo,nru"', '"r03,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging armo', ['"armo,nru"', '"r84,qty=2"', 'gem0'], ['useitem']),
  // Rune conversions
  cube('rune upgrade', ['"r01,qty=2"'], ['r02']),
  cube('rune upgrade', ['"r02,qty=2"'], ['r03']),
  cube('rune upgrade', ['r03', 'rvl'], ['r50']),
  cube('rune upgrade', ['"r51,qty=2"'], ['r52']),
  cube('rune downgrade', ['r03'], ['r02']),
  cube('rune downgrade', ['r02'], ['r01']),
  cube('Nul -> Wo', ['r50', 'rvl'], ['r03']),
  cube('Wo -> Nul', ['r03', 'rvl'], ['r50']),
  cube('decal ON', ['01l', 'r01'], ['r51']),
  cube('decal ON', ['02l', 'r03'], ['r52']),
  cube('decal ON', ['03l', 'r02'], ['r53']),
  cube('decal OFF', ['r51'], ['r01', '01l']),
  cube('decal OFF', ['r52'], ['r03', '02l']),
  cube('Moon Rune', ['r50', '"xt0,qty=1"'], ['r84']),
  cube('Moon Rune', ['can9', 'r84'], ['useitem']),
  // Tinkering: one row per organ, weapon and armor merged
  cube('Tinkering Adds Life +1: Equipment + 3 Hearts', ['"weap,nru"', '"hrt,qty=3"'], ['useitem']),
  cube('Tinkering Adds Fdam 1-3: Equipment + Fang', ['"weap,nru"', 'fng'], ['useitem']),
  cube('Tinkering Adds Life +1: Equipment + 3 Hearts', ['"armo,nru"', '"hrt,qty=3"'], ['useitem']),
  cube('Tinkering Adds Fdam 1-3: Equipment + Fang', ['"armo,nru"', 'fng'], ['useitem']),
  // Pandemonium keys
  cube('Key of Terror + Blemished Gem + Thawing Potion -> Key of Destruction Conversion', ['pk1', 'gem4', 'wms'], ['pk3', 'wms']),
  cube('Pandemonium Key Set Unwrap', ['u10'], ['pk1', 'pk2', 'pk3']),
  cube('Pandemonium Key Set Wrap', ['pk1', 'pk2', 'pk3', 'key'], ['u10', 'key']),
  cube("1 Diablo's Horn + 1 Baal's Eye + 1 Mephisto's Brain -> Portal to Tristram", ['dhn', 'bey', 'mbr'], ['Pandemonium Finale Portal']),
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
  ['Maple Leaf', 'map', 'map'],
  ['Chipped Topaz', 'gcy', 'gcy'],
  ['Scroll of Town Portal', 'tsc', 'tsc'],
  ['Scroll of Identify', 'isc', 'isc'],
  ['I Rune', 'r01', 'r01'],
  ['U Rune', 'r02', 'r02'],
  ['Shi Rune', 'r03', 'r03'],
  ['Null Rune', 'r50', 'r50'],
  ['El Rune', 'r51', 'r51'],
  ['Eld Rune', 'r52', 'r52'],
  ['Tir Rune', 'r53', 'r53'],
  ['Moon Rune', 'r84', 'r84'],
  ['Full Rejuv Potion', 'rvl', 'rvl'],
  ['Ancient Decal (I -> El)', '01l', '01l'],
  ['Ancient Decal (Shi -> Eld)', '02l', '02l'],
  ['Ancient Decal (Ka -> Tir)', '03l', '03l'],
  ['Frozen Soul', 'xt0', 'xt0'],
  ['Crystal Can', 'can9', 'can9'],
  ['Key of Terror', 'pk1', 'pk1'],
  ['Key of Hate', 'pk2', 'pk2'],
  ['Key of Destruction', 'pk3', 'pk3'],
  ['Pandemonium Key Set', 'u10', 'u10'],
  ["Diablo's Horn", 'dhn', 'dhn'],
  ["Baal's Eye", 'bey', 'bey'],
  ["Mephisto's Brain", 'mbr', 'mbr'],
  ['Heart', 'hrt', 'hrt'],
  ['Fang', 'fng', 'fng'],
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

  it('shows a cloned item as a copy with its mods next to the original, and a type by the one name its items share', () => {
    expect(collectFamily(family('legendary-consumables'), esr())).toEqual([
      {
        inputs: ['Ring / Multi Stocker', "Inarius' Everburning Halo"],
        output: 'The same item + A copy of the item (Branded)',
        note: null,
      },
    ]);
  });

  it('shows stat and all skills forging on equipment of any quality as one row, jewels apart', () => {
    expect(collectFamily(family('stat-forging'), esr())).toEqual([
      {
        inputs: ['Equipment of any quality (no runeword)', 'Anvil Stone', 'Chipped Emerald / Chipped Sapphire'],
        output: 'The same item',
        note: null,
      },
      { inputs: ['Jewel', 'Anvil Stone', 'Chipped Emerald'], output: 'The same item', note: null },
    ]);
    expect(collectFamily(family('all-skill-forging'), esr())).toEqual([
      {
        inputs: ['Equipment of any quality (no runeword)', 'Maple Leaf', 'Anvil Stone', 'Chipped Gem'],
        output: 'The same item',
        note: null,
      },
    ]);
  });

  it('merges the per-rune forging rows per slot, naming the runes as ranges, and leaves out the bonus overrides', () => {
    expect(collectFamily(family('rune-forging'), esr())).toEqual([
      {
        inputs: ['Jewel', '2× the same rune (I Rune)', 'Chipped Gem', 'Scroll of Town Portal / Scroll of Identify'],
        output: 'The same item',
        note: null,
      },
      {
        inputs: ['Weapon (no runeword) / Any Armor (no runeword)', '2× the same rune (I Rune to Shi Rune, Moon Rune)', 'Chipped Gem'],
        output: 'The same item',
        note: null,
      },
    ]);
  });

  it('shows rune conversions generically, checks the Decal pairs against their names and keeps Crystal Can rows out', () => {
    expect(collectFamily(family('rune-conversion'), esr())).toEqual([
      { inputs: ['2× the same rune (I Rune to U Rune, El Rune)'], output: 'The next rune', note: null },
      { inputs: ['Shi Rune', 'Full Rejuv Potion'], output: 'Null Rune', note: null },
      { inputs: ['Null Rune', 'Full Rejuv Potion'], output: 'Shi Rune', note: null },
      { inputs: ['A rune (U Rune to Shi Rune)'], output: 'The rune one grade lower', note: null },
      {
        inputs: ['Ancient Decal (X -> Y)', 'X Rune (the ES rune named on the Decal)'],
        output: 'Y Rune (an LoD rune)',
        note: null,
      },
      // A Decal whose name does not match its row is shown as it is
      { inputs: ['Ancient Decal (Ka -> Tir)', 'U Rune'], output: 'Tir Rune', note: null },
      { inputs: ['An LoD rune (El Rune to Eld Rune)'], output: 'The ES rune and the Ancient Decal named after it', note: null },
      { inputs: ['Null Rune', 'Frozen Soul'], output: 'Moon Rune', note: null },
    ]);
  });

  it('lists tinkering once per organ', () => {
    expect(collectFamily(family('tinkering'), esr())).toEqual([
      { inputs: ['Weapon (no runeword) / Any Armor (no runeword)', '3× Heart'], output: 'The same item', note: null },
      { inputs: ['Weapon (no runeword) / Any Armor (no runeword)', 'Fang'], output: 'The same item', note: null },
    ]);
  });

  it('lists the Pandemonium key recipes', () => {
    expect(collectFamily(family('uber-keys'), esr())).toEqual([
      { inputs: ['Key of Terror', 'Blemished Gem', 'Thawing Potion'], output: 'Key of Destruction', note: null },
      { inputs: ['Pandemonium Key Set'], output: 'Key of Terror + Key of Hate + Key of Destruction', note: null },
      { inputs: ['Key of Terror', 'Key of Hate', 'Key of Destruction', 'Skeleton Key'], output: 'Pandemonium Key Set', note: null },
      { inputs: ["Diablo's Horn", "Baal's Eye", "Mephisto's Brain"], output: 'Pandemonium Finale Portal', note: null },
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
