import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseGemsHtml } from './gemsParser';
import { parseGemwordsHtml, calculateGemwordReqLevel } from './gemwordsParser';
import type { GemReqLevelLookup } from './runewordsParser';

const gemwordsHtml = readFileSync(resolve(__dirname, '../../../../test-fixtures/gemwords.htm'), 'utf-8');
const gemsHtml = readFileSync(resolve(__dirname, '../../../../test-fixtures/gems.htm'), 'utf-8');

describe('parseGemwordsHtml', () => {
  const gems = parseGemsHtml(gemsHtml);
  const gemReqLevelLookup: GemReqLevelLookup = new Map(gems.map((gem) => [gem.name, gem.reqLevel]));

  it('should parse all gemword rows (approximately 720-750)', () => {
    const gemwords = parseGemwordsHtml(gemwordsHtml, gemReqLevelLookup);

    // ESR 3.2: 8 families x 90 rows (18 Charm-only rows + 72 item rows) + 14 named gemwords
    expect(gemwords.length).toBeGreaterThanOrEqual(720);
    expect(gemwords.length).toBeLessThanOrEqual(750);
  });

  it('parses a one-socket Holy charm gemword (Charm rows are listed separately since ESR 3.2)', () => {
    const gemwords = parseGemwordsHtml(gemwordsHtml, gemReqLevelLookup);
    const holy = gemwords.find((gemword) => gemword.name === 'Holy' && gemword.variant === 1);

    expect(holy).toBeDefined();
    expect(holy?.sockets).toBe(1);
    expect(holy?.reqLevel).toBe(1);
    expect(holy?.gems).toEqual(['Chipped Diamond']);
    expect(holy?.ingredients).toEqual(['Chipped Diamond']);
    expect(holy?.allowedItems).toEqual(['Charm']);
    expect(holy?.affixes.map((affix) => affix.rawText)).toEqual(['5% Chance to Cast Level 5 Magic Surge when Struck']);
    expect(holy?.columnAffixes.weaponsGloves).toEqual([]);
    expect(holy?.columnAffixes.armorShieldsBelts).toEqual([]);
  });

  it('parses a one-socket Holy item gemword with allowed items and per-column bonuses', () => {
    const gemwords = parseGemwordsHtml(gemwordsHtml, gemReqLevelLookup);
    const holy = gemwords.find(
      (gemword) => gemword.name === 'Holy' && gemword.allowedItems.includes('Body Armor') && gemword.gems.join() === 'Chipped Diamond'
    );

    expect(holy).toBeDefined();
    expect(holy?.sockets).toBe(1);
    expect(holy?.reqLevel).toBe(1);
    expect(holy?.allowedItems).toEqual(['Body Armor', 'Any Shield', 'Helm', 'Boots', 'Belt']);
    expect(holy?.columnAffixes.weaponsGloves).toEqual([]);
    expect(holy?.columnAffixes.helmsBoots.map((affix) => affix.rawText)).toEqual([
      '5% Chance to Cast Level 5 Magic Surge when Struck',
      'Sockets cannot be removed',
    ]);
    expect(holy?.columnAffixes.armorShieldsBelts.map((affix) => affix.rawText)).toEqual([
      '5% Chance to Cast Level 5 Magic Surge when Struck',
      'Sockets cannot be removed',
    ]);
  });

  it('keeps only the gemword bonuses, not the random bonus pools or gem bonuses after the <br><br> separator', () => {
    const gemwords = parseGemwordsHtml(gemwordsHtml, gemReqLevelLookup);
    const holy = gemwords.find(
      (gemword) => gemword.name === 'Holy' && gemword.allowedItems.includes('Body Armor') && gemword.gems.join() === 'Chipped Diamond'
    );
    const armorBonuses = holy?.columnAffixes.armorShieldsBelts.map((affix) => affix.rawText);

    // After <br><br> the armor cell lists "1-2 of the following:" random pools, then
    // Chipped Diamond's own bonuses (e.g. "All Resists +5") — neither is the gemword's
    expect(holy?.affixes.map((affix) => affix.rawText)).toEqual([
      '5% Chance to Cast Level 5 Magic Surge when Struck',
      'Sockets cannot be removed',
    ]);
    expect(armorBonuses).not.toContain('1-2 of the following:');
    expect(armorBonuses).not.toContain('+(20 to 30) Defense');
    expect(armorBonuses).not.toContain('All Resists +5');
  });

  it('captures the jewel requirement for recipes that need one', () => {
    const gemwords = parseGemwordsHtml(gemwordsHtml, gemReqLevelLookup);
    const america = gemwords.find((gemword) => gemword.name === 'America');

    expect(america).toBeDefined();
    expect(america?.sockets).toBe(4);
    expect(america?.gems).toEqual(['Perfect Sapphire', 'Perfect Ruby', 'Perfect Diamond']);
    expect(america?.jewelInfo).toBe('Jewel');

    const withJewel = gemwords.filter((gemword) => gemword.jewelInfo !== undefined);
    expect(withJewel.map((gemword) => gemword.name).sort()).toEqual(['America', 'Canada', 'China']);
  });

  it('skips rows that repeat an earlier row verbatim (America is listed twice since ESR 3.2)', () => {
    const gemwords = parseGemwordsHtml(gemwordsHtml, gemReqLevelLookup);

    expect(gemwords.filter((gemword) => gemword.name === 'America')).toHaveLength(1);
  });

  it('assigns unique (name, variant) pairs — favourite ids depend on this', () => {
    const gemwords = parseGemwordsHtml(gemwordsHtml, gemReqLevelLookup);
    const keys = gemwords.map((gemword) => `${gemword.name}:${String(gemword.variant)}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps gemword variants separate by name', () => {
    const gemwords = parseGemwordsHtml(gemwordsHtml, gemReqLevelLookup);
    const holyVariants = gemwords.filter((gemword) => gemword.name === 'Holy');

    expect(holyVariants.length).toBeGreaterThan(20);
    expect(holyVariants.slice(0, 6).map((gemword) => gemword.variant)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('only accepts known gem names as ingredients', () => {
    const gemwords = parseGemwordsHtml(gemwordsHtml, gemReqLevelLookup);
    const gemNames = new Set(gems.map((gem) => gem.name));

    for (const gemword of gemwords) {
      expect(gemword.gems.length).toBeGreaterThan(0);
      for (const gemName of gemword.gems) {
        expect(gemNames.has(gemName), `${gemword.name} ingredient "${gemName}" should be a known gem`).toBe(true);
      }
    }
  });

  it('calculates required level from the highest required gem', () => {
    expect(calculateGemwordReqLevel(['Chipped Diamond'], gemReqLevelLookup)).toBe(1);
    expect(calculateGemwordReqLevel(['Perfect Diamond', 'Flawed Diamond'], gemReqLevelLookup)).toBe(35);
  });
});
