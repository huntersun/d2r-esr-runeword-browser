import { describe, it, expect } from 'vitest';
import { damageScore, findEligibleBases, groupByType, rankBases, upgradePath, type Character, type EligibleBase } from './bestBase.ts';
import type { BaseItem, ItemTypeInfo, TxtRunewordRow } from './schema.ts';

function base(code: string, extra: Partial<BaseItem> = {}): BaseItem {
  return {
    code,
    name: code,
    kind: 'weapon',
    type: 'swor',
    type2: null,
    ancestors: ['swor', 'mele', 'weap'],
    tier: 'normal',
    family: [code, '', ''],
    qlvl: 1,
    reqLvl: 0,
    reqStr: 0,
    reqDex: 0,
    gemSockets: 6,
    socketCaps: [3, 4, 6],
    dmg1: [2, 8],
    dmg2: null,
    throwDmg: null,
    speed: 0,
    strBonus: 100,
    dexBonus: 0,
    def: null,
    block: null,
    durability: 20,
    indestructible: false,
    magicLvl: 0,
    autoGroup: null,
    cls: null,
    inv: [1, 3],
    ...extra,
  };
}

function row(sockets: number, extra: Partial<TxtRunewordRow> = {}): TxtRunewordRow {
  return { ingredients: [], codes: [], jewels: 0, sockets, itypes: ['weap'], etypes: [], reqLvl: 1, text: [], ...extra };
}

const types = new Map(
  ['swor', 'axe', 'tors', 'shie', 'ashd', 'amul'].map((code) => [code, { code, thresholds: [25, 40] } as unknown as ItemTypeInfo])
);
const hero: Character = { cls: 'any', level: 99, str: 500, dex: 500 };

const find = (rows: TxtRunewordRow[], bases: BaseItem[], character: Character = hero, options = {}) =>
  findEligibleBases({ rows, bases, types, character, options });
const codes = (results: readonly EligibleBase[]) => results.map((result) => result.base.code);

describe('findEligibleBases', () => {
  it('matches itypes through type2 ancestors (2hsw)', () => {
    const bastard = base('bsw', { type2: '2hsw', ancestors: ['swor', '2hsw', 'mele', 'weap'] });
    const short = base('ssd', { type2: '1hsw', ancestors: ['swor', '1hsw', 'mele', 'weap'] });
    expect(codes(find([row(2, { itypes: ['2hsw'] })], [bastard, short]))).toEqual(['bsw']);
  });

  it('excludes bases whose ancestors hit an etype', () => {
    const orb = base('ob1', { ancestors: ['orb', 'weap'] });
    expect(codes(find([row(2, { etypes: ['orb'] })], [orb, base('ssd')]))).toEqual(['ssd']);
  });

  it('applies the class lock unless the character class is "any"', () => {
    const katana = base('ktn', { cls: 'ass' });
    expect(codes(find([row(2)], [katana], { ...hero, cls: 'sor' }))).toEqual([]);
    expect(codes(find([row(2)], [katana], { ...hero, cls: 'ass' }))).toEqual(['ktn']);
    expect(codes(find([row(2)], [katana]))).toEqual(['ktn']);
  });

  it('requires the socket count at some ilvl and reports the lowest ilvl band for it', () => {
    const bases = [base('a', { socketCaps: [3, 4, 6] }), base('b', { socketCaps: [2, 3, 3] })];
    expect(find([row(3)], bases).map((r) => [r.base.code, r.minIlvlForSockets])).toEqual([
      ['a', 1],
      ['b', 26],
    ]);
    expect(find([row(5)], bases).map((r) => [r.base.code, r.minIlvlForSockets])).toEqual([['a', 41]]);
  });

  it('keeps one result per base with the fewest-socket qualifying row', () => {
    const rows = [row(4, { jewels: 1 }), row(3), row(6, { jewels: 3 })];
    const [result] = find(rows, [base('a', { socketCaps: [3, 4, 4] })]);
    expect(result?.row.sockets).toBe(3);
    expect(result?.rows.map((r) => r.sockets)).toEqual([3, 4]);
  });

  it('filters by requirements, or returns deficits with includeUnusable', () => {
    const heavy = base('h', { reqLvl: 30, reqStr: 120, reqDex: 40 });
    const rows = [row(2, { reqLvl: 45 })];
    const novice: Character = { cls: 'any', level: 40, str: 100, dex: 50 };
    expect(find(rows, [heavy], novice)).toEqual([]);
    const [result] = find(rows, [heavy], novice, { includeUnusable: true });
    expect(result).toMatchObject({ effectiveReqLvl: 45, usable: false, deficits: { lvl: 5, str: 20, dex: 0 } });
  });

  it('ethereal lowers str/dex requirements by 10 and scales damage/defense ×1.5 rounded down', () => {
    const blade = base('b', { reqStr: 105, reqDex: 5, dmg1: [3, 7], dmg2: [5, 11] });
    const [result] = find([row(2)], [blade], { ...hero, str: 95, dex: 0 }, { ethereal: true });
    expect(result).toMatchObject({ reqStr: 95, reqDex: 0, usable: true, dmg1: [4, 10], dmg2: [7, 16], estimate: true });
    expect(find([row(2)], [blade])[0]?.estimate).toBe(false);
  });
});

describe('rankBases', () => {
  const rank = (bases: BaseItem[], kind: BaseItem['kind']) =>
    codes(rankBases(find([row(1, { itypes: ['weap', 'armo', 'amul'] })], bases), kind));

  it('ranks weapons by the higher of 1H/2H average damage, then speed, then str+dex', () => {
    const bases = [
      base('oneHand', { dmg1: [10, 20] }),
      base('twoHand', { dmg1: null, dmg2: [10, 30] }),
      base('both', { dmg1: [5, 5], dmg2: [12, 28] }),
      base('fast', { dmg1: [10, 20], speed: -10 }),
      base('light', { dmg1: [10, 20], reqStr: 10 }),
      base('heavy', { dmg1: [10, 20], reqStr: 50 }),
    ];
    expect(rank(bases, 'weapon')).toEqual(['both', 'twoHand', 'fast', 'oneHand', 'light', 'heavy']);
    expect(damageScore({ avgDmg1: null, avgDmg2: null, throwDmg: [4, 6] })).toBe(5);
  });

  it('ranks armor by max defense, then shield block', () => {
    const armor = (code: string, def: [number, number], block: number | null) =>
      base(code, { kind: 'armor', type: 'shie', ancestors: ['shie', 'armo'], dmg1: null, def, block });
    expect(rank([armor('low', [10, 20], 30), armor('high', [10, 40], 10), armor('blocky', [10, 20], 50)], 'armor')).toEqual([
      'high',
      'blocky',
      'low',
    ]);
  });

  it('ranks accessories by required level', () => {
    const amulet = (code: string, reqLvl: number) => base(code, { kind: 'misc', type: 'amul', ancestors: ['amul'], dmg1: null, reqLvl });
    expect(rank([amulet('late', 60), amulet('early', 5)], 'misc')).toEqual(['early', 'late']);
  });
});

describe('groupByType', () => {
  it('groups by the immediate type in input order', () => {
    const results = find([row(1)], [base('s1'), base('a1', { type: 'axe' }), base('s2')]);
    expect([...groupByType(results)].map(([type, list]) => [type, codes(list)])).toEqual([
      ['swor', ['s1', 's2']],
      ['axe', ['a1']],
    ]);
  });
});

describe('upgradePath', () => {
  const family: [string, string, string] = ['ssd', 'xsd', 'usd'];
  const all = [
    base('ssd', { family, tier: 'normal' }),
    base('xsd', { family, tier: 'exceptional' }),
    base('usd', { family, tier: 'elite' }),
  ];

  it('returns the next tier of the family', () => {
    expect(upgradePath(all[0] ?? base('x'), all)?.code).toBe('xsd');
    expect(upgradePath(all[1] ?? base('x'), all)?.code).toBe('usd');
  });

  it('returns null for elite/mythical bases, missing members and self-referential families', () => {
    expect(upgradePath(all[2] ?? base('x'), all)).toBeNull();
    expect(upgradePath(base('m01', { tier: 'mythical', family: ['m01', 'm01', 'm01'] }), all)).toBeNull();
    expect(upgradePath(base('ssd', { family: ['ssd', 'gone', ''] }), all)).toBeNull();
    expect(upgradePath(base('rin', { family: ['rin', 'rin', 'rin'] }), all)).toBeNull();
  });
});
