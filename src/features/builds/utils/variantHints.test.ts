import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import type { HtmUniqueItem, MythicalUnique } from '@/core/db';
import { parseHtmUniqueItems } from '@/features/data-sync/parsers/htmUniqueItemsParser';
import { parseMythicalUniques } from '@/features/data-sync/parsers/mythicalUniquesParser';
import { mythicalVariantHints, uniqueVariantHints } from './variantHints';

function unique(name: string, properties: readonly string[], overrides: Partial<HtmUniqueItem> = {}): HtmUniqueItem {
  return {
    name,
    baseItem: 'Grim Wand',
    baseItemCode: 'gwn',
    page: 'weapons',
    category: 'Wand',
    itemLevel: 50,
    reqLevel: 40,
    properties: [...properties],
    isAncientCoupon: false,
    gambleItem: '',
    notes: '',
    ...overrides,
  };
}

function mythical(name: string, properties: readonly string[], overrides: Partial<MythicalUnique> = {}): MythicalUnique {
  return {
    name,
    baseItem: 'Grand Crown',
    baseItemLink: '',
    category: 'Helm',
    itemLevel: 99,
    reqLevel: 90,
    properties: [...properties],
    specialProperties: [],
    notes: [],
    imageUrl: '',
    ...overrides,
  };
}

describe('uniqueVariantHints', () => {
  it('returns no hints for singleton names', () => {
    const items = [unique('A', ['+1 to All Skills']), unique('B', ['+2 to All Skills'])];
    expect(uniqueVariantHints(items).size).toBe(0);
  });

  it('returns no hints when the coupon flag or base item already distinguishes variants', () => {
    const items = [
      unique('The Oculus', ['+3 to Sorceress Skills']),
      unique('The Oculus', ['+4 to Sorceress Skills'], { isAncientCoupon: true }),
      unique("Lycander's Aim", ['x'], { baseItem: 'Ceremonial Bow' }),
      unique("Lycander's Aim", ['y'], { baseItem: 'Matriarchal Bow' }),
    ];
    expect(uniqueVariantHints(items).size).toBe(0);
  });

  it("shows each variant's single differing line (Vorador's Essence)", () => {
    const shared = ['+2 to All Skills', '+20% Faster Cast Rate'];
    const magic = unique("Vorador's Essence", [...shared, '+15% to Magic Skill Damage']);
    const poison = unique("Vorador's Essence", [...shared, '+15% to Poison Skill Damage']);
    const hints = uniqueVariantHints([magic, poison]);
    expect(hints.get(magic)).toEqual(['+15% to Magic Skill Damage']);
    expect(hints.get(poison)).toEqual(['+15% to Poison Skill Damage']);
  });

  it('only hints the sub-group that shares base + coupon in a mixed group', () => {
    const a = unique('Mixed', ['shared', 'only a']);
    const b = unique('Mixed', ['shared', 'only b']);
    const coupon = unique('Mixed', ['shared', 'only c'], { isAncientCoupon: true });
    const hints = uniqueVariantHints([a, b, coupon]);
    expect(hints.get(a)).toEqual(['only a']);
    expect(hints.get(b)).toEqual(['only b']);
    expect(hints.has(coupon)).toBe(false);
  });

  it('caps the number of hint lines', () => {
    const a = unique('Capped', ['a1', 'a2', 'a3', 'shared']);
    const b = unique('Capped', ['b1', 'shared']);
    expect(uniqueVariantHints([a, b]).get(a)).toEqual(['a1', 'a2']);
    expect(uniqueVariantHints([a, b], 1).get(a)).toEqual(['a1']);
  });
});

describe('mythicalVariantHints', () => {
  it("gives each of three identical-looking variants only its non-shared lines (Tathamet's Awakening)", () => {
    const x = mythical("Tathamet's Awakening", ['common', 'fire', 'pair']);
    const y = mythical("Tathamet's Awakening", ['common', 'cold', 'pair']);
    const z = mythical("Tathamet's Awakening", ['common', 'lightning']);
    const hints = mythicalVariantHints([x, y, z]);
    // Exclusive lines come first, then lines shared by some (not all) variants.
    expect(hints.get(x)).toEqual(['fire', 'pair']);
    expect(hints.get(y)).toEqual(['cold', 'pair']);
    expect(hints.get(z)).toEqual(['lightning']);
  });

  it('returns no hints when base items differ', () => {
    const items = [mythical('M', ['a']), mythical('M', ['b'], { baseItem: 'Corona' })];
    expect(mythicalVariantHints(items).size).toBe(0);
  });
});

// ─── Real fixtures ───────────────────────────────────────────────────────────

const fixture = (file: string) => readFileSync(resolve(__dirname, '../../../../test-fixtures', file), 'utf-8');

function expectDistinctLabels<T extends { readonly name: string }>(items: readonly T[], label: (item: T) => string) {
  const byName = new Map<string, T[]>();
  for (const item of items) byName.set(item.name, [...(byName.get(item.name) ?? []), item]);
  const groups = [...byName.values()].filter((group) => group.length > 1);
  for (const group of groups) {
    const labels = group.map(label);
    expect(new Set(labels).size, `${group[0]?.name ?? ''}: ${labels.join(' | ')}`).toBe(group.length);
  }
  return groups.length;
}

describe('variant hints over real fixtures', () => {
  it('makes every same-name unique group display distinctly', () => {
    const uniques = [
      ...parseHtmUniqueItems(fixture('unique_weapons.htm'), 'weapons'),
      ...parseHtmUniqueItems(fixture('unique_armors.htm'), 'armors'),
      ...parseHtmUniqueItems(fixture('unique_others.htm'), 'other'),
    ];
    const hints = uniqueVariantHints(uniques);
    const groupCount = expectDistinctLabels(uniques, (item) =>
      [item.baseItem, item.isAncientCoupon ? 'coupon' : '', ...(hints.get(item) ?? [])].join(' / ')
    );
    expect(groupCount).toBeGreaterThan(0);
  });

  it('makes every same-name mythical group display distinctly', () => {
    const mythicals = parseMythicalUniques(fixture('unique_mythicals.htm'));
    const hints = mythicalVariantHints(mythicals);
    const groupCount = expectDistinctLabels(mythicals, (item) => [item.baseItem, ...(hints.get(item) ?? [])].join(' / '));
    expect(groupCount).toBeGreaterThan(0);
  });
});
