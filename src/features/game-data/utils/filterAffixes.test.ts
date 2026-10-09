import { describe, expect, it } from 'vitest';
import type { Affix } from '../engine/schema';
import { DEFAULT_AFFIX_FILTERS, type AffixFilters } from '../store/gameDataSlice';
import {
  affixDisplayName,
  affixTypeCodes,
  affixTypeNames,
  filterAffixes,
  filterRollable,
  formatAffixLevel,
  formatWeight,
  groupRollable,
} from './filterAffixes';

function affix(overrides: Partial<Affix>): Affix {
  return {
    id: 0,
    kind: 'p',
    name: 'Sturdy',
    lvl: 1,
    maxLvl: 0,
    reqLvl: 1,
    cls: null,
    reqCls: null,
    clsReqLvl: 0,
    freq: 10,
    group: 1,
    rare: true,
    itypes: ['armo'],
    etypes: [],
    mods: [],
    text: [],
    ...overrides,
  };
}

const sturdy = affix({ id: 1, name: 'Sturdy', lvl: 1, maxLvl: 19, group: 101, freq: 28, text: ['+10-20% Enhanced Defense'] });
const fox = affix({
  id: 2,
  kind: 's',
  name: 'of the Fox',
  lvl: 10,
  group: 5,
  freq: 5,
  itypes: ['weap', 'armo'],
  etypes: ['shld'],
  text: ['+5 to Life'],
});
const shaman = affix({
  id: 3,
  name: "Shaman's",
  lvl: 30,
  maxLvl: 60,
  cls: 'dru',
  rare: false,
  itypes: ['pelt'],
  group: 50,
  freq: 1,
  text: ['+1 to Druid Skill Levels'],
});
const auto = affix({ id: 4, kind: 'a', name: '', lvl: 40, group: 300, itypes: ['weap'], text: ['+1 to Bow and Crossbow Skills'] });
const all = [sturdy, fox, shaman, auto];

const filters = (overrides: Partial<AffixFilters>): AffixFilters => ({ ...DEFAULT_AFFIX_FILTERS, ...overrides });
const ids = (list: readonly Affix[]) => list.map((entry) => entry.id);

describe('affix formatting', () => {
  it('shows prefixes, suffixes and automods', () => {
    expect(affixDisplayName(sturdy)).toBe('Sturdy …');
    expect(affixDisplayName(fox)).toBe('… of the Fox');
    expect(affixDisplayName(auto)).toBe('(automod)');
    expect(affixDisplayName(affix({ kind: 'a', name: "Fletcher's" }))).toBe("Fletcher's");
  });

  it('formats level ranges and weights', () => {
    expect(formatAffixLevel(sturdy)).toBe('lvl 1–19');
    expect(formatAffixLevel(fox)).toBe('lvl 10+');
    expect(formatWeight(0.125)).toBe('12.5%');
    expect(formatWeight(0.0004)).toBe('<0.1%');
    expect(formatWeight(0)).toBe('0.0%');
  });

  it('resolves type names and lists picker codes', () => {
    const names = new Map([
      ['weap', 'Weapon'],
      ['armo', 'Armor'],
    ]);
    expect(affixTypeNames(fox, names)).toEqual({ on: ['Weapon', 'Armor'], except: ['shld'] });
    expect(affixTypeCodes(all).sort()).toEqual(['armo', 'pelt', 'weap']);
  });
});

describe('filterAffixes', () => {
  it('returns everything sorted by level by default', () => {
    expect(ids(filterAffixes(all, DEFAULT_AFFIX_FILTERS))).toEqual([1, 2, 3, 4]);
  });

  it('searches names and stat lines with all terms', () => {
    expect(ids(filterAffixes(all, filters({ search: 'fox' })))).toEqual([2]);
    expect(ids(filterAffixes(all, filters({ search: 'enhanced defense' })))).toEqual([1]);
    expect(ids(filterAffixes(all, filters({ search: '"skill levels" druid' })))).toEqual([3]);
    expect(ids(filterAffixes(all, filters({ search: 'fox defense' })))).toEqual([]);
  });

  it('filters kinds, rare-only and class', () => {
    expect(ids(filterAffixes(all, filters({ kinds: ['s', 'a'] })))).toEqual([2, 4]);
    expect(ids(filterAffixes(all, filters({ rareOnly: true })))).toEqual([1, 2, 4]);
    expect(ids(filterAffixes(all, filters({ cls: 'dru' })))).toEqual([3]);
    expect(ids(filterAffixes(all, filters({ cls: 'none' })))).toEqual([1, 2, 4]);
  });

  it('keeps affixes whose level span overlaps the range (maxLvl 0 = open-ended)', () => {
    expect(ids(filterAffixes(all, filters({ minLvl: 20 })))).toEqual([2, 3, 4]);
    expect(ids(filterAffixes(all, filters({ maxLvl: 9 })))).toEqual([1]);
    expect(ids(filterAffixes(all, filters({ minLvl: 61, maxLvl: 70 })))).toEqual([2, 4]);
  });

  it('matches types against itypes and etypes', () => {
    expect(ids(filterAffixes(all, filters({ types: ['armo'] })))).toEqual([1, 2]);
    expect(ids(filterAffixes(all, filters({ types: ['weap'] })))).toEqual([2, 4]);
    expect(ids(filterAffixes(all, filters({ types: ['armo', 'shld'] })))).toEqual([1]);
  });

  it('sorts by name, group and frequency in both directions', () => {
    expect(ids(filterAffixes(all, filters({ sort: 'name' })))).toEqual([4, 2, 3, 1]);
    expect(ids(filterAffixes(all, filters({ sort: 'group' })))).toEqual([2, 3, 1, 4]);
    expect(ids(filterAffixes(all, filters({ sort: 'freq', sortDir: 'desc' })))).toEqual([1, 4, 2, 3]);
  });
});

describe('filterRollable', () => {
  const rollable = [
    { affix: affix({ id: 10, group: 7, lvl: 20, name: 'B' }), weight: 0.25 },
    { affix: affix({ id: 11, group: 3, lvl: 5, name: 'A', text: ['+3 to Strength'] }), weight: 0.5 },
    { affix: affix({ id: 12, group: 7, lvl: 10, name: 'C', rare: false }), weight: 0.25 },
  ];

  it('sorts by group then level and keeps the engine weights', () => {
    const result = filterRollable(rollable, DEFAULT_AFFIX_FILTERS);
    expect(result.map((entry) => entry.affix.id)).toEqual([11, 12, 10]);
    expect(result[0]?.weight).toBe(0.5);
  });

  it('applies search and rare-only but ignores level and type filters', () => {
    expect(filterRollable(rollable, filters({ search: 'strength', minLvl: 50, types: ['weap'] })).map((e) => e.affix.id)).toEqual([11]);
    expect(filterRollable(rollable, filters({ rareOnly: true })).map((e) => e.affix.id)).toEqual([11, 10]);
  });

  it('groups consecutive entries and sums their weight', () => {
    const groups = groupRollable(filterRollable(rollable, DEFAULT_AFFIX_FILTERS));
    expect(groups.map((group) => [group.group, group.affixes.length, group.weight])).toEqual([
      [3, 1, 0.5],
      [7, 2, 0.5],
    ]);
  });
});
