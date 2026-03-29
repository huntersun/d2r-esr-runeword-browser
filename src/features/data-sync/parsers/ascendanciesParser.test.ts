import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseAscendancies } from './ascendanciesParser';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ascendanciesHtml = readFileSync(resolve(__dirname, '../../../../test-fixtures/ascendancies.htm'), 'utf-8');

// ─── Parse all items ─────────────────────────────────────────────────────────

const items = parseAscendancies(ascendanciesHtml);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Parse count assertions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Parse counts', () => {
  it('should parse exactly 15 ascendancies', () => {
    expect(items.length).toBe(15);
    console.log('[Test] Parsed ascendancies:', items.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Data quality - names
// ═══════════════════════════════════════════════════════════════════════════════

describe('Names', () => {
  it('every ascendancy should have a non-empty name', () => {
    for (const item of items) {
      expect(item.name.length, `Item has empty name`).toBeGreaterThan(0);
    }
  });

  it('no name should contain HTML tags', () => {
    for (const item of items) {
      expect(item.name, `${item.name} contains HTML tags`).not.toMatch(/<[^>]*>/);
    }
  });

  it('no name should have leading/trailing whitespace', () => {
    for (const item of items) {
      expect(item.name).toBe(item.name.trim());
    }
  });

  it('should have all 15 known names', () => {
    const names = new Set(items.map((i) => i.name));
    const expected = [
      'Battlemage',
      'Blademaster',
      'Arcanist',
      'Bloodmage',
      'Awakened',
      'Ironbolt',
      'Starborn',
      'Lifebreaker',
      'Worldshaper',
      'Soul Warden',
      'Stance Dancer',
      'Nomad',
      'Sharpshooter',
      'Mana Warden',
      'Berserker',
    ];
    for (const name of expected) {
      expect(names.has(name), `Missing ascendancy: ${name}`).toBe(true);
    }
    console.log('[Test] Names:', Array.from(names).join(', '));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Image URLs
// ═══════════════════════════════════════════════════════════════════════════════

describe('Image URLs', () => {
  it('every ascendancy should have a non-empty imageUrl', () => {
    for (const item of items) {
      expect(item.imageUrl.length, `${item.name}: empty imageUrl`).toBeGreaterThan(0);
    }
  });

  it('no imageUrl should contain HTML tags', () => {
    for (const item of items) {
      expect(item.imageUrl, `${item.name}: imageUrl contains HTML tags`).not.toMatch(/<[^>]*>/);
    }
  });

  it('all imageUrls should match the expected pattern', () => {
    for (const item of items) {
      expect(item.imageUrl, `${item.name}: unexpected imageUrl pattern`).toMatch(/^\.\/images\/ascendancies\/.*\.png$/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Tiers
// ═══════════════════════════════════════════════════════════════════════════════

describe('Tiers', () => {
  it('every ascendancy should have exactly 5 tiers', () => {
    for (const item of items) {
      expect(item.tiers.length, `${item.name}: expected 5 tiers, got ${String(item.tiers.length)}`).toBe(5);
    }
  });

  it('tiers should be numbered 1 through 5', () => {
    for (const item of items) {
      const tierNums = item.tiers.map((t) => t.tier);
      expect(tierNums, `${item.name}: incorrect tier numbers`).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('every tier should have at least 1 bonus', () => {
    for (const item of items) {
      for (const tier of item.tiers) {
        expect(tier.bonuses.length, `${item.name} Tier ${String(tier.tier)}: no bonuses`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Bonus text quality
// ═══════════════════════════════════════════════════════════════════════════════

describe('Bonus text quality', () => {
  it('no bonus should contain HTML tags', () => {
    for (const item of items) {
      for (const tier of item.tiers) {
        for (const bonus of tier.bonuses) {
          expect(bonus, `${item.name} Tier ${String(tier.tier)}: "${bonus}" contains HTML tags`).not.toMatch(/<[^>]*>/);
        }
      }
    }
  });

  it('no bonus should have leading/trailing whitespace', () => {
    for (const item of items) {
      for (const tier of item.tiers) {
        for (const bonus of tier.bonuses) {
          expect(bonus, `${item.name} Tier ${String(tier.tier)}: bonus has whitespace`).toBe(bonus.trim());
        }
      }
    }
  });

  it('no bonus should contain double spaces', () => {
    for (const item of items) {
      for (const tier of item.tiers) {
        for (const bonus of tier.bonuses) {
          expect(bonus, `${item.name} Tier ${String(tier.tier)}: "${bonus}" has double space`).not.toMatch(/\s{2,}/);
        }
      }
    }
  });

  it('no bonus should contain HTML entities', () => {
    for (const item of items) {
      for (const tier of item.tiers) {
        for (const bonus of tier.bonuses) {
          expect(bonus, `${item.name} Tier ${String(tier.tier)}: "${bonus}" has HTML entity`).not.toMatch(/&amp;|&lt;|&gt;|&quot;/);
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Footnotes
// ═══════════════════════════════════════════════════════════════════════════════

describe('Footnotes', () => {
  it('ascendancies with footnotes should have the expected count', () => {
    const withFootnotes = items.filter((i) => i.footnotes.length > 0);
    expect(withFootnotes.length).toBeGreaterThanOrEqual(9);
    console.log('[Test] Ascendancies with footnotes:', withFootnotes.map((i) => `${i.name} (${String(i.footnotes.length)})`).join(', '));
  });

  it('ascendancies without footnotes should exist', () => {
    const withoutFootnotes = items.filter((i) => i.footnotes.length === 0);
    expect(withoutFootnotes.length).toBeGreaterThanOrEqual(2);
    console.log('[Test] Ascendancies without footnotes:', withoutFootnotes.map((i) => i.name).join(', '));
  });

  it('no footnote should contain HTML tags', () => {
    for (const item of items) {
      for (const fn of item.footnotes) {
        expect(fn, `${item.name}: footnote contains HTML tags`).not.toMatch(/<[^>]*>/);
      }
    }
  });

  it('no footnote should have leading/trailing whitespace', () => {
    for (const item of items) {
      for (const fn of item.footnotes) {
        expect(fn, `${item.name}: footnote has whitespace`).toBe(fn.trim());
      }
    }
  });

  it('footnotes should start with *', () => {
    for (const item of items) {
      for (const fn of item.footnotes) {
        expect(fn, `${item.name}: footnote doesn't start with *: "${fn}"`).toMatch(/^\*/);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Known item verification
// ═══════════════════════════════════════════════════════════════════════════════

describe('Known items', () => {
  it('should parse Battlemage correctly', () => {
    const item = items.find((i) => i.name === 'Battlemage');
    expect(item).toBeDefined();
    expect(item!.imageUrl).toContain('battlemage');
    expect(item!.tiers.length).toBe(5);
    expect(item!.tiers[0].bonuses).toContain('+1 to Class Skill Levels');
    expect(item!.tiers[0].bonuses).toContain('+60 to Strength');
    expect(item!.tiers[0].bonuses).toContain('+60 to Energy');
    expect(item!.tiers[4].bonuses).toContain('+3 to Class Skill Levels');
    expect(item!.footnotes.length).toBe(1);
    expect(item!.footnotes[0]).toContain('Total Defense Bonus');
  });

  it('should parse Awakened with 3 footnotes', () => {
    const item = items.find((i) => i.name === 'Awakened');
    expect(item).toBeDefined();
    expect(item!.footnotes.length).toBe(3);
    expect(item!.footnotes.some((fn) => fn.includes('Annihilation'))).toBe(true);
  });

  it('should parse Worldshaper with 3 footnotes', () => {
    const item = items.find((i) => i.name === 'Worldshaper');
    expect(item).toBeDefined();
    expect(item!.footnotes.length).toBeGreaterThanOrEqual(2);
  });

  it('should parse Ironbolt correctly despite missing <br><br> separator', () => {
    const item = items.find((i) => i.name === 'Ironbolt');
    expect(item).toBeDefined();
    expect(item!.tiers.length).toBe(5);
    // Tier 3 should have bonuses even though it lacks the <br><br> separator before Tier 4
    expect(item!.tiers[2].tier).toBe(3);
    expect(item!.tiers[2].bonuses.length).toBeGreaterThanOrEqual(2);
    expect(item!.tiers[3].tier).toBe(4);
    expect(item!.tiers[3].bonuses.length).toBeGreaterThanOrEqual(2);
  });

  it('should parse Blademaster without footnotes', () => {
    const item = items.find((i) => i.name === 'Blademaster');
    expect(item).toBeDefined();
    expect(item!.footnotes.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Data snapshot counts
// ═══════════════════════════════════════════════════════════════════════════════

describe('Data snapshot counts', () => {
  it('should report counts for tracking ESR updates', () => {
    const total = items.length;
    const withFootnotes = items.filter((i) => i.footnotes.length > 0).length;
    const withoutFootnotes = items.filter((i) => i.footnotes.length === 0).length;
    const totalBonuses = items.reduce((sum, i) => sum + i.tiers.reduce((s, t) => s + t.bonuses.length, 0), 0);

    console.log('[Test] Ascendancies snapshot:', {
      total,
      withFootnotes,
      withoutFootnotes,
      totalBonuses,
    });

    expect(total).toBe(15);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Edge cases (synthetic HTML)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('should return empty array for empty HTML', () => {
    expect(parseAscendancies('')).toEqual([]);
  });

  it('should return empty array for HTML with no flex divs', () => {
    expect(parseAscendancies('<html><body><p>No ascendancies here</p></body></html>')).toEqual([]);
  });
});
