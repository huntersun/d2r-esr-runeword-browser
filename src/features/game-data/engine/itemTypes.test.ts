import { describe, it, expect } from 'vitest';
import { ancestorsOf, disambiguateTypeNames, resolveClass } from './itemTypes.ts';
import type { ClassCode } from './schema.ts';

const parents = new Map<string, string[]>([
  ['weap', []],
  ['mele', ['weap']],
  ['blde', ['mele']],
  ['swor', ['blde']],
  ['2hsw', []],
  ['1hsw', []],
  ['clas', []],
  ['sorc', ['clas']],
  ['mana', ['swor', 'sorc']],
  ['merc', []],
  ['armo', []],
  ['helm', ['armo', 'merc']],
  // cycle
  ['cy1', ['cy2']],
  ['cy2', ['cy1']],
]);

describe('ancestorsOf', () => {
  it('walks the Equiv chain breadth-first, starting with the type itself', () => {
    expect(ancestorsOf(['swor'], parents)).toEqual(['swor', 'blde', 'mele', 'weap']);
    expect(ancestorsOf(['mana'], parents)).toEqual(['mana', 'swor', 'sorc', 'blde', 'clas', 'mele', 'weap']);
  });

  it('unions type and type2 without duplicates', () => {
    expect(ancestorsOf(['swor', '2hsw'], parents)).toEqual(['swor', '2hsw', 'blde', 'mele', 'weap']);
    expect(ancestorsOf(['swor', null], parents)).toEqual(['swor', 'blde', 'mele', 'weap']);
  });

  it('terminates on cycles', () => {
    expect(ancestorsOf(['cy1'], parents)).toEqual(['cy1', 'cy2']);
  });

  it('skips unknown codes', () => {
    expect(ancestorsOf(['nope'], parents)).toEqual([]);
  });

  it('treats merc as a parent of helm, not as helm itself', () => {
    expect(ancestorsOf(['helm'], parents)).toEqual(['helm', 'armo', 'merc']);
    expect(ancestorsOf(['merc'], parents)).toEqual(['merc']);
  });
});

describe('disambiguateTypeNames', () => {
  it('appends the code to colliding names (merc and helm are both "Helm")', () => {
    const names = disambiguateTypeNames([
      { code: 'merc', name: 'Helm' },
      { code: 'swor', name: 'Sword' },
      { code: 'helm', name: 'Helm' },
    ]);
    expect(names.get('merc')).toBe('Helm (merc)');
    expect(names.get('helm')).toBe('Helm (helm)');
    expect(names.get('swor')).toBe('Sword');
  });

  it('keeps the plain name for the colliding type that has bases', () => {
    const entries = [
      { code: 'merc', name: 'Helm' },
      { code: 'helm', name: 'Helm' },
      { code: 'can1', name: 'Gem Can 1' },
      { code: 'can9', name: 'Gem Can 1' },
    ];
    const names = disambiguateTypeNames(entries, new Set(['helm', 'swor']));
    expect(names.get('helm')).toBe('Helm');
    expect(names.get('merc')).toBe('Helm (merc)');
    expect(names.get('can1')).toBe('Gem Can 1 (can1)');
    expect(names.get('can9')).toBe('Gem Can 1 (can9)');
    // all colliding types have bases → all suffixed
    expect(disambiguateTypeNames(entries, new Set(['helm', 'merc'])).get('helm')).toBe('Helm (helm)');
  });
});

describe('resolveClass', () => {
  it('returns the first ancestor with a class', () => {
    const classes = new Map<string, ClassCode | null>([
      ['mana', null],
      ['sorc', 'sor'],
    ]);
    expect(resolveClass(ancestorsOf(['mana'], parents), classes)).toBe('sor');
    expect(resolveClass(ancestorsOf(['swor'], parents), classes)).toBeNull();
  });
});
