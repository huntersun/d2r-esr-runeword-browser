import { describe, expect, it } from 'vitest';
import { asBuildData, isItemRef } from './buildData';

const columnAffixes = { weaponsGloves: ['+1 skills'], helmsBoots: [], armorShieldsBelts: [] };

const unique = {
  type: 'unique',
  id: 7,
  snapshot: { name: 'Harlequin Crest', baseItem: 'Shako', category: 'Helm', reqLevel: 62, properties: ['+2 skills'] },
};
const runeword = {
  type: 'runeword',
  name: 'Enigma',
  variant: 1,
  snapshot: { sockets: 3, runes: ['Jah', 'Ith', 'Ber'], gems: [], allowedItems: ['Armor'], columnAffixes, reqLevel: 65 },
};
const gemword = {
  type: 'gemword',
  name: 'Gemmy',
  variant: 1,
  snapshot: { sockets: 2, gems: ['Ruby'], allowedItems: ['Helm'], columnAffixes, reqLevel: 10 },
};
const freetext = { type: 'freetext', name: 'Rare circlet' };

describe('isItemRef', () => {
  it('accepts every well-formed variant', () => {
    expect([unique, { ...unique, type: 'mythical' }, runeword, gemword, freetext].every(isItemRef)).toBe(true);
  });

  it('rejects refs with a missing or mistyped field the UI dereferences', () => {
    const malformed: unknown[] = [
      null,
      'Shako',
      { type: 'bogus', name: 'x' },
      { type: 'freetext' },
      { ...unique, snapshot: null },
      { ...unique, id: '7' },
      { ...unique, snapshot: { ...unique.snapshot, properties: 'not an array' } },
      { ...unique, snapshot: { ...unique.snapshot, specialProperties: [1] } },
      { ...runeword, snapshot: { ...runeword.snapshot, runes: undefined } },
      { ...runeword, snapshot: { ...runeword.snapshot, columnAffixes: { weaponsGloves: [] } } },
      { ...gemword, variant: 'one' },
    ];
    expect(malformed.filter(isItemRef)).toEqual([]);
  });
});

describe('asBuildData', () => {
  it('returns an empty object for non-object input', () => {
    expect(asBuildData(null)).toEqual({});
    expect(asBuildData([unique])).toEqual({});
    expect(asBuildData('x')).toEqual({});
  });

  it('keeps valid slots and drops malformed ones', () => {
    const data = asBuildData({
      items: { helmet: unique, armor: { type: 'unique', id: 1 }, weapon: 42, gloves: null },
      weaponSwap: 'garbage',
      mercenary: { armor: runeword },
      itemNotes: { helmet: 'socketed', armor: { evil: true } },
      charms: ['Annihilus', 3, null],
      ascendancy: 5,
      skills: 'Blessed Hammer',
    });
    expect(data.items).toEqual({ helmet: unique });
    expect(data.weaponSwap).toBeUndefined();
    expect(data.mercenary).toEqual({ armor: runeword });
    expect(data.itemNotes).toEqual({ helmet: 'socketed' });
    expect(data.charms).toEqual(['Annihilus']);
    expect(data.ascendancy).toBeUndefined();
    expect(data.skills).toBe('Blessed Hammer');
  });
});
