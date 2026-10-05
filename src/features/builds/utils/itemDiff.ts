import { db } from '@/core/db';
import type {
  BuildData,
  ColumnAffixesSnapshot,
  EquipmentSlot,
  GemwordSnapshot,
  ItemRef,
  RunewordSnapshot,
  UniqueSnapshot,
  WeaponSwapSlot,
} from '../buildData';
import { gemwordToRef, mythicalToRef, runewordToRef, uniqueToRef } from './buildSnapshot';
import { findMythicalRecord, findUniqueRecord } from './itemLookup';
import { propertyText } from './propertyText';

/**
 * - `unchanged`: the stored snapshot matches the current local data.
 * - `changed`: the item still exists locally but its stats differ from the snapshot.
 * - `missing`: the referenced item no longer exists in the viewer's local data.
 */
export type ItemDiffStatus = 'unchanged' | 'changed' | 'missing';

export interface ItemDiff {
  /** The reference (with its original snapshot) as stored in the build. */
  readonly stored: ItemRef;
  /** The same item re-resolved from current local data, or null if it's gone. */
  readonly current: ItemRef | null;
  readonly status: ItemDiffStatus;
}

export interface BuildItemDiffs {
  readonly items: Partial<Record<EquipmentSlot, ItemDiff>>;
  readonly weaponSwap: Partial<Record<WeaponSwapSlot, ItemDiff>>;
  readonly mercenary: Partial<Record<EquipmentSlot, ItemDiff>>;
}

/**
 * Resolves an item reference against the current local DB, rebuilding its snapshot
 * from live data. Returns null when the item no longer exists (removed/renamed in a
 * newer ESR version). Freetext items have no DB row, so they resolve to themselves.
 */
export async function resolveCurrentRef(ref: ItemRef): Promise<ItemRef | null> {
  switch (ref.type) {
    case 'unique': {
      const item = await findUniqueRecord(ref);
      return item ? uniqueToRef(item) : null;
    }
    case 'mythical': {
      const item = await findMythicalRecord(ref);
      return item ? mythicalToRef(item) : null;
    }
    case 'runeword': {
      const runeword = await db.runewords.get([ref.name, ref.variant]);
      return runeword ? runewordToRef(runeword) : null;
    }
    case 'gemword': {
      const gemword = await db.gemwords.get([ref.name, ref.variant]);
      return gemword ? gemwordToRef(gemword) : null;
    }
    case 'freetext':
      return ref;
  }
}

/**
 * Structural equality that is order-independent for object keys (Postgres jsonb does
 * not preserve key order, so a stored snapshot may have different key order than a
 * freshly-built one) but order-sensitive for arrays (affix/property order is meaningful).
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => deepEqual(value, b[index]));
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord);
    const bKeys = Object.keys(bRecord);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => key in bRecord && deepEqual(aRecord[key], bRecord[key]));
  }
  return false;
}

/** Special lines then regular lines, as one normalised string (see propertyText). */
function combinedText(special: readonly string[] | undefined, properties: readonly string[] | undefined): string {
  return [propertyText(special), propertyText(properties)].filter((text) => text !== '').join(' ');
}

/**
 * A mythical snapshot saved before `specialProperties` was snapshotted, compared with one
 * that has it. Older parsers misfiled the wrapped continuation lines of the (leading)
 * orange special text as regular properties, so a legacy `properties` may start with a
 * tail of the special text. It's equivalent when it equals the current regular text, or
 * is the current special + regular text minus a leading part of the special text.
 */
function legacyMythicalMatches(legacyProperties: readonly string[], special: readonly string[], properties: readonly string[]): boolean {
  const legacy = propertyText(legacyProperties);
  const regular = propertyText(properties);
  if (legacy === regular) return true;
  const full = combinedText(special, properties);
  return legacy.length > regular.length && (full === legacy || full.endsWith(` ${legacy}`));
}

function uniqueSnapshotsEqual(a: UniqueSnapshot, b: UniqueSnapshot): boolean {
  const { properties: aProperties, specialProperties: aSpecial, ...aRest } = a;
  const { properties: bProperties, specialProperties: bSpecial, ...bRest } = b;
  if (!deepEqual(aRest, bRest)) return false;
  // Property line boundaries are not meaningful (re-wrapping), only the text is.
  if (Array.isArray(aSpecial) && Array.isArray(bSpecial)) {
    return combinedText(aSpecial, aProperties) === combinedText(bSpecial, bProperties);
  }
  if (Array.isArray(aSpecial)) return legacyMythicalMatches(bProperties, aSpecial, aProperties);
  if (Array.isArray(bSpecial)) return legacyMythicalMatches(aProperties, bSpecial, bProperties);
  return propertyText(aProperties) === propertyText(bProperties);
}

function columnTexts(columns: ColumnAffixesSnapshot): Record<keyof ColumnAffixesSnapshot, string> {
  return {
    weaponsGloves: propertyText(columns.weaponsGloves),
    helmsBoots: propertyText(columns.helmsBoots),
    armorShieldsBelts: propertyText(columns.armorShieldsBelts),
  };
}

function socketableSnapshotsEqual(a: RunewordSnapshot | GemwordSnapshot, b: RunewordSnapshot | GemwordSnapshot): boolean {
  const { columnAffixes: aColumns, ...aRest } = a;
  const { columnAffixes: bColumns, ...bRest } = b;
  return deepEqual(aRest, bRest) && deepEqual(columnTexts(aColumns), columnTexts(bColumns));
}

/**
 * Whether two item references carry equivalent snapshots (freetext compares by name).
 * Affix/property lists compare as whole text, so a line the ESR site re-wraps (split
 * vs merged, whitespace) is not a change, while any wording/number/order change is.
 */
export function refSnapshotsEqual(a: ItemRef, b: ItemRef): boolean {
  switch (a.type) {
    case 'freetext':
      return b.type === 'freetext' && a.name === b.name;
    case 'unique':
    case 'mythical':
      return b.type === a.type && uniqueSnapshotsEqual(a.snapshot, b.snapshot);
    case 'runeword':
    case 'gemword':
      return b.type === a.type && socketableSnapshotsEqual(a.snapshot, b.snapshot);
  }
}

/** Classifies a stored reference against its freshly-resolved current counterpart. */
export function diffRef(stored: ItemRef, current: ItemRef | null): ItemDiff {
  if (stored.type === 'freetext') return { stored, current: stored, status: 'unchanged' };
  if (current === null) return { stored, current: null, status: 'missing' };
  return { stored, current, status: refSnapshotsEqual(stored, current) ? 'unchanged' : 'changed' };
}

async function diffSection<K extends string>(
  section: Partial<Record<K, ItemRef | null>> | undefined
): Promise<Partial<Record<K, ItemDiff>>> {
  const result: Partial<Record<K, ItemDiff>> = {};
  if (section === undefined) return result;
  const entries = await Promise.all(
    (Object.keys(section) as K[]).map(async (slot) => {
      const ref = section[slot];
      if (!ref) return null;
      const current = await resolveCurrentRef(ref);
      return [slot, diffRef(ref, current)] as const;
    })
  );
  for (const entry of entries) {
    if (entry) result[entry[0]] = entry[1];
  }
  return result;
}

/** Diffs every referenced item in a build against the viewer's current local data. */
export async function computeBuildItemDiffs(buildData: BuildData): Promise<BuildItemDiffs> {
  const [items, weaponSwap, mercenary] = await Promise.all([
    diffSection<EquipmentSlot>(buildData.items),
    diffSection<WeaponSwapSlot>(buildData.weaponSwap),
    diffSection<EquipmentSlot>(buildData.mercenary),
  ]);
  return { items, weaponSwap, mercenary };
}
