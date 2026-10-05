import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@/core/db';
import type { HtmUniqueItem, MythicalUnique } from '@/core/db';
import type { MythicalItemRef, UniqueItemRef, UniqueSnapshot } from '../buildData';
import { findMythicalRecord, findUniqueRecord, pickBestMatch } from './itemLookup';

afterEach(async () => {
  await Promise.all([db.htmUniqueItems.clear(), db.mythicalUniques.clear()]);
});

// Lycander's Aim ships twice in ESR 3.12 on the same base + category: the normal unique
// and its Ancient Coupon variant — only the stats tell them apart.
const AIM_NORMAL = ['+(150 to 200)% Enhanced Damage', '+(25 to 50)% Deadly Strike', '+(50 to 100) to Dexterity'];
const AIM_COUPON = ['+100% Enhanced Damage', '-200% Target Defense', '+100% Deadly Strike', '+(1 to 5) To Broadhead'];

function unique(properties: readonly string[], overrides: Partial<HtmUniqueItem> = {}): HtmUniqueItem {
  return {
    name: "Lycander's Aim",
    baseItem: 'Ceremonial Bow',
    baseItemCode: 'am7',
    page: 'weapons',
    category: 'Amazon Bow',
    itemLevel: 50,
    reqLevel: 42,
    properties: [...properties],
    isAncientCoupon: false,
    gambleItem: '',
    notes: '',
    ...overrides,
  };
}

function snapshotOf(item: HtmUniqueItem, overrides: Partial<UniqueSnapshot> = {}): UniqueSnapshot {
  return {
    name: item.name,
    baseItem: item.baseItem,
    category: item.category,
    reqLevel: item.reqLevel,
    properties: item.properties,
    ...overrides,
  };
}

function uniqueRef(snapshot: UniqueSnapshot, id = 123456): UniqueItemRef {
  return { type: 'unique', id, snapshot };
}

describe('pickBestMatch', () => {
  const normal = unique(AIM_NORMAL);
  const coupon = unique(AIM_COUPON, { isAncientCoupon: true });

  it('returns null when there are no candidates', () => {
    expect(pickBestMatch([], snapshotOf(normal))).toBeNull();
  });

  it('returns a single candidate even when its stats changed (so the change is still detected)', () => {
    expect(pickBestMatch([normal], snapshotOf(normal, { properties: ['something else entirely'] }))).toBe(normal);
  });

  it('picks the same-name variant whose stats exactly match the snapshot, regardless of order', () => {
    expect(pickBestMatch([normal, coupon], snapshotOf(coupon))).toBe(coupon);
    expect(pickBestMatch([coupon, normal], snapshotOf(normal))).toBe(normal);
  });

  it('picks the most similar variant when the saved variant changed upstream', () => {
    const tweakedCoupon = unique([...AIM_COUPON.slice(0, 3), '+(2 to 6) To Broadhead'], { isAncientCoupon: true });
    expect(pickBestMatch([normal, tweakedCoupon], snapshotOf(coupon))).toBe(tweakedCoupon);
  });

  it('distinguishes variants that differ by a single property line', () => {
    const base = ['+2 to Necromancer Skill Levels', '+20% Faster Cast Rate', '+100% Enhanced Defense'];
    const magic = unique([...base, '+1 To Magic Mastery'], { name: "Vorador's Essence" });
    const poison = unique([...base, '+1 To Poison Mastery'], { name: "Vorador's Essence" });
    expect(pickBestMatch([magic, poison], snapshotOf(poison))).toBe(poison);
  });

  it('still prefers base item + category before comparing stats', () => {
    const otherBase = unique(AIM_COUPON, { baseItem: 'Matriarchal Bow' });
    expect(pickBestMatch([otherBase, normal], snapshotOf(normal, { properties: AIM_COUPON }))).toBe(normal);
  });

  it('uses reqLevel to break a similarity tie', () => {
    const low = unique(['a'], { reqLevel: 10 });
    const high = unique(['b'], { reqLevel: 60 });
    expect(pickBestMatch([low, high], snapshotOf(low, { properties: ['c'], reqLevel: 60 }))).toBe(high);
  });

  it('falls back to the first candidate (previous behaviour) when nothing in the snapshot discriminates', () => {
    expect(pickBestMatch([normal, coupon], snapshotOf(normal, { properties: [], reqLevel: 1 }))).toBe(normal);
  });
});

describe('findUniqueRecord', () => {
  it('resolves an old-shape ref (stale id, no extra fields) to the variant matching its snapshot', async () => {
    await db.htmUniqueItems.bulkAdd([unique(AIM_NORMAL), unique(AIM_COUPON, { isAncientCoupon: true })]);

    const coupon = await findUniqueRecord(uniqueRef(snapshotOf(unique(AIM_COUPON))));
    expect(coupon?.isAncientCoupon).toBe(true);
    const normal = await findUniqueRecord(uniqueRef(snapshotOf(unique(AIM_NORMAL))));
    expect(normal?.isAncientCoupon).toBe(false);
  });

  it('returns null when no item with that name exists', async () => {
    await db.htmUniqueItems.add(unique(AIM_NORMAL));
    expect(await findUniqueRecord(uniqueRef(snapshotOf(unique(AIM_NORMAL), { name: 'Gone' })))).toBeNull();
  });
});

describe('findMythicalRecord', () => {
  function tathamet(element: string): MythicalUnique {
    return {
      name: "Tathamet's Awakening",
      baseItem: 'Mythical Diadem',
      baseItemLink: '',
      category: 'Mythical Unique Armor',
      itemLevel: 100,
      reqLevel: 90,
      properties: [`+(3 to 5) to ${element} Skills`, `+1 to ${element} Mastery`, '+3 to Elemental Nova'],
      specialProperties: [],
      notes: [],
      imageUrl: '',
    };
  }

  it('resolves each of the three same-base variants to the one the build saved', async () => {
    const variants = ['Fire', 'Cold', 'Lightning'].map(tathamet);
    await db.mythicalUniques.bulkAdd(variants);

    for (const variant of variants) {
      const ref: MythicalItemRef = {
        type: 'mythical',
        id: 1,
        snapshot: {
          name: variant.name,
          baseItem: variant.baseItem,
          category: variant.category,
          reqLevel: variant.reqLevel,
          properties: variant.properties,
        },
      };
      const found = await findMythicalRecord(ref);
      expect(found?.properties).toEqual(variant.properties);
    }
  });
});
