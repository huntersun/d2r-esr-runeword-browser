import { describe, expect, it } from 'vitest';
import type { Crystal, EsrRune, Gem, KanjiRune, LodRune, SocketableBonuses } from '@/core/db';
import { findCardRecord, findCardRecords, findSocketable, pickCardVariants, type SocketableTables } from './cardRecord';

const bonuses: SocketableBonuses = { weaponsGloves: [], helmsBoots: [], armorShieldsBelts: [] };

function tables(overrides: Partial<SocketableTables> = {}): SocketableTables {
  return { gems: [], esrRunes: [], lodRunes: [], kanjiRunes: [], crystals: [], ...overrides };
}

describe('findCardRecords / findCardRecord', () => {
  const records = [{ name: 'Stealth' }, { name: "Artemis' Wrath" }, { name: 'Pelta  Lunata' }, { name: 'stealth' }];

  it('matches case-insensitively and keeps input order', () => {
    expect(findCardRecords(records, 'STEALTH')).toEqual([{ name: 'Stealth' }, { name: 'stealth' }]);
  });

  it('unifies quotes, dashes and whitespace', () => {
    expect(findCardRecord(records, 'Artemis’ Wrath')).toEqual({ name: "Artemis' Wrath" });
    expect(findCardRecord(records, ' pelta lunata ')).toEqual({ name: 'Pelta  Lunata' });
  });

  it('never matches a substring', () => {
    expect(findCardRecords(records, 'Stealt')).toEqual([]);
    expect(findCardRecord(records, 'Pelta')).toBeNull();
  });
});

describe('pickCardVariants', () => {
  const rw = (name: string, variant: number) => ({ name, variant });

  it('returns all variants sorted when there are at most two', () => {
    expect(pickCardVariants([rw('Spirit', 2), rw('Other', 1), rw('Spirit', 1)], 'spirit')).toEqual([rw('Spirit', 1), rw('Spirit', 2)]);
  });

  it('returns only the first variant when there are more than two', () => {
    expect(pickCardVariants([rw('Fury', 3), rw('Fury', 1), rw('Fury', 2)], 'Fury')).toEqual([rw('Fury', 1)]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(pickCardVariants([rw('Fury', 1)], 'Spirit')).toEqual([]);
  });
});

describe('findSocketable', () => {
  const gem: Gem = { name: 'Perfect Ruby', type: 'Ruby', quality: 'Perfect', color: 'red', reqLevel: 18, bonuses };
  const esrRune: EsrRune = { name: 'I Rune', order: 1, tier: 1, color: 'white', reqLevel: 5, points: 2, bonuses };
  const lodRune: LodRune = { name: 'El Rune', order: 1, tier: 1, reqLevel: 11, points: 1, bonuses };
  const kanji: KanjiRune = { name: 'Moon Rune', reqLevel: 40, bonuses };
  const crystal: Crystal = {
    name: 'Standard Shadow Quartz',
    type: 'Shadow Quartz',
    quality: 'Standard',
    color: 'gray',
    reqLevel: 30,
    bonuses,
  };

  it('finds each category and shapes it like the socketables screen', () => {
    const all = tables({ gems: [gem], esrRunes: [esrRune], lodRunes: [lodRune], kanjiRunes: [kanji], crystals: [crystal] });
    expect(findSocketable(all, 'perfect ruby')).toMatchObject({ name: 'Perfect Ruby', category: 'gems', color: 'red', quality: 'Perfect' });
    expect(findSocketable(all, 'i rune')).toMatchObject({ name: 'I Rune', category: 'esrRunes', points: 2 });
    expect(findSocketable(all, 'El Rune')).toMatchObject({ name: 'El Rune', category: 'lodRunes', color: null, points: 1 });
    expect(findSocketable(all, 'Moon Rune')).toMatchObject({ category: 'kanjiRunes', color: null, reqLevel: 40 });
    expect(findSocketable(all, 'standard shadow quartz')).toMatchObject({ category: 'crystals', quality: 'Standard' });
  });

  it('prefers the earlier table on a name clash', () => {
    const clash = { ...lodRune, name: 'Perfect Ruby' };
    expect(findSocketable(tables({ gems: [gem], lodRunes: [clash] }), 'Perfect Ruby')?.category).toBe('gems');
  });

  it('returns null when no table has the name', () => {
    expect(findSocketable(tables({ gems: [gem] }), 'Zod Rune')).toBeNull();
  });
});
