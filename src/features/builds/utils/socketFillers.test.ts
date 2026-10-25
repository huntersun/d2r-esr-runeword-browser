import { describe, expect, it } from 'vitest';
import type { Affix, SocketableBonuses } from '@/core/db';
import { fillerBonusLines, type SocketFillerCatalog } from './socketFillers';

const affix = (rawText: string): Affix => ({ rawText, pattern: rawText, value: null, valueType: 'none' });
const bonuses = (tag: string): SocketableBonuses => ({
  weaponsGloves: [affix(`${tag} weapon`)],
  helmsBoots: [affix(`${tag} helm`)],
  armorShieldsBelts: [affix(`${tag} armor`), affix(`${tag} armor 2`)],
});

const CATALOG: SocketFillerCatalog = {
  esrRunes: [{ name: 'Ko Rune', order: 1, tier: 1, color: 'YELLOW', reqLevel: 1, bonuses: bonuses('esr ko') }],
  lodRunes: [
    { name: 'Ko Rune', order: 18, tier: 2, reqLevel: 39, bonuses: bonuses('lod ko') },
    { name: 'Ber Rune', order: 30, tier: 3, reqLevel: 63, bonuses: bonuses('ber') },
  ],
  kanjiRunes: [{ name: 'Moon Rune', reqLevel: 50, bonuses: bonuses('moon') }],
  gems: [{ name: 'Perfect Ruby', type: 'Ruby', quality: 'Perfect', color: 'RED', reqLevel: 18, bonuses: bonuses('ruby') }],
  crystals: [
    { name: 'Shadow Quartz', type: 'Shadow Quartz', quality: 'Standard', color: 'GREY', reqLevel: 10, bonuses: bonuses('quartz') },
  ],
  uniqueJewels: [],
};

describe('fillerBonusLines', () => {
  it('returns the bonus column of a rune, gem or crystal (case-insensitive, trimmed)', () => {
    expect(fillerBonusLines('Ber Rune', CATALOG, 'weaponsGloves')).toEqual(['ber weapon']);
    expect(fillerBonusLines(' moon rune ', CATALOG, 'helmsBoots')).toEqual(['moon helm']);
    expect(fillerBonusLines('Perfect Ruby', CATALOG, 'armorShieldsBelts')).toEqual(['ruby armor', 'ruby armor 2']);
    expect(fillerBonusLines('Shadow Quartz', CATALOG, 'weaponsGloves')).toEqual(['quartz weapon']);
  });

  it('prefers the ESR rune over a LoD rune of the same name', () => {
    expect(fillerBonusLines('Ko Rune', CATALOG, 'weaponsGloves')).toEqual(['esr ko weapon']);
  });

  it('returns null for unknown names and free text', () => {
    expect(fillerBonusLines('Rainbow Facet', CATALOG, 'weaponsGloves')).toBeNull();
    expect(fillerBonusLines('40/15 IAS jewel', CATALOG, 'weaponsGloves')).toBeNull();
  });
});
