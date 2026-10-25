import { describe, expect, it } from 'vitest';
import { buildSetsBundle, type SetsInput } from './bundleSets.ts';
import type { PropertyMod } from './model.ts';
import { parseTsv } from './tsv.ts';

/** Rows as column → value records, so a test names only the cells it needs */
function table(columns: readonly string[], rows: readonly Record<string, string>[]) {
  return parseTsv([columns.join('\t'), ...rows.map((row) => columns.map((column) => row[column] ?? '').join('\t'))].join('\n'));
}

const SET_COLUMNS = [
  'index',
  'name',
  'version',
  ...[2, 3, 4, 5].flatMap((n) => ['a', 'b'].flatMap((part) => ['PCode', 'PParam', 'PMin', 'PMax'].map((c) => `${c}${String(n)}${part}`))),
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) => ['FCode', 'FParam', 'FMin', 'FMax'].map((c) => `${c}${String(n)}`)),
  'UIClass',
];
const ITEM_COLUMNS = [
  'index',
  'set',
  'disabled',
  'item',
  'lvl',
  'lvl req',
  'add func',
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => ['prop', 'par', 'min', 'max'].map((c) => `${c}${String(n)}`)),
  ...[1, 2, 3, 4, 5].flatMap((n) => ['a', 'b'].flatMap((part) => ['aprop', 'apar', 'amin', 'amax'].map((c) => `${c}${String(n)}${part}`))),
];

/** Lines read "code param min-max" so the tests see which mods went into which group */
const renderMods = (mods: readonly PropertyMod[]) => ({
  lines: mods.map((mod) => `${mod.code}${mod.param === null ? '' : ` ${mod.param}`} ${String(mod.min)}-${String(mod.max)}`),
  warnings: [],
});

const STRINGS = new Map([
  ['Tricks-Sor', "Arcanna's Tricks"],
  ['Sign', "Arcanna's Sign"],
  ['Wand', "Arcanna's Deathwand"],
  ['Kit', 'Survival Kit'],
]);

function input(): SetsInput {
  return {
    sets: table(SET_COLUMNS, [
      {
        index: 'Tricks-Sor',
        name: 'Tricks-Sor',
        PCode2a: 'hp%',
        PMin2a: '10',
        PMax2a: '10',
        PCode2b: 'mana%',
        PMin2b: '10',
        PMax2b: '10',
        PCode4b: 'res-all',
        PMin4b: '5',
        PMax4b: '5',
        FCode1: 'sor',
        FMin1: '2',
        FMax1: '2',
        FCode3: 'cast2',
        FMin3: '30',
        FMax3: '30',
        UIClass: 'sor',
      },
      { index: 'Kit', name: 'Kit', FCode1: 'addxp', FMin1: '10', FMax1: '10' },
      { index: 'Sanctuary_old', name: 'Kit', FCode1: 'addxp', FMin1: '5', FMax1: '5' },
      { index: 'Empty', name: 'Empty', FCode1: 'addxp', FMin1: '5', FMax1: '5' },
    ]),
    setitems: table(ITEM_COLUMNS, [
      {
        index: 'Sign',
        set: 'Tricks-Sor',
        item: 'amu',
        lvl: '5',
        'lvl req': '1',
        'add func': '2',
        prop1: 'mana',
        min1: '15',
        max1: '15',
        aprop1a: 'allskills',
        amin1a: '1',
        amax1a: '1',
        aprop1b: 'mag%',
        amin1b: '50',
        amax1b: '50',
        aprop2a: 'mana/lvl',
        apar2a: '20',
      },
      {
        index: 'Wand',
        set: 'Tricks-Sor',
        item: 'sst',
        lvl: '9',
        'lvl req': '12',
        'add func': '2',
        prop1: 'skill',
        par1: 'Fire Bolt',
        min1: '1',
        max1: '3',
        aprop3b: 'dmg/lvl',
        apar3b: '8',
      },
      { index: 'Bow', set: 'Kit', item: 'sbw', lvl: '10', 'lvl req': '10', 'add func': '2', prop1: 'dmg%', min1: '100', max1: '100' },
      { index: 'Suit', set: 'Kit', item: 'lea', lvl: '10', 'lvl req': '10', 'add func': '2', prop1: 'ac%', min1: '300', max1: '300' },
      { index: 'Halo', set: 'Sanctuary_old', item: 'br2', 'add func': '2', prop1: 'vit', min1: '5', max1: '5' },
      { index: 'Defense', set: 'Malek_old', item: 'sp2', 'add func': '2', prop1: 'block', min1: '5', max1: '5' },
      { index: 'Off', set: 'Kit', disabled: '1', item: 'sbw', 'add func': '2', prop1: 'str', min1: '5', max1: '5' },
    ]),
    bases: [
      { code: 'amu', name: 'Amulet', type: 'amul' },
      { code: 'sst', name: 'Short Staff', type: 'staf' },
      { code: 'sbw', name: 'Short Bow', type: 'bow' },
      { code: 'lea', name: 'Leather Armor', type: 'tors' },
    ],
    types: [
      { code: 'amul', name: 'Amulet' },
      { code: 'staf', name: 'Staff' },
      { code: 'bow', name: 'Bow' },
      { code: 'tors', name: 'Armor' },
    ],
    classes: [{ code: 'sor', name: 'Sorceress' }],
    strings: STRINGS,
    renderMods,
  };
}

describe('buildSetsBundle', () => {
  const result = buildSetsBundle(input());
  const [tricks, kit] = result.bundle.sets;

  it('hides _old and itemless sets and the items of hidden, unknown or disabled rows', () => {
    expect(result.bundle.sets.map((set) => set.id)).toEqual(['Tricks-Sor', 'Kit']);
    expect(result.hidden).toEqual({ sets: 2, items: 3 });
    expect(result.warnings).toEqual([]);
  });

  it('names sets and items from the strings table, with base and category names', () => {
    expect(tricks?.name).toBe("Arcanna's Tricks");
    expect(tricks?.items.map((item) => [item.name, item.baseName, item.category])).toEqual([
      ["Arcanna's Sign", 'Amulet', 'Amulet'],
      ["Arcanna's Deathwand", 'Short Staff', 'Staff'],
    ]);
    // Missing strings fall back to the index
    expect(kit?.items.map((item) => item.name)).toEqual(['Bow', 'Suit']);
  });

  it('resolves UIClass to the class name; a blank UIClass is any class', () => {
    expect([tricks?.classCode, tricks?.className]).toEqual(['sor', 'Sorceress']);
    expect([kit?.classCode, kit?.className]).toEqual([null, null]);
  });

  it('spans the items required levels', () => {
    expect(tricks?.reqLevel).toEqual({ min: 1, max: 12 });
    expect(kit?.reqLevel).toEqual({ min: 10, max: 10 });
  });

  it('maps per-item group N to N + 1 pieces, merging a and b and dropping empty groups', () => {
    expect(tricks?.items[0]?.partial).toEqual([
      { pieces: 2, lines: ['allskills 1-1', 'mag% 50-50'] },
      { pieces: 3, lines: ['mana/lvl 20 0-0'] },
    ]);
    expect(tricks?.items[1]?.partial).toEqual([{ pieces: 4, lines: ['dmg/lvl 8 0-0'] }]);
    expect(tricks?.items[1]?.lines).toEqual(['skill Fire Bolt 1-3']);
  });

  it('maps set-wide group N to N pieces and renders the full-set bonuses', () => {
    expect(tricks?.partial).toEqual([
      { pieces: 2, lines: ['hp% 10-10', 'mana% 10-10'] },
      { pieces: 4, lines: ['res-all 5-5'] },
    ]);
    expect(tricks?.full).toEqual(['sor 2-2', 'cast2 30-30']);
    expect(kit?.partial).toEqual([]);
  });

  it('warns about unknown sets, bases and classes, and other add func values', () => {
    const base = input();
    const odd = buildSetsBundle({
      ...base,
      sets: table(SET_COLUMNS, [{ index: 'Kit', name: 'Kit', UIClass: 'xyz' }]),
      setitems: table(ITEM_COLUMNS, [
        { index: 'Bow', set: 'Kit', item: 'zzz', 'add func': '1', aprop1a: 'str', amin1a: '1', amax1a: '1' },
        { index: 'Lost', set: 'Nowhere', item: 'sbw' },
      ]),
    });
    expect(odd.warnings).toEqual([
      'sets: item "Bow" has add func 1; its bonuses are shown by item count',
      'sets: item "Bow" has unknown base "zzz"',
      'sets: item "Lost" names unknown set "Nowhere"',
      'sets: set "Kit" has unknown UIClass "xyz"',
    ]);
    expect(odd.bundle.sets[0]?.items[0]).toMatchObject({ baseName: 'zzz', category: '' });
  });
});
