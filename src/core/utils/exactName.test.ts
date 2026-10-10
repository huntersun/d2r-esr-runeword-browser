import { describe, expect, it } from 'vitest';
import { matchesExactName, normalizeItemName, parseExactNameParam } from './exactName';

describe('normalizeItemName', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalizeItemName('  Breath  of the   Dying ')).toBe('breath of the dying');
  });

  it('straightens typographic apostrophes and quotes', () => {
    expect(normalizeItemName('Artemis’ Wrath')).toBe("artemis' wrath");
    expect(normalizeItemName('“Quoted”')).toBe('"quoted"');
  });
});

describe('parseExactNameParam', () => {
  it('returns null when the param is absent or blank', () => {
    expect(parseExactNameParam(null)).toBeNull();
    expect(parseExactNameParam('')).toBeNull();
    expect(parseExactNameParam('   ')).toBeNull();
  });

  it('returns the trimmed name', () => {
    expect(parseExactNameParam(' Strength ')).toBe('Strength');
    expect(parseExactNameParam(new URLSearchParams('name=Breath%20of%20the%20Dying').get('name'))).toBe('Breath of the Dying');
  });
});

describe('matchesExactName', () => {
  it('matches everything when no exact name is set', () => {
    expect(matchesExactName('Enigma', null)).toBe(true);
  });

  it('matches the whole name case-insensitively', () => {
    expect(matchesExactName('Strength', 'strength')).toBe(true);
    expect(matchesExactName('STRENGTH', 'Strength')).toBe(true);
  });

  it('does not match partial names', () => {
    expect(matchesExactName('Strength of Will', 'Strength')).toBe(false);
    expect(matchesExactName('Strength', 'Strength of Will')).toBe(false);
  });

  it('treats curly and straight apostrophes alike', () => {
    expect(matchesExactName('Artemis’ Wrath', "Artemis' Wrath")).toBe(true);
    expect(matchesExactName("Artemis' Wrath", 'artemis’ wrath')).toBe(true);
  });
});
