import { describe, expect, it } from 'vitest';
import type { BaseTier } from '@/features/game-data/constants/bases';
import { matchesTiers } from './tierFilter';

const tierOf = new Map<string, BaseTier>([
  ['hax', 'normal'],
  ['p01', 'normal'],
  ['9ha', 'exceptional'],
  ['7ha', 'elite'],
  ['m01', 'mythical'],
]);

describe('matchesTiers', () => {
  it('keeps every item without a tier selection, tierless bases included', () => {
    expect(matchesTiers('hax', [], tierOf)).toBe(true);
    expect(matchesTiers('rin', [], tierOf)).toBe(true);
  });

  it('keeps items whose base tier is selected, non-spawnable base rows included', () => {
    expect(matchesTiers('7ha', ['elite'], tierOf)).toBe(true);
    expect(matchesTiers('p01', ['normal', 'mythical'], tierOf)).toBe(true);
    expect(matchesTiers('m01', ['normal', 'mythical'], tierOf)).toBe(true);
    expect(matchesTiers('9ha', ['normal', 'elite'], tierOf)).toBe(false);
  });

  it('hides tierless and unknown bases once a tier is selected', () => {
    expect(matchesTiers('rin', ['normal'], tierOf)).toBe(false);
    expect(matchesTiers('', ['normal'], tierOf)).toBe(false);
  });

  it('matches the base code case-insensitively', () => {
    expect(matchesTiers('HAX', ['normal'], tierOf)).toBe(true);
  });
});
