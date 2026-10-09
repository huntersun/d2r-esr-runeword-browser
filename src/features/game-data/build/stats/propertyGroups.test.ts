import { describe, it, expect } from 'vitest';
import type { ModInput } from './expandProperty.ts';
import { formatChance, poolHeader, resolveGroups } from './propertyGroups.ts';
import { testRenderer, testTables } from './testContext.mock.ts';

const { groups } = testTables();
const renderer = testRenderer();
const mod = (code: string, min: number, max = min, param: string | null = null): ModInput => ({ code, param, min, max });

describe('resolveGroups', () => {
  it('passes plain properties through', () => {
    expect(resolveGroups([mod('str', 5)], groups)).toEqual({ mods: [mod('str', 5)], pools: [], warnings: [] });
  });

  it('PickMode 0 applies every entry', () => {
    expect(resolveGroups([mod('each', 1)], groups).mods).toEqual([mod('str', 3), mod('res-fire', 10)]);
  });

  it('PickMode 1 picks one entry weighted by Chance', () => {
    const { pools } = resolveGroups([mod('pick-weighted', 1)], groups);
    expect(pools).toHaveLength(1);
    expect(pools[0]?.count).toEqual({ min: 1, max: 1 });
    expect(pools[0]?.options.map((option) => [option.mods, option.chance])).toEqual([
      [[mod('str', 5)], 0.75],
      [[mod('dex', 7)], 0.25],
    ]);
  });

  it('PickMode 2 picks one entry (all chances equal in ESR)', () => {
    const { pools } = resolveGroups([mod('pick-uniform', 1)], groups);
    expect(pools[0]?.options.map((option) => option.chance)).toEqual([0.5, 0.5]);
  });

  it('a pick-one group inside a PickMode 0 group is rolled ModMin–ModMax times', () => {
    const { mods, pools } = resolveGroups([mod('nested', 1)], groups);
    expect(mods).toEqual([mod('dex', 4)]);
    expect(pools[0]?.count).toEqual({ min: 1, max: 2 });
    expect(poolHeader(pools[0] ?? { count: { min: 1, max: 1 }, options: [] })).toBe('1-2 of the following:');
  });

  it('expands a ParMin–ParMax range into one option per param', () => {
    const { pools } = resolveGroups([mod('tab-range', 1)], groups);
    expect(pools[0]?.options.map((option) => [option.mods[0]?.param, Math.round(option.chance * 300) / 100])).toEqual([
      ['3', 1],
      ['4', 1],
      ['5', 1],
    ]);
  });

  it('formats chances with one decimal', () => {
    expect(formatChance(1 / 3)).toBe('33.3%');
  });
});

describe('StatRenderer with property groups', () => {
  it('renders pools as a header plus one line per option with its chance', () => {
    expect(renderer.renderMods([mod('str', 1), mod('pick-weighted', 1)]).lines).toEqual([
      '+1 to Strength',
      'One of:',
      '+5 to Strength (75%)',
      '+7 to Dexterity (25%)',
    ]);
    expect(renderer.renderMods([mod('tab-range', 1)]).lines).toEqual([
      'One of:',
      '+1 to Fire Skills (Sorceress Only) (33.3%)',
      '+1 to Lightning Skills (Sorceress Only) (33.3%)',
      '+1 to Cold Skills (Sorceress Only) (33.3%)',
    ]);
  });
});
