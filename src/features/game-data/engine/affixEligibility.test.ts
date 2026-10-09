import { describe, it, expect } from 'vitest';
import { affixLevel, eligibleAffixes, type EligibilityInput } from './affixEligibility.ts';
import type { Affix } from './schema.ts';

function affix(name: string, extra: Partial<Affix> = {}): Affix {
  return {
    id: 0,
    kind: 'p',
    name,
    lvl: 1,
    maxLvl: 0,
    reqLvl: 1,
    cls: null,
    reqCls: null,
    clsReqLvl: 0,
    freq: 10,
    group: 1,
    rare: true,
    itypes: ['weap'],
    etypes: [],
    mods: [],
    text: [],
    ...extra,
  };
}

const sword = { qlvl: 10, magicLvl: 0, autoGroup: null, cls: null };
const ancestors = ['swor', 'mele', 'weap'];

function eligible(affixes: Affix[], extra: Partial<EligibilityInput> = {}) {
  return eligibleAffixes({ affixes, base: sword, ancestors, ilvl: 50, quality: 'magic', includeAutomagic: false, ...extra });
}
const names = (list: { affix: Affix }[]) => list.map((entry) => entry.affix.name);

describe('affixLevel', () => {
  it('uses ilvl − ⌊qlvl/2⌋ below 99 − ⌊qlvl/2⌋', () => {
    expect(affixLevel(50, 10, 0)).toBe(45);
    expect(affixLevel(50, 11, 0)).toBe(45);
  });

  it('raises ilvl to qlvl when the item level is lower', () => {
    expect(affixLevel(5, 30, 0)).toBe(15);
  });

  it('uses 2·ilvl − 99 from 99 − ⌊qlvl/2⌋ on', () => {
    expect(affixLevel(94, 10, 0)).toBe(89);
    expect(affixLevel(93, 10, 0)).toBe(88);
    expect(affixLevel(99, 10, 0)).toBe(99);
  });

  it('adds magic lvl instead (wands, staves, circlets)', () => {
    expect(affixLevel(30, 20, 3)).toBe(33);
  });

  it('caps ilvl at 99 and clamps the result to 1–99', () => {
    expect(affixLevel(120, 10, 0)).toBe(99);
    expect(affixLevel(99, 10, 5)).toBe(99);
    expect(affixLevel(1, 1, 0)).toBe(1);
    expect(affixLevel(1, 4, 0)).toBe(2);
    expect(affixLevel(0, 0, 0)).toBe(1);
  });
});

describe('eligibleAffixes', () => {
  it('applies level and max level', () => {
    const result = eligible([
      affix('low', { lvl: 1 }),
      affix('exact', { lvl: 45 }),
      affix('high', { lvl: 46 }),
      affix('capped', { maxLvl: 44 }),
      affix('cap ok', { maxLvl: 45 }),
    ]);
    expect(result.alvl).toBe(45);
    expect(names(result.prefixes)).toEqual(['low', 'exact', 'cap ok']);
  });

  it('matches itypes and etypes against the ancestors', () => {
    const result = eligible([
      affix('weapon', { itypes: ['weap'] }),
      affix('armor', { itypes: ['armo'] }),
      affix('not melee', { itypes: ['weap'], etypes: ['mele'] }),
    ]);
    expect(names(result.prefixes)).toEqual(['weapon']);
  });

  it('requires the rare flag for rare items', () => {
    const affixes = [affix('both'), affix('magic only', { rare: false })];
    expect(names(eligible(affixes).prefixes)).toEqual(['both', 'magic only']);
    expect(names(eligible(affixes, { quality: 'rare' }).prefixes)).toEqual(['both']);
  });

  it('class-specific affixes only fit class bases of the same class (or bases without class)', () => {
    const affixes = [affix('any'), affix('amazon', { cls: 'ama' }), affix('sorc', { cls: 'sor' })];
    expect(names(eligible(affixes, { base: { ...sword, cls: 'ama' } }).prefixes)).toEqual(['any', 'amazon']);
    expect(names(eligible(affixes).prefixes)).toEqual(['any', 'amazon', 'sorc']);
  });

  it('splits by kind and weights by freq within the kind; freq 0 never rolls', () => {
    const result = eligible([
      affix('p1', { freq: 30 }),
      affix('p2', { freq: 10 }),
      affix('p0', { freq: 0 }),
      affix('s1', { kind: 's', freq: 5 }),
    ]);
    expect(result.prefixes.map((entry) => [entry.affix.name, entry.weight])).toEqual([
      ['p1', 0.75],
      ['p2', 0.25],
    ]);
    expect(result.suffixes.map((entry) => [entry.affix.name, entry.weight])).toEqual([['s1', 1]]);
  });

  it('rolls automods from the base group only when requested, on any quality', () => {
    const affixes = [
      affix('auto 300', { kind: 'a', group: 300, rare: false }),
      affix('auto 301', { kind: 'a', group: 301 }),
      affix('auto 300 high', { kind: 'a', group: 300, lvl: 90 }),
    ];
    const base = { ...sword, autoGroup: 300 };
    expect(names(eligible(affixes, { base }).automagic)).toEqual([]);
    expect(names(eligible(affixes, { base, includeAutomagic: true, quality: 'rare' }).automagic)).toEqual(['auto 300']);
    expect(eligible(affixes, { base, includeAutomagic: true }).prefixes).toEqual([]);
    expect(names(eligible(affixes, { includeAutomagic: true }).automagic)).toEqual([]);
  });
});
