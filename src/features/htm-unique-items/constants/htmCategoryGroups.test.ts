import { describe, it, expect } from 'vitest';
import { groupHtmCategories } from './htmCategoryGroups';

describe('groupHtmCategories', () => {
  it('should place known categories into their groups, keeping the group order', () => {
    expect(groupHtmCategories(['Jewel', 'Ring', 'Sword', 'Bow'])).toEqual([
      { id: 'missile-weapons', label: 'Missile Weapons', categories: ['Bow'] },
      { id: 'weapons', label: 'Weapons', categories: ['Sword'] },
      { id: 'rings', label: 'Rings', categories: ['Ring'] },
      { id: 'jewels', label: 'Jewels', categories: ['Jewel'] },
    ]);
  });

  it('should group the categories added or renamed in ESR 3.2 (Warlock items, quivers, LoD jewelry)', () => {
    const groups = groupHtmCategories([
      'Bow Quiver',
      'Crossbow Quiver',
      'Voidblade',
      'Grimoire',
      'War Ring',
      'LoD Ring',
      'War Amulet',
      'LoD Amulet',
    ]);

    expect(groups).toEqual([
      { id: 'missile-weapons', label: 'Missile Weapons', categories: ['Bow Quiver', 'Crossbow Quiver'] },
      { id: 'class-weapons', label: 'Class Specific', categories: ['Voidblade'] },
      { id: 'class-armors', label: 'Class Specific', categories: ['Grimoire'] },
      { id: 'rings', label: 'Rings', categories: ['LoD Ring', 'War Ring'] },
      { id: 'amulets', label: 'Amulets', categories: ['LoD Amulet', 'War Amulet'] },
    ]);
  });

  it('should put unknown categories into a trailing "New" group instead of hiding them', () => {
    expect(groupHtmCategories(['Ring', 'Brand New Category'])).toEqual([
      { id: 'rings', label: 'Rings', categories: ['Ring'] },
      { id: 'new', label: 'New', categories: ['Brand New Category'] },
    ]);
  });
});
