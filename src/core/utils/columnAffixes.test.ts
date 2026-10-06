import { describe, it, expect } from 'vitest';
import type { Affix, BonusPool, ColumnBonusPools, SocketableBonuses } from '@/core/db/models';
import { firstNonEmptyPools, hasColumnDifferences, hasPoolColumnDifferences } from './columnAffixes';

function affix(rawText: string): Affix {
  return { rawText, pattern: rawText, value: null, valueType: 'none' };
}

function columns(weaponsGloves: string[], helmsBoots: string[], armorShieldsBelts: string[]): SocketableBonuses {
  return {
    weaponsGloves: weaponsGloves.map(affix),
    helmsBoots: helmsBoots.map(affix),
    armorShieldsBelts: armorShieldsBelts.map(affix),
  };
}

describe('hasColumnDifferences', () => {
  it('returns false for zero or one category', () => {
    const cols = columns(['a'], ['b'], ['c']);
    expect(hasColumnDifferences(cols, [])).toBe(false);
    expect(hasColumnDifferences(cols, ['weaponsGloves'])).toBe(false);
  });

  it('returns false when all relevant columns are identical', () => {
    const cols = columns(['a', 'b'], ['a', 'b'], ['x']);
    expect(hasColumnDifferences(cols, ['weaponsGloves', 'helmsBoots'])).toBe(false);
  });

  it('ignores columns outside the given categories', () => {
    const cols = columns(['a'], ['a'], ['different']);
    expect(hasColumnDifferences(cols, ['weaponsGloves', 'helmsBoots'])).toBe(false);
  });

  it('detects differing text', () => {
    const cols = columns(['a', 'b'], ['a', 'c'], []);
    expect(hasColumnDifferences(cols, ['weaponsGloves', 'helmsBoots'])).toBe(true);
  });

  it('detects differing lengths', () => {
    const cols = columns(['a'], [], ['a', 'b']);
    expect(hasColumnDifferences(cols, ['weaponsGloves', 'armorShieldsBelts'])).toBe(true);
  });

  it('detects order differences', () => {
    const cols = columns(['a', 'b'], ['b', 'a'], []);
    expect(hasColumnDifferences(cols, ['weaponsGloves', 'helmsBoots'])).toBe(true);
  });
});

function pool(label: string, lines: string[]): BonusPool {
  return { label, affixes: lines.map(affix) };
}

function poolColumns(weaponsGloves: BonusPool[], helmsBoots: BonusPool[], armorShieldsBelts: BonusPool[]): ColumnBonusPools {
  return { weaponsGloves, helmsBoots, armorShieldsBelts };
}

describe('hasPoolColumnDifferences', () => {
  const a = pool('1-2 of the following:', ['a', 'b']);

  it('returns false for one category or identical columns', () => {
    const cols = poolColumns([a], [a], [pool('x', ['y'])]);
    expect(hasPoolColumnDifferences(cols, ['weaponsGloves'])).toBe(false);
    expect(hasPoolColumnDifferences(cols, ['weaponsGloves', 'helmsBoots'])).toBe(false);
  });

  it('detects differing labels, lines or pool counts', () => {
    const categories = ['weaponsGloves', 'helmsBoots'] as const;
    expect(hasPoolColumnDifferences(poolColumns([a], [pool('2-3 of the following:', ['a', 'b'])], []), categories)).toBe(true);
    expect(hasPoolColumnDifferences(poolColumns([a], [pool(a.label, ['a', 'c'])], []), categories)).toBe(true);
    expect(hasPoolColumnDifferences(poolColumns([a], [a, a], []), categories)).toBe(true);
  });

  it('does not treat lines moved across a pool boundary as equal', () => {
    const cols = poolColumns([pool('h', ['a']), pool('h', ['b'])], [pool('h', ['a', 'b'])], []);
    expect(hasPoolColumnDifferences(cols, ['weaponsGloves', 'helmsBoots'])).toBe(true);
  });
});

describe('firstNonEmptyPools', () => {
  it('returns the first column with pools, or none', () => {
    const a = pool('h', ['a']);
    expect(firstNonEmptyPools(poolColumns([], [a], []))).toEqual([a]);
    expect(firstNonEmptyPools(poolColumns([], [], []))).toEqual([]);
  });
});
