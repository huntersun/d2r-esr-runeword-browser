import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { isKanjiRuneName, parseKanjiRunesHtml } from './kanjiRunesParser';

describe('isKanjiRuneName', () => {
  it('should return true for rune names in a non-tier color (#EED68D since ESR 3.2, BLUE before)', () => {
    expect(isKanjiRuneName('Moon Rune', '#EED68D')).toBe(true);
    expect(isKanjiRuneName('Fire Rune', '#eed68d')).toBe(true);
    expect(isKanjiRuneName('Water Rune', 'BLUE')).toBe(true);
  });

  it('should return false for ESR tier colors and uncolored (LoD) runes', () => {
    expect(isKanjiRuneName('Moon Rune', 'WHITE')).toBe(false);
    expect(isKanjiRuneName('Fire Rune', 'RED')).toBe(false);
    expect(isKanjiRuneName('Su Rune', 'PURPLE')).toBe(false);
    expect(isKanjiRuneName('Water Rune', null)).toBe(false);
  });

  it('should return false for names without " Rune" suffix', () => {
    expect(isKanjiRuneName('Moon', '#EED68D')).toBe(false);
    // Skull gems share the Kanji color since ESR 3.2
    expect(isKanjiRuneName('Chipped Skull', '#EED68D')).toBe(false);
  });
});

describe('parseKanjiRunesHtml integration', () => {
  const html = readFileSync(resolve(__dirname, '../../../../test-fixtures/gems.htm'), 'utf-8');

  it('should parse all 14 Kanji runes', () => {
    const kanjiRunes = parseKanjiRunesHtml(html);
    expect(kanjiRunes.map((r) => r.name)).toEqual([
      'Moon Rune',
      'Fire Rune',
      'Water Rune',
      'Wood Rune',
      'Metal Rune',
      'Earth Rune',
      'Sun Rune',
      'Thunder Rune',
      'Wind Rune',
      'Dragon Rune',
      'Life Rune',
      'Death Rune',
      'Heaven Rune',
      'God Rune',
    ]);
  });

  it('should have all runes at level 60', () => {
    const kanjiRunes = parseKanjiRunesHtml(html);

    for (const rune of kanjiRunes) {
      expect(rune.reqLevel).toBe(60);
    }
  });

  it('should parse Moon Rune correctly', () => {
    const kanjiRunes = parseKanjiRunesHtml(html);
    const moonRune = kanjiRunes.find((r) => r.name === 'Moon Rune');

    expect(moonRune).toBeDefined();
    expect(moonRune!.reqLevel).toBe(60);
    expect(moonRune!.bonuses.weaponsGloves.length).toBeGreaterThan(0);
  });

  it('should parse Fire Rune correctly', () => {
    const kanjiRunes = parseKanjiRunesHtml(html);
    const fireRune = kanjiRunes.find((r) => r.name === 'Fire Rune');

    expect(fireRune).toBeDefined();
    expect(fireRune!.reqLevel).toBe(60);
  });

  it('should not include ESR runes', () => {
    const kanjiRunes = parseKanjiRunesHtml(html);

    expect(kanjiRunes.find((r) => r.name === 'I Rune')).toBeUndefined();
    expect(kanjiRunes.find((r) => r.name === 'Null Rune')).toBeUndefined();
  });

  it('should not include LoD runes', () => {
    const kanjiRunes = parseKanjiRunesHtml(html);

    expect(kanjiRunes.find((r) => r.name === 'El Rune')).toBeUndefined();
    expect(kanjiRunes.find((r) => r.name === 'Zod Rune')).toBeUndefined();
  });

  it('should parse bonuses for all Kanji runes', () => {
    const kanjiRunes = parseKanjiRunesHtml(html);

    for (const rune of kanjiRunes) {
      expect(rune.bonuses.weaponsGloves.length).toBeGreaterThan(0);
      expect(rune.bonuses.helmsBoots.length).toBeGreaterThan(0);
      expect(rune.bonuses.armorShieldsBelts.length).toBeGreaterThan(0);
    }
  });
});
