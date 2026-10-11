import { buildPickerOptions, EMPTY_LOOKUP } from './lookup';
import { TEST_DATA, TEST_LOOKUP, TEST_TYPES } from './testLookup.mock';

describe('buildLookup', () => {
  it('names codes and ids, tolerating unknown keys', () => {
    expect(TEST_LOOKUP.itemName('r33')).toBe('Zod Rune');
    expect(TEST_LOOKUP.itemName('nope')).toBeUndefined();
    expect(TEST_LOOKUP.typeName('axe')).toBe('Axe');
    expect(TEST_LOOKUP.statName(194)).toBe('item_numsockets');
    expect(TEST_LOOKUP.statName('strength')).toBe('strength');
    expect(TEST_LOOKUP.statName('nope')).toBeUndefined();
    expect(TEST_LOOKUP.statName(300)).toBeUndefined();
    expect(TEST_LOOKUP.statId('item_numsockets')).toBe(194);
    expect(TEST_LOOKUP.statId(0)).toBe(0);
    expect(TEST_LOOKUP.areaName(40)).toBe('Lut Gholein');
    expect(TEST_LOOKUP.uniqueOrSetName(0)).toBe('The Gnasher');
    expect(TEST_LOOKUP.uniqueOrSetName(5)).toBe("Harlequin Crest / Civerb's Ward");
    expect(TEST_LOOKUP.uniqueOrSetName(9)).toBeUndefined();
  });

  it('has an empty variant that knows nothing', () => {
    expect(EMPTY_LOOKUP.itemName('r33')).toBeUndefined();
    expect(EMPTY_LOOKUP.uniqueOrSetName(5)).toBeUndefined();
  });
});

describe('buildPickerOptions', () => {
  const options = buildPickerOptions(TEST_DATA, TEST_TYPES);

  it('marks non-spawnable items as shadow bases', () => {
    expect(options.items.find((option) => option.value === 'xyz')).toMatchObject({ muted: true, hint: 'shadow base' });
    expect(options.items.find((option) => option.value === 'hax')).toMatchObject({ muted: false, hint: undefined });
  });

  it('lists type parents by name', () => {
    expect(options.types.find((option) => option.value === 'rune')?.detail).toBe('rune · in Miscellaneous');
  });

  it('drops nameless stats and groups areas by act', () => {
    expect(options.stats.map((option) => option.value)).toEqual(['strength', 'item_numsockets']);
    expect(options.areas.map((option) => [option.value, option.group])).toEqual([
      ['1', 'Act 1'],
      ['2', 'Act 1'],
      ['40', 'Act 2'],
    ]);
  });

  it('keeps uniques and sets apart even when they share an id', () => {
    const fives = options.uniquesAndSets.filter((option) => option.value === '5');
    expect(fives.map((option) => [option.key, option.group, option.detail])).toEqual([
      ['Unique:5', 'Uniques', 'uap · 5'],
      ['Set:5', 'Sets', 'lrg · 5'],
    ]);
  });
});
