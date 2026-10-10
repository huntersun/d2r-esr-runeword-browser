import { describe, expect, it } from 'vitest';
import { applyExactNameFocus, matchesExactName, parseExactNameParam } from './exactName';

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

describe('applyExactNameFocus', () => {
  const items = [{ name: 'Strength' }, { name: 'Steel' }, { name: 'strength' }];
  const onlySteel = (list: readonly { name: string }[]) => list.filter((item) => item.name === 'Steel');

  it('applies the other filters when no name is set', () => {
    expect(applyExactNameFocus(items, null, onlySteel)).toEqual([{ name: 'Steel' }]);
  });

  it('returns every item with the name and ignores the other filters', () => {
    expect(applyExactNameFocus(items, 'STRENGTH', onlySteel)).toEqual([{ name: 'Strength' }, { name: 'strength' }]);
  });
});
