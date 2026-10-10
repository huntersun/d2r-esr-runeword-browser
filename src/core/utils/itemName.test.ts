import { describe, it, expect } from 'vitest';
import { normaliseItemName } from './itemName';

describe('normaliseItemName', () => {
  it('trims, collapses whitespace and case-folds', () => {
    expect(normaliseItemName('  The   Ties\tthat Bind ')).toBe('the ties that bind');
  });

  it('unifies typographic apostrophes and quotes', () => {
    expect(normaliseItemName('El’Druin')).toBe("el'druin");
    expect(normaliseItemName('El‘Druin')).toBe("el'druin");
    expect(normaliseItemName('“Quoted”')).toBe('"quoted"');
  });

  it('unifies dashes and non-breaking spaces', () => {
    expect(normaliseItemName('Ancient Decal (I –> El)')).toBe('ancient decal (i -> el)');
    expect(normaliseItemName('Small Charm')).toBe('small charm');
  });
});
