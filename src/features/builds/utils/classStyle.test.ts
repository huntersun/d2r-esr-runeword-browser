import { describe, it, expect } from 'vitest';
import { CHARACTER_CLASSES } from '../constants';
import { CLASS_STYLES, classStyle } from './classStyle';

describe('CHARACTER_CLASSES', () => {
  it('should include the Warlock added in ESR 3.2', () => {
    expect(CHARACTER_CLASSES).toContain('Warlock');
    expect(CHARACTER_CLASSES).toHaveLength(8);
  });
});

describe('classStyle', () => {
  it('should give every class its own badge tint', () => {
    const badges = CHARACTER_CLASSES.map((c) => classStyle(c)?.badge);
    expect(badges.every((b) => b !== undefined)).toBe(true);
    expect(new Set(badges).size).toBe(CHARACTER_CLASSES.length);
    expect(Object.keys(CLASS_STYLES)).toHaveLength(CHARACTER_CLASSES.length);
  });

  it('should return undefined for a class string the app does not know', () => {
    expect(classStyle('Unknown Class')).toBeUndefined();
  });
});
