import { describe, it, expect } from 'vitest';
import type { Affix, EsrRune, Gem, KanjiRune, LodRune, SocketableBonuses } from '@/core/db/models';
import { aggregateBonusTexts, buildSocketableLookup, resolveRune } from './socketableLookup';

function affix(rawText: string): Affix {
  return { rawText, pattern: rawText, value: null, valueType: 'none' };
}

function bonuses(weaponsGloves: string[] = [], helmsBoots: string[] = [], armorShieldsBelts: string[] = []): SocketableBonuses {
  return {
    weaponsGloves: weaponsGloves.map(affix),
    helmsBoots: helmsBoots.map(affix),
    armorShieldsBelts: armorShieldsBelts.map(affix),
  };
}

const esr = (name: string): EsrRune => ({ name, order: 1, tier: 1, color: 'WHITE', reqLevel: 1, bonuses: bonuses() });
const lod = (name: string): LodRune => ({ name, order: 1, tier: 1, reqLevel: 1, bonuses: bonuses() });
const kanji = (name: string): KanjiRune => ({ name, reqLevel: 1, bonuses: bonuses() });
const gem = (name: string): Gem => ({ name, type: 'Ruby', quality: 'Perfect', color: 'RED', reqLevel: 1, bonuses: bonuses() });

const lookup = buildSocketableLookup(
  [esr('I Rune'), esr('Ko Rune')],
  [lod('El Rune'), lod('Ko Rune')],
  [kanji('Moon Rune'), kanji('El Rune')],
  [gem('Perfect Ruby')]
);

describe('buildSocketableLookup', () => {
  it('indexes every table by name', () => {
    expect(lookup.esrRunes.get('I Rune')?.name).toBe('I Rune');
    expect(lookup.lodRunes.get('El Rune')?.name).toBe('El Rune');
    expect(lookup.kanjiRunes.get('Moon Rune')?.name).toBe('Moon Rune');
    expect(lookup.gems.get('Perfect Ruby')?.name).toBe('Perfect Ruby');
  });
});

describe('resolveRune', () => {
  it('prefers ESR over LoD for non-LoD runewords', () => {
    expect(resolveRune(lookup, 'Ko Rune', false)?.category).toBe('esrRunes');
  });

  it('prefers LoD over ESR for LoD runewords', () => {
    expect(resolveRune(lookup, 'Ko Rune', true)?.category).toBe('lodRunes');
  });

  it('falls back to LoD for non-LoD runewords when ESR has no match', () => {
    expect(resolveRune(lookup, 'El Rune', false)?.category).toBe('lodRunes');
  });

  it('falls back to ESR for LoD runewords when LoD has no match', () => {
    expect(resolveRune(lookup, 'I Rune', true)?.category).toBe('esrRunes');
  });

  it('checks LoD before Kanji', () => {
    expect(resolveRune(lookup, 'El Rune', true)?.category).toBe('lodRunes');
  });

  it('falls back to Kanji last', () => {
    expect(resolveRune(lookup, 'Moon Rune', false)?.category).toBe('kanjiRunes');
    expect(resolveRune(lookup, 'Moon Rune', true)?.category).toBe('kanjiRunes');
  });

  it('returns null for unknown runes', () => {
    expect(resolveRune(lookup, 'Unknown Rune', false)).toBeNull();
    expect(resolveRune(lookup, 'Unknown Rune', true)).toBeNull();
  });
});

describe('aggregateBonusTexts', () => {
  it('concatenates bonus texts per category in order', () => {
    const result = aggregateBonusTexts([bonuses(['a'], ['b'], []), bonuses(['c'], [], ['d'])]);
    expect(result).toEqual({ weaponsGloves: ['a', 'c'], helmsBoots: ['b'], armorShieldsBelts: ['d'] });
  });

  it('returns empty lists for no socketables', () => {
    expect(aggregateBonusTexts([])).toEqual({ weaponsGloves: [], helmsBoots: [], armorShieldsBelts: [] });
  });
});
