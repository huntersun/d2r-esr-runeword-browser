import { describe, it, expect } from 'vitest';
import { groupItemTypesByCategory } from './itemTypeCategories';

describe('groupItemTypesByCategory', () => {
  it('should place known item types into their groups, keeping the group order', () => {
    expect(groupItemTypesByCategory(['Charm', 'Helm', 'Sword', 'Crossbow', 'Orb'])).toEqual([
      { label: 'Weapons', itemTypes: ['Sword'] },
      { label: 'Missile', itemTypes: ['Crossbow'] },
      { label: 'Armor', itemTypes: ['Helm'] },
      { label: 'Class-Specific', itemTypes: ['Orb'] },
      { label: 'Other', itemTypes: ['Charm'] },
    ]);
  });

  it('should place the ESR 3.2 "Two-Handed Melee Weapon" type under Weapons', () => {
    expect(groupItemTypesByCategory(['Two-Handed Melee Weapon', 'Melee Weapon'])).toEqual([
      { label: 'Weapons', itemTypes: ['Melee Weapon', 'Two-Handed Melee Weapon'] },
    ]);
  });

  it('should put unknown item types into a trailing "New" group instead of hiding them', () => {
    expect(groupItemTypesByCategory(['Sword', 'Brand New Type'])).toEqual([
      { label: 'Weapons', itemTypes: ['Sword'] },
      { label: 'New', itemTypes: ['Brand New Type'] },
    ]);
  });

  it('should return no groups for no item types', () => {
    expect(groupItemTypesByCategory([])).toEqual([]);
  });
});
