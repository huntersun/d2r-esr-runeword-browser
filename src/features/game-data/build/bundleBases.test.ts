import { describe, it, expect } from 'vitest';
import type { Affix, ClassCode, ItemTypeInfo, TypesBundle } from '../engine/schema.ts';
import { attachAutomods, buildBasesBundle, canRollAutomod, readStaffMods } from './bundleBases.ts';
import { readItems, readItemTypes } from './model.ts';
import { parseTsv } from './tsv.ts';

const tsv = (rows: string[][]) => rows.map((row) => row.join('\t')).join('\n');

function itemType(code: string, parents: string[], cls: ClassCode | null = null): ItemTypeInfo {
  return {
    code,
    name: code,
    parents,
    ancestors: [code, ...parents],
    sockets: [6, 6, 6],
    thresholds: [25, 40],
    cls,
    ui: null,
    rwCats: [],
    magic: true,
    rare: true,
    normal: true,
    bodyLoc: null,
  };
}

const typesBundle: TypesBundle = {
  types: [
    itemType('weap', []),
    itemType('mele', ['weap']),
    itemType('axe', ['mele']),
    itemType('sorc', [], 'sor'),
    itemType('orb', ['weap', 'sorc'], 'sor'),
    itemType('armo', []),
    itemType('shld', ['armo']),
    itemType('shie', ['shld']),
    itemType('boot', ['armo']),
  ],
  classes: [],
};

const ITEM_COLUMNS = [
  'name',
  'namestr',
  'code',
  'type',
  'type2',
  'spawnable',
  'quest',
  'level',
  'levelreq',
  'gemsockets',
  'mindam',
  'maxdam',
  'rangeadder',
  'durability',
  'nodurability',
  'auto prefix',
  'normcode',
  'ubercode',
  'ultracode',
];
const itemRow = (code: string, type: string, values: Partial<Record<(typeof ITEM_COLUMNS)[number], string>> = {}) =>
  ITEM_COLUMNS.map((column) => {
    const defaults: Record<string, string> = { name: code, namestr: code, code, type, spawnable: '1', level: '10', normcode: code };
    return values[column] ?? defaults[column] ?? '';
  });

const weapons = readItems(
  parseTsv(
    tsv([
      ITEM_COLUMNS,
      itemRow('hax', 'axe', { mindam: '3', maxdam: '6', rangeadder: '2', durability: '28', 'auto prefix': '320' }),
      itemRow('ob1', 'orb', { mindam: '2', maxdam: '5', durability: '30', 'auto prefix': '303', level: '6' }),
      itemRow('ob9', 'orb', { mindam: '20', maxdam: '30', 'auto prefix': '303', level: '85' }),
    ]),
    'weapons.txt'
  ),
  'weapon'
);
const armor = readItems(
  parseTsv(
    tsv([
      ITEM_COLUMNS,
      itemRow('spk', 'shie', { mindam: '3', maxdam: '9', durability: '40' }),
      itemRow('lbt', 'boot', { mindam: '3', maxdam: '8', nodurability: '1' }),
    ]),
    'armor.txt'
  ),
  'armor'
);

const ITEMTYPE_COLUMNS = ['ItemType', 'Code', 'Equiv1', 'Equiv2', 'StaffMods', 'Class'];
// Columns readItemTypes needs but these tests do not look at
const OTHER_ITEMTYPE_COLUMNS = [
  'BodyLoc1',
  'Magic',
  'Rare',
  'Normal',
  'MaxSockets1',
  'MaxSockets2',
  'MaxSockets3',
  'MaxSocketsLevelThreshold1',
  'MaxSocketsLevelThreshold2',
  'UICategory',
  'RunewordCategory1',
  'RunewordCategory2',
];
const typeRows = readItemTypes(
  parseTsv(
    tsv(
      [
        ITEMTYPE_COLUMNS,
        ['Axe', 'axe', 'mele', '', '', ''],
        ['Orb', 'orb', 'weap', 'sorc', 'sor', 'sor'],
        ['Robe', 'robe', 'tors', '', 'sor', ''],
        ['Broken', 'brk', '', '', 'xyz', ''],
      ].map((row, index) => [...row, ...(index === 0 ? OTHER_ITEMTYPE_COLUMNS : OTHER_ITEMTYPE_COLUMNS.map(() => ''))])
    ),
    'itemtypes.txt'
  )
);

function automod(id: number, overrides: Partial<Affix> = {}): Affix {
  return {
    id,
    kind: 'a',
    name: `Mod ${String(id)}`,
    lvl: 1,
    maxLvl: 0,
    reqLvl: 1,
    cls: null,
    reqCls: null,
    clsReqLvl: 0,
    freq: 1,
    group: 303,
    rare: true,
    itypes: ['weap'],
    etypes: [],
    mods: [],
    stats: [],
    text: [`Line ${String(id)}`],
    ...overrides,
  };
}

describe('readStaffMods', () => {
  it('maps the StaffMods column per type and warns about unknown classes', () => {
    const { bundle, warnings } = readStaffMods(typeRows);
    expect([...bundle]).toEqual([
      ['orb', 'sor'],
      ['robe', 'sor'],
    ]);
    expect(warnings).toEqual(['itemtypes: "brk" has unknown StaffMods "xyz"; ignored']);
  });
});

describe('buildBasesBundle', () => {
  const { bundle } = buildBasesBundle([...weapons, ...armor], typesBundle, new Map(), readStaffMods(typeRows).bundle);
  const byCode = new Map(bundle.bases.map((base) => [base.code, base]));

  it('writes range only when rangeadder is set', () => {
    expect(byCode.get('hax')?.range).toBe(2);
    expect(byCode.get('ob1')).not.toHaveProperty('range');
    expect(byCode.get('spk')).not.toHaveProperty('range');
  });

  it('writes staffMods from the own type only', () => {
    expect(byCode.get('ob1')?.staffMods).toBe('sor');
    expect(byCode.get('hax')).not.toHaveProperty('staffMods');
  });

  it('keeps durability and smite / kick damage of armor rows', () => {
    expect(byCode.get('spk')).toMatchObject({ durability: 40, dmg1: [3, 9], block: 0, indestructible: false });
    expect(byCode.get('lbt')).toMatchObject({ dmg1: [3, 8], indestructible: true, block: null });
  });
});

describe('canRollAutomod', () => {
  const orb = { qlvl: 6, magicLvl: 0, autoGroup: 303, cls: 'sor' as const, ancestors: ['orb', 'weap', 'sorc'] };

  it('needs the same group, an itype among the ancestors, no etype and freq > 0', () => {
    expect(canRollAutomod(automod(1), orb)).toBe(true);
    expect(canRollAutomod(automod(1, { group: 304 }), orb)).toBe(false);
    expect(canRollAutomod(automod(1, { itypes: ['armo'] }), orb)).toBe(false);
    expect(canRollAutomod(automod(1, { etypes: ['sorc'] }), orb)).toBe(false);
    expect(canRollAutomod(automod(1, { freq: 0 }), orb)).toBe(false);
    expect(canRollAutomod(automod(1, { kind: 'p' }), orb)).toBe(false);
  });

  it('applies the class lock', () => {
    expect(canRollAutomod(automod(1, { cls: 'sor' }), orb)).toBe(true);
    expect(canRollAutomod(automod(1, { cls: 'nec' }), orb)).toBe(false);
  });

  it('drops rows whose level range the base can never reach', () => {
    // qlvl 85: ilvl is raised to 85 ≥ 99 − 42, so the affix level is at least 2·85 − 99 = 71
    const highBase = { ...orb, qlvl: 85 };
    expect(canRollAutomod(automod(1, { lvl: 1, maxLvl: 70 }), highBase)).toBe(false);
    expect(canRollAutomod(automod(1, { lvl: 1, maxLvl: 71 }), highBase)).toBe(true);
    expect(canRollAutomod(automod(1, { lvl: 60 }), highBase)).toBe(true);
    // qlvl 6 reaches every level up to 99
    expect(canRollAutomod(automod(1, { lvl: 99 }), orb)).toBe(true);
  });
});

describe('attachAutomods', () => {
  const { bundle } = buildBasesBundle([...weapons, ...armor], typesBundle, new Map(), readStaffMods(typeRows).bundle);
  const affixes = [
    automod(0, { group: 320, itypes: ['weap', 'armo'], name: '', text: ['Tinkering Points: (25 to 35)'] }),
    automod(5, { lvl: 1, maxLvl: 20, text: ['+(1 to 5) to Life'] }),
    automod(6, { lvl: 60, text: ['+(31 to 40) to Life'] }),
    automod(7, { lvl: 1, maxLvl: 20, kind: 'p', text: ['not an automod'] }),
  ];
  const result = attachAutomods(bundle, affixes);
  const byCode = new Map(result.bases.map((base) => [base.code, base]));

  it('lists the ids each base can roll', () => {
    expect(byCode.get('hax')?.automods).toEqual([0]);
    expect(byCode.get('ob1')?.automods).toEqual([5, 6]);
    // qlvl 85 never goes below affix level 71
    expect(byCode.get('ob9')?.automods).toEqual([6]);
  });

  it('omits automods for bases without a group', () => {
    expect(byCode.get('spk')).not.toHaveProperty('automods');
  });

  it('writes only the referenced rows, sorted by id, without the eligibility fields', () => {
    expect(result.automods).toEqual([
      { id: 0, name: '', lvl: 1, maxLvl: 0, reqLvl: 1, text: ['Tinkering Points: (25 to 35)'] },
      { id: 5, name: 'Mod 5', lvl: 1, maxLvl: 20, reqLvl: 1, text: ['+(1 to 5) to Life'] },
      { id: 6, name: 'Mod 6', lvl: 60, maxLvl: 0, reqLvl: 1, text: ['+(31 to 40) to Life'] },
    ]);
  });

  it('keeps automods next to autoGroup and staffMods before cls', () => {
    const keys = Object.keys(byCode.get('ob1') ?? {});
    expect(keys.slice(keys.indexOf('autoGroup'), keys.indexOf('autoGroup') + 4)).toEqual(['autoGroup', 'automods', 'staffMods', 'cls']);
  });
});
