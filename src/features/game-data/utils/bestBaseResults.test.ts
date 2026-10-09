import { describe, expect, it } from 'vitest';
import type { BaseItem, ItemTypeInfo, TxtRuneword, TxtRunewordRow } from '../engine/schema';
import { findEligibleBases, type Character } from '../engine/bestBase';
import type { RunewordMatch } from '../engine/matchRunewords';
import {
  buildBaseGroups,
  collapseRowsBySockets,
  formatSocketOption,
  gameFileStats,
  ingredientSummary,
  jewelLabel,
  resolveTxtSource,
  socketRangeLabel,
  summariseRejections,
} from './bestBaseResults';

function row(sockets: number, extra: Partial<TxtRunewordRow> = {}): TxtRunewordRow {
  return { ingredients: ['Ber Rune'], codes: ['r30'], jewels: 0, sockets, itypes: ['weap'], etypes: [], reqLvl: 10, text: [], ...extra };
}

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
    strBonus: 0,
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

function type(code: string, name: string): ItemTypeInfo {
  return {
    code,
    name,
    parents: [],
    ancestors: [code],
    sockets: [3, 4, 6],
    thresholds: [25, 40],
    cls: null,
    ui: null,
    rwCats: [],
    magic: true,
    rare: true,
    normal: true,
    bodyLoc: null,
  };
}

const types = new Map([
  ['swor', type('swor', 'Sword')],
  ['axe', type('axe', 'Axe')],
  ['tors', type('tors', 'Armor')],
]);
const character: Character = { cls: 'any', level: 50, str: 50, dex: 50 };

describe('jewel labels and socket collapsing', () => {
  it('labels jewel codes', () => {
    expect(jewelLabel({ codes: ['r30'] })).toBe('');
    expect(jewelLabel({ codes: ['jew', 'r30'] })).toBe('1 Jewel');
    expect(jewelLabel({ codes: ['mjw', 'mjw', 'r30'] })).toBe('2 Mythical Jewels');
    expect(jewelLabel({ codes: ['jew', 'mjw'] })).toBe('1 Jewel + 1 Mythical Jewel');
  });

  it('collapses Jewel / Mythical Jewel rows by socket count', () => {
    const options = collapseRowsBySockets([
      row(3, { codes: ['jew', 'r30', 'r31'], reqLvl: 20 }),
      row(2, { codes: ['r30', 'r31'] }),
      row(3, { codes: ['mjw', 'r30', 'r31'], reqLvl: 30 }),
    ]);
    expect(options).toEqual([
      { sockets: 2, jewels: [''], reqLvl: 10 },
      { sockets: 3, jewels: ['1 Jewel', '1 Mythical Jewel'], reqLvl: 20 },
    ]);
    expect(options.map(formatSocketOption)).toEqual(['2 sockets', '3 sockets (1 Jewel or 1 Mythical Jewel)']);
    expect(formatSocketOption({ sockets: 1, jewels: [''], reqLvl: 1 })).toBe('1 socket');
  });
});

describe('summariseRejections', () => {
  it('counts the funnel type → sockets → class → requirements', () => {
    const bases = [
      base('ok'),
      base('heavy', { reqStr: 200 }),
      base('amaOnly', { cls: 'ama' }),
      base('twoSockets', { socketCaps: [2, 2, 2] }),
      base('armor', { kind: 'armor', type: 'tors', ancestors: ['tors', 'armo'] }),
    ];
    const summary = summariseRejections({ rows: [row(4)], bases, types, character: { ...character, cls: 'sor' } });
    expect(summary).toEqual({ total: 5, typeFit: 4, socketFit: 3, classFit: 2, usable: 1 });
  });
});

describe('buildBaseGroups', () => {
  it('ranks within kinds and orders groups by their best base', () => {
    const bases = [
      base('weakSword', { dmg1: [1, 2] }),
      base('bigAxe', { type: 'axe', ancestors: ['axe', 'mele', 'weap'], dmg1: [50, 60] }),
      base('strongSword', { dmg1: [20, 30] }),
    ];
    const eligible = findEligibleBases({ rows: [row(2)], bases, types, character });
    const groups = buildBaseGroups(eligible, types);
    expect(groups.map((group) => [group.name, group.results.map((result) => result.base.code)])).toEqual([
      ['Axe', ['bigAxe']],
      ['Sword', ['strongSword', 'weakSword']],
    ]);
  });
});

describe('resolveTxtSource', () => {
  const rows = [row(2), row(3, { codes: ['jew', 'r30'] }), row(5, { codes: ['jew', 'jew', 'jew', 'r30'] })];
  const match: RunewordMatch = { key: 'Runeword1', keys: ['Runeword1'], name: 'X', rows, quality: 'multiset' };
  const override: TxtRuneword = { key: 'Runeword2', name: 'Y', rows: [row(4)] };

  it('prefers the manual pick, then the match, narrowed to the HTM socket range', () => {
    expect(resolveTxtSource({ sockets: 2, socketsMax: 3 }, match, override)).toMatchObject({ kind: 'override', rows: [row(4)] });
    const fromMatch = resolveTxtSource({ sockets: 2, socketsMax: 3 }, match, undefined);
    expect(fromMatch).toMatchObject({ kind: 'match', quality: 'multiset' });
    expect(fromMatch.rows.map((entry) => entry.sockets)).toEqual([2, 3]);
  });

  it('falls back to all rows when none lie in the socket range, and to none without a match', () => {
    expect(resolveTxtSource({ sockets: 6 }, match, undefined).rows).toHaveLength(3);
    expect(resolveTxtSource({ sockets: 2 }, undefined, undefined)).toEqual({ kind: 'none', rows: [] });
  });
});

describe('labels', () => {
  it('formats socket ranges and ingredient summaries', () => {
    expect(socketRangeLabel([row(2), row(6), row(3)])).toBe('2–6');
    expect(socketRangeLabel([row(4)])).toBe('4');
    expect(socketRangeLabel([])).toBe('?');
    expect(ingredientSummary(['Ber Rune', 'Perfect Topaz', 'Jah Rune'])).toBe('Ber Perfect Topaz Jah');
  });
});

describe('gameFileStats', () => {
  it('merges rows with identical lines and skips rows without text', () => {
    const blocks = gameFileStats([
      { sockets: 2, text: ['+1 to All Skills'] },
      { sockets: 3, text: ['+1 to All Skills'] },
      { sockets: 3, text: ['+1 to All Skills'] },
      { sockets: 4, text: ['+2 to All Skills'] },
      { sockets: 5, text: [] },
    ]);
    expect(blocks).toEqual([
      { sockets: [2, 3], lines: ['+1 to All Skills'] },
      { sockets: [4], lines: ['+2 to All Skills'] },
    ]);
  });
});
