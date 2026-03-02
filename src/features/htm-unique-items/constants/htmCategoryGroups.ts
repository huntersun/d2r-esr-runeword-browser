import type { HtmFilterGroup } from '../types';

interface HtmCategoryDefinition {
  readonly id: string;
  readonly label: string;
  readonly categories: readonly string[];
}

/**
 * Defines how raw HTM categories (parsed from the docs) are grouped into
 * filter groups in the UI. Categories not listed here fall into a "New" group
 * so that newly added categories in the docs are never silently hidden.
 */
const HTM_CATEGORY_GROUPS: readonly HtmCategoryDefinition[] = [
  // ── Weapons page ──────────────────────────────────────────────────────────
  {
    id: 'missile-weapons',
    label: 'Missile Weapons',
    categories: ['Bow', 'Bow Quiver2', 'Crossbow', 'Crossbow Quiver2', 'Javelin', 'Shuriken', 'Throwing Axe', 'Throwing Knife'],
  },
  {
    id: 'class-weapons',
    label: 'Class Specific',
    categories: [
      'Amazon Bow',
      'Amazon Javelin',
      'Amazon Spear',
      'Assassin 2H Katana',
      'Barbarian Javs',
      'Druid Club',
      'Necromancer Dagger',
      'Necromancer Polearm',
      'Orb',
      'Paladin Sword',
      'Sorceress Mana Blade',
    ],
  },
  {
    id: 'weapons',
    label: 'Weapons',
    categories: [
      'Axe',
      'Club',
      'Hammer',
      'Hand to Hand 1',
      'Hand to Hand 2',
      'Knife',
      'Knuckle',
      'Mace',
      'Polearm',
      'Scepter',
      'Spear',
      'Staff',
      'Sword',
      'Wand',
    ],
  },

  // ── Armors page ───────────────────────────────────────────────────────────
  {
    id: 'armors',
    label: 'Armors',
    categories: ['Belt', 'Body Armor', 'Boots', 'Circlet', 'Cloak', 'Gloves', 'Helm', 'Robe', 'Shield'],
  },
  {
    id: 'class-armors',
    label: 'Class Specific',
    categories: ['Auric Shields', 'Pelt', 'Primal Helm', 'Spirit Crown', 'Voodoo Heads'],
  },

  // ── Other page ────────────────────────────────────────────────────────────
  {
    id: 'rings',
    label: 'Rings',
    categories: ['Ring', 'Ama Ring', 'Ass Ring', 'Bar Ring', 'Coupon Rings', 'Dru Ring', 'Nec Ring', 'Pal Ring', 'Sor Ring'],
  },
  {
    id: 'amulets',
    label: 'Amulets',
    categories: [
      'Amulet',
      'Ama Amulet',
      'Ass Amulet',
      'Bar Amulet',
      'Coupon Amulets',
      'Dru Amulet',
      'Nec Amulet',
      'Pal Amulet',
      'Sor Amulet',
    ],
  },
  {
    id: 'charms',
    label: 'Charms',
    categories: ['Grand Charm', 'Large Charm', 'Odd Charm', 'Small Charm'],
  },
  {
    id: 'jewels',
    label: 'Jewels',
    categories: ['Jewel'],
  },
];

const KNOWN_CATEGORIES = new Set(HTM_CATEGORY_GROUPS.flatMap((g) => g.categories));

/**
 * Groups the available DB categories into filter groups.
 * Any category not in the known list is placed in a "New" group so that
 * new categories added to the docs are never silently hidden.
 */
export function groupHtmCategories(availableCategories: readonly string[]): HtmFilterGroup[] {
  const availableSet = new Set(availableCategories);
  const groups: HtmFilterGroup[] = [];

  for (const def of HTM_CATEGORY_GROUPS) {
    const matching = def.categories.filter((c) => availableSet.has(c));
    if (matching.length > 0) {
      groups.push({ id: def.id, label: def.label, categories: matching });
    }
  }

  const uncategorized = availableCategories.filter((c) => !KNOWN_CATEGORIES.has(c));
  if (uncategorized.length > 0) {
    groups.push({ id: 'new', label: 'New', categories: uncategorized });
  }

  return groups;
}
