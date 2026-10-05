import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseMythicalUniques } from './mythicalUniquesParser';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mythicalsHtml = readFileSync(resolve(__dirname, '../../../../test-fixtures/unique_mythicals.htm'), 'utf-8');

// ─── Parse all items ─────────────────────────────────────────────────────────

const items = parseMythicalUniques(mythicalsHtml);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Parse count assertions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Parse counts', () => {
  it('should parse a significant number of mythical uniques', () => {
    expect(items.length).toBeGreaterThanOrEqual(30);
    console.log('[Test] Parsed mythical uniques:', items.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Data quality - names
// ═══════════════════════════════════════════════════════════════════════════════

describe('Item names', () => {
  it('every item should have a non-empty name', () => {
    for (const item of items) {
      expect(item.name.length, `Item at index has empty name`).toBeGreaterThan(0);
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
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Categories
// ═══════════════════════════════════════════════════════════════════════════════

describe('Categories', () => {
  it('every item should have a non-empty category', () => {
    for (const item of items) {
      expect(item.category.length, `${item.name}: empty category`).toBeGreaterThan(0);
    }
  });

  it('should have all 4 expected categories', () => {
    const categories = new Set(items.map((i) => i.category));
    expect(categories.has('Mythical Unique Weapons')).toBe(true);
    expect(categories.has('Mythical Unique Armor')).toBe(true);
    expect(categories.has('Mythical Unique Jewelry')).toBe(true);
    expect(categories.has('Dedicated Drops Mythical Uniques')).toBe(true);
    console.log('[Test] Categories:', Array.from(categories).sort().join(', '));
  });

  it('should have weapons as the largest category', () => {
    const weapons = items.filter((i) => i.category === 'Mythical Unique Weapons');
    expect(weapons.length).toBeGreaterThanOrEqual(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Level data
// ═══════════════════════════════════════════════════════════════════════════════

describe('Level data', () => {
  it('every item should have reqLevel >= 0', () => {
    for (const item of items) {
      expect(item.reqLevel, `${item.name}: reqLevel`).toBeGreaterThanOrEqual(0);
    }
  });

  it('every item should have itemLevel >= 0', () => {
    for (const item of items) {
      expect(item.itemLevel, `${item.name}: itemLevel`).toBeGreaterThanOrEqual(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Properties quality
// ═══════════════════════════════════════════════════════════════════════════════

describe('Properties', () => {
  it('most items should have at least one property', () => {
    const withProps = items.filter((item) => item.properties.length > 0 || item.specialProperties.length > 0);
    expect(withProps.length / items.length).toBeGreaterThan(0.9);
  });

  it('no property should contain HTML tags', () => {
    for (const item of items) {
      for (const prop of [...item.properties, ...item.specialProperties]) {
        expect(prop, `${item.name}: property contains HTML tags`).not.toMatch(/<[^>]*>/);
      }
    }
  });

  it('no property should have leading/trailing whitespace', () => {
    for (const item of items) {
      for (const prop of [...item.properties, ...item.specialProperties]) {
        expect(prop, `${item.name}: property has whitespace`).toBe(prop.trim());
      }
    }
  });

  it('no property should contain double spaces', () => {
    for (const item of items) {
      for (const prop of [...item.properties, ...item.specialProperties]) {
        expect(prop, `${item.name}: "${prop}" has double space`).not.toMatch(/\s{2,}/);
      }
    }
  });

  it('no property should contain HTML entities', () => {
    for (const item of items) {
      for (const prop of [...item.properties, ...item.specialProperties]) {
        expect(prop, `${item.name}: "${prop}" has HTML entity`).not.toMatch(/&amp;|&lt;|&gt;|&quot;/);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Special properties (orange text)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Special properties', () => {
  it('should detect some items with special properties', () => {
    const withSpecial = items.filter((item) => item.specialProperties.length > 0);
    expect(withSpecial.length).toBeGreaterThan(0);
    console.log('[Test] Items with special properties:', withSpecial.length);
  });

  it('special properties should not contain HTML tags', () => {
    for (const item of items) {
      for (const prop of item.specialProperties) {
        expect(prop, `${item.name}: special property contains HTML tags`).not.toMatch(/<[^>]*>/);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: Notes
// ═══════════════════════════════════════════════════════════════════════════════

describe('Notes', () => {
  it('should detect some items with notes', () => {
    const withNotes = items.filter((item) => item.notes.length > 0);
    expect(withNotes.length).toBeGreaterThan(0);
    console.log('[Test] Items with notes:', withNotes.length);
  });

  it('no note should contain HTML tags', () => {
    for (const item of items) {
      for (const note of item.notes) {
        expect(note, `${item.name}: note contains HTML tags`).not.toMatch(/<[^>]*>/);
      }
    }
  });

  it('no note should have leading/trailing whitespace', () => {
    for (const item of items) {
      for (const note of item.notes) {
        expect(note, `${item.name}: note has whitespace`).toBe(note.trim());
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Base items
// ═══════════════════════════════════════════════════════════════════════════════

describe('Base items', () => {
  it('every item should have a non-empty baseItem', () => {
    for (const item of items) {
      expect(item.baseItem.length, `${item.name}: empty baseItem`).toBeGreaterThan(0);
    }
  });

  it('no baseItem should contain HTML tags', () => {
    for (const item of items) {
      expect(item.baseItem, `${item.name}: baseItem contains HTML tags`).not.toMatch(/<[^>]*>/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Images
// ═══════════════════════════════════════════════════════════════════════════════

describe('Images', () => {
  it('should detect some items with images', () => {
    const withImages = items.filter((item) => item.imageUrl.length > 0);
    expect(withImages.length).toBeGreaterThan(0);
    console.log('[Test] Items with images:', withImages.length);
  });

  it('image URLs should not contain HTML tags', () => {
    for (const item of items) {
      if (item.imageUrl) {
        expect(item.imageUrl, `${item.name}: imageUrl contains HTML tags`).not.toMatch(/<[^>]*>/);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Known item verification
// ═══════════════════════════════════════════════════════════════════════════════

describe('Known items', () => {
  it("should parse Mephisto's Will (first weapon)", () => {
    const item = items.find((i) => i.name === "Mephisto's Will");
    expect(item).toBeDefined();
    expect(item!.baseItem).toBe('Mythical Demonic Wand');
    expect(item!.baseItemLink).toBe('weapons.htm#m04');
    expect(item!.category).toBe('Mythical Unique Weapons');
    expect(item!.itemLevel).toBe(100);
    expect(item!.reqLevel).toBe(90);
    expect(item!.properties.length).toBeGreaterThan(0);
    expect(item!.specialProperties.length).toBeGreaterThan(0);
    expect(item!.imageUrl).toBe('./images/mythical-uniques/mephistos_will.png');
  });

  it('should parse Headhunter (armor with notes)', () => {
    const item = items.find((i) => i.name === 'Headhunter');
    expect(item).toBeDefined();
    expect(item!.category).toBe('Mythical Unique Armor');
    expect(item!.baseItem).toBe('Mythical Hemp Band');
    expect(item!.baseItemLink).toBe('armors.htm#m10');
    expect(item!.notes.length).toBeGreaterThan(0);
    expect(item!.imageUrl).toContain('headhunter');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: Data snapshot counts
// ═══════════════════════════════════════════════════════════════════════════════

describe('Data snapshot counts', () => {
  it('should report counts for tracking ESR updates', () => {
    const total = items.length;
    const weapons = items.filter((i) => i.category === 'Mythical Unique Weapons').length;
    const armor = items.filter((i) => i.category === 'Mythical Unique Armor').length;
    const jewelry = items.filter((i) => i.category === 'Mythical Unique Jewelry').length;
    const dedicated = items.filter((i) => i.category === 'Dedicated Drops Mythical Uniques').length;
    const withSpecial = items.filter((i) => i.specialProperties.length > 0).length;
    const withNotes = items.filter((i) => i.notes.length > 0).length;
    const withImages = items.filter((i) => i.imageUrl.length > 0).length;

    console.log('[Test] Mythical Uniques snapshot:', {
      total,
      weapons,
      armor,
      jewelry,
      dedicated,
      withSpecial,
      withNotes,
      withImages,
    });

    expect(total).toBeGreaterThanOrEqual(30);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: Edge cases (synthetic HTML)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('should return empty array for empty HTML', () => {
    expect(parseMythicalUniques('')).toEqual([]);
  });

  it('should return empty array for HTML with no tables', () => {
    expect(parseMythicalUniques('<html><body><p>No tables here</p></body></html>')).toEqual([]);
  });

  it('should skip rows with fewer than 4 cells', () => {
    const html = `
      <table>
        <tr><td colspan="4" bgcolor="#402040"><b>TestCategory</b></td></tr>
        <tr><td>Name</td><td>Stats</td><td>Properties</td><td>Notes</td></tr>
        <tr><td>Only one cell</td></tr>
        <tr>
          <td><b>Valid Item<br><a href="test.htm#t1">Mythical Test</a></b></td>
          <td>Item Level: 100<br>Required Level: 90</td>
          <td><font color=4850B8>+1 to All Skills</font></td>
          <td>A note</td>
        </tr>
      </table>`;
    const result = parseMythicalUniques(html);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid Item');
    expect(result[0].baseItem).toBe('Mythical Test');
    expect(result[0].baseItemLink).toBe('test.htm#t1');
    expect(result[0].notes).toEqual(['A note']);
  });

  it('should skip rows where name cell has no <b> tag', () => {
    const html = `
      <table>
        <tr><td colspan="4" bgcolor="#402040"><b>TestCategory</b></td></tr>
        <tr><td>Name</td><td>Stats</td><td>Properties</td><td>Notes</td></tr>
        <tr><td>No bold tag here</td><td>Item Level: 1</td><td>+1 to Life</td><td></td></tr>
      </table>`;
    const result = parseMythicalUniques(html);
    expect(result).toHaveLength(0);
  });

  it('should default levels to 0 for non-numeric values', () => {
    const html = `
      <table>
        <tr><td colspan="4" bgcolor="#402040"><b>TestCategory</b></td></tr>
        <tr><td>Name</td><td>Stats</td><td>Properties</td><td>Notes</td></tr>
        <tr>
          <td><b>Test Item<br><a href="t.htm">Base</a></b></td>
          <td>Item Level: N/A<br>Required Level: ???</td>
          <td>+1 to All Skills</td>
          <td></td>
        </tr>
      </table>`;
    const result = parseMythicalUniques(html);
    expect(result).toHaveLength(1);
    expect(result[0].itemLevel).toBe(0);
    expect(result[0].reqLevel).toBe(0);
  });

  it('should correctly classify orange properties as special', () => {
    const html = `
      <table>
        <tr><td colspan="4" bgcolor="#402040"><b>TestCategory</b></td></tr>
        <tr><td>Name</td><td>Stats</td><td>Properties</td><td>Notes</td></tr>
        <tr>
          <td><b>Test Item<br><a href="t.htm">Base</a></b></td>
          <td>Item Level: 100<br>Required Level: 90</td>
          <td><font color=4850B8><FONT COLOR="ORANGE">Special Effect</FONT><br>Regular Effect</font></td>
          <td></td>
        </tr>
      </table>`;
    const result = parseMythicalUniques(html);
    expect(result).toHaveLength(1);
    expect(result[0].specialProperties).toContain('Special Effect');
    expect(result[0].properties).toContain('Regular Effect');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: Special (orange) properties spanning several lines
// ═══════════════════════════════════════════════════════════════════════════════

describe('Multi-line special properties (fixture)', () => {
  const findItem = (name: string) => {
    const item = items.find((i) => i.name === name);
    if (!item) throw new Error(`${name} not found in fixture`);
    return item;
  };

  it("Imperius' Undying Wrath: keeps the 3 orange statements, re-joins only the hard-wrapped one", () => {
    const item = findItem("Imperius' Undying Wrath");
    expect(item.specialProperties).toEqual([
      'Gain 1% Lightning Spell Damage per 100 Strength when Taking Damage for 5 Seconds',
      'This effect can stack up to 25 times',
      'Lightning Spell Damage from Energy no Longer Works',
    ]);
    expect(item.properties[0]).toBe('+(2 to 4) to All Skills');
  });

  it("Orpheus' Pillar of Hope: orange font starting with <br> is still special", () => {
    const item = findItem("Orpheus' Pillar of Hope");
    expect(item.specialProperties).toEqual([
      'Each Stack of Underworld Empowerment grants 5% Poison, Magic and Physical Skill Damage for 2 seconds',
      'Maximum Stacks: 40',
    ]);
    expect(item.properties).not.toContain('Maximum Stacks: 40');
  });

  it("Tal Rasha's Final Whisper: wrapped orange line is one special property", () => {
    const item = findItem("Tal Rasha's Final Whisper");
    expect(item.specialProperties).toEqual([
      'Adds 3-4 Fire, 2-5 Cold, 1-7 Lightning Damage to Attacks per 4 Dexterity',
      'Cloak of Shadows now pierces elemental instead of physical resist at double effectiveness',
    ]);
    expect(item.properties).not.toContain('per 4 Dexterity');
  });

  it('no regular property should start with a lowercase letter (missed wrap / misclassified orange line)', () => {
    for (const item of items) {
      for (const prop of [...item.properties, ...item.specialProperties]) {
        expect(prop, `${item.name}: "${prop}"`).not.toMatch(/^[a-z]/);
      }
    }
  });
});

describe('Multi-line special properties (synthetic)', () => {
  const wrap = (props: string) => `
      <table>
        <tr><td colspan="4" bgcolor="#402040"><b>TestCategory</b></td></tr>
        <tr><td>Name</td><td>Stats</td><td>Properties</td><td>Notes</td></tr>
        <tr>
          <td><b>Test Item<br><a href="t.htm">Base</a></b></td>
          <td>Item Level: 100<br>Required Level: 90</td>
          <td>${props}</td>
          <td></td>
        </tr>
      </table>`;

  it('classifies every line inside an orange font as special, not only the first', () => {
    const [item] = parseMythicalUniques(
      wrap('<font color=4850B8><FONT COLOR="ORANGE">First effect<br>Second effect<br>Third effect</FONT><br>Regular</font>')
    );
    expect(item.specialProperties).toEqual(['First effect', 'Second effect', 'Third effect']);
    expect(item.properties).toEqual(['Regular']);
  });

  it('accepts unquoted / lowercase orange colour attributes and a leading <br>', () => {
    const [item] = parseMythicalUniques(wrap('<font color=orange><br>Special one<br>Special two</font><br>Regular'));
    expect(item.specialProperties).toEqual(['Special one', 'Special two']);
    expect(item.properties).toEqual(['Regular']);
  });

  it('re-joins hard-wrapped lines but never across the orange / regular boundary', () => {
    const [item] = parseMythicalUniques(
      wrap(
        '<FONT COLOR="ORANGE">Gain 5% damage for every<br>10 strength you have and</FONT><br>+1 to All Skills<br>Regular wrapped for<br>two lines'
      )
    );
    expect(item.specialProperties).toEqual(['Gain 5% damage for every 10 strength you have and']);
    expect(item.properties).toEqual(['+1 to All Skills', 'Regular wrapped for two lines']);
  });
});
