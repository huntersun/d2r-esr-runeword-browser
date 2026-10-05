import { describe, it, expect } from 'vitest';
import type { Affix, SocketableBonuses } from '@/core/db/models';
import { hasColumnDifferences } from './columnAffixes';

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
