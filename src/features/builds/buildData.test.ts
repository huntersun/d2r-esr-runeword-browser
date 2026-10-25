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
const setItem = {
  type: 'set',
  name: "Tal Rasha's Lidless Eye",
  snapshot: {
    name: "Tal Rasha's Lidless Eye",
    setName: "Tal Rasha's Wrappings",
    setId: "Tal Rasha's Wrappings",
    baseItem: 'Swirling Crystal',
    category: 'Orb',
    reqLevel: 65,
    properties: ['+1 to Sorceress Skill Levels'],
    partial: [{ pieces: 2, lines: ['+10% Faster Cast Rate'] }],
  },
};

describe('isItemRef', () => {
  it('accepts every well-formed variant', () => {
    expect([unique, { ...unique, type: 'mythical' }, runeword, gemword, setItem, freetext].every(isItemRef)).toBe(true);
    expect(isItemRef({ ...setItem, snapshot: { ...setItem.snapshot, partial: [] } })).toBe(true);
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
      { ...setItem, name: undefined },
      { ...setItem, snapshot: null },
      { ...setItem, snapshot: { ...setItem.snapshot, setId: undefined } },
      { ...setItem, snapshot: { ...setItem.snapshot, setName: 3 } },
      { ...setItem, snapshot: { ...setItem.snapshot, reqLevel: '65' } },
      { ...setItem, snapshot: { ...setItem.snapshot, properties: 'x' } },
      { ...setItem, snapshot: { ...setItem.snapshot, partial: undefined } },
      { ...setItem, snapshot: { ...setItem.snapshot, partial: [{ pieces: '2', lines: [] }] } },
      { ...setItem, snapshot: { ...setItem.snapshot, partial: [{ pieces: 2, lines: [1] }] } },
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

/** The spec's "Full build_data Example", extended with a runeword base + fillers and a socketed unique. */
const FULL_EXAMPLE = {
  items: {
    helmet: {
      type: 'unique',
      id: 42,
      snapshot: { name: 'Harlequin Crest', baseItem: 'Shako', category: 'Helm', reqLevel: 62, properties: ['...'] },
      socketed: ['Ber Rune'],
    },
    armor: {
      type: 'runeword',
      name: 'Enigma',
      variant: 1,
      snapshot: { sockets: 3, runes: ['Jah', 'Ith', 'Ber'], gems: [], allowedItems: ['Body Armor'], columnAffixes, reqLevel: 65 },
    },
    weapon: { type: 'unique', id: 105, snapshot: { name: 'Grief', baseItem: 'Phase Blade', properties: ['...'] } },
    gloves: { type: 'freetext', name: '3/20 rare java gloves' },
    ring1: { type: 'unique', id: 210, snapshot: { name: 'Stone of Jordan', baseItem: 'Ring', properties: ['...'] } },
  },
  weaponSwap: {
    shield2: {
      type: 'runeword',
      name: 'Spirit',
      variant: 1,
      snapshot: { sockets: 4, runes: ['Tal', 'Thul', 'Ort', 'Amn'], gems: [], allowedItems: ['Any Shield'], columnAffixes, reqLevel: 25 },
      base: { code: 'uit', name: 'Monarch' },
      socketed: ['Rainbow Facet'],
    },
  },
  mercenary: {
    helmet: { type: 'unique', id: 150, snapshot: { name: "Andariel's Visage", baseItem: 'Demonhead', properties: ['...'] } },
    armor: {
      type: 'runeword',
      name: 'Fortitude',
      variant: 1,
      snapshot: { sockets: 4, runes: ['El', 'Sol', 'Dol', 'Lo'], gems: [], allowedItems: ['Body Armor'], columnAffixes, reqLevel: 59 },
    },
  },
  itemNotes: { helmet: 'Ber socketed' },
  charms: ['Annihilus', 'Hellfire Torch'],
  ascendancy: 'Battlemage',
  skills: '20 Blessed Hammer',
};

describe('asBuildData with author choices', () => {
  it('round-trips the full example (old shape plus base / socketed) unchanged', () => {
    const data = asBuildData(structuredClone(FULL_EXAMPLE));
    expect(data).toEqual({ ...FULL_EXAMPLE, weaponSwapNotes: undefined, mercenaryNotes: undefined });
  });

  it('keeps a pre-choices ref as the very same object', () => {
    const items = { armor: runeword, helmet: unique, gloves: gemword };
    const data = asBuildData({ items });
    expect(data.items?.armor).toBe(runeword);
    expect(data.items?.helmet).toBe(unique);
    expect(data.items?.gloves).toBe(gemword);
  });

  it('drops a malformed base or socketed field but keeps the item', () => {
    const data = asBuildData({
      items: {
        armor: { ...runeword, base: { code: 'xtp' }, socketed: 'Ber Rune' },
        weapon: { ...runeword, base: 'Monarch', socketed: [1, null] },
        shield: { ...runeword, base: { code: '', name: 'Monarch' } },
        helmet: { ...unique, socketed: { 0: 'Ber Rune' } },
        belt: { ...setItem, socketed: ['   '] },
      },
    });
    expect(data.items?.armor).toEqual(runeword);
    expect(data.items?.weapon).toEqual(runeword);
    expect(data.items?.shield).toEqual(runeword);
    expect(data.items?.helmet).toEqual(unique);
    expect(data.items?.belt).toEqual(setItem);
  });

  it('cleans socketed entries: trims, drops blank / non-string / over-long ones, keeps at most six', () => {
    const long = 'x'.repeat(101);
    const data = asBuildData({
      items: {
        armor: { ...runeword, base: { code: ' uit ', name: ' Monarch ' }, socketed: [' Ber Rune ', '', 3, long, 'Ko Rune'] },
        helmet: { ...unique, socketed: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] },
      },
    });
    expect(data.items?.armor).toEqual({ ...runeword, base: { code: 'uit', name: 'Monarch' }, socketed: ['Ber Rune', 'Ko Rune'] });
    expect(data.items?.helmet).toEqual({ ...unique, socketed: ['a', 'b', 'c', 'd', 'e', 'f'] });
  });

  it('keeps base / socketed on mythical and set refs, and ignores them as unknown keys on gemwords and freetext', () => {
    const mythical = { ...unique, type: 'mythical', socketed: ['Perfect Ruby'] };
    const set = { ...setItem, socketed: ['Ist Rune'] };
    const gem = { ...gemword, socketed: 42 };
    const custom = { ...freetext, base: { code: 'cap' } };
    const data = asBuildData({ items: { helmet: mythical, armor: set, gloves: gem, boots: custom } });
    expect(data.items).toEqual({ helmet: mythical, armor: set, gloves: gem, boots: custom });
  });

  it('keeps unknown keys on a ref whose choices were cleaned', () => {
    const data = asBuildData({ items: { armor: { ...runeword, futureField: 1, socketed: ['Ber Rune', ''] } } });
    expect(data.items?.armor).toEqual({ ...runeword, futureField: 1, socketed: ['Ber Rune'] });
  });
});
