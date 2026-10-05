// Typed structure stored in builds.build_data (jsonb). Each equipment slot holds
// one of the item-reference variants below, or null/absent for an empty slot.
// See builds-feature-docs/FEATURE-BUILD-SHARING.md.

/** Per-column runeword/gemword bonuses, stored as rawText strings. */
export interface ColumnAffixesSnapshot {
  readonly weaponsGloves: readonly string[];
  readonly helmsBoots: readonly string[];
  readonly armorShieldsBelts: readonly string[];
}

/** Snapshot for unique and mythical unique items (same shape for both). */
export interface UniqueSnapshot {
  readonly name: string;
  readonly baseItem: string;
  readonly category: string;
  readonly reqLevel: number;
  readonly properties: readonly string[];
  /**
   * Mythicals only: the orange "special" property lines, shown before `properties`.
   * Absent on uniques and on mythical snapshots saved before this field existed, so
   * readers must treat it as optional (see itemDiff's legacy-snapshot handling).
   */
  readonly specialProperties?: readonly string[];
}

export interface RunewordSnapshot {
  readonly sockets: number;
  // Optional: only present for recipes the ESR site shows as a socket range, e.g. "(2-3 Socket)".
  // Absent on builds saved before 3.12 data, so readers must treat it as optional.
  readonly socketsMax?: number;
  readonly runes: readonly string[];
  readonly gems: readonly string[];
  readonly allowedItems: readonly string[];
  readonly columnAffixes: ColumnAffixesSnapshot;
  readonly reqLevel: number;
}

export interface GemwordSnapshot {
  readonly sockets: number;
  readonly gems: readonly string[];
  readonly allowedItems: readonly string[];
  readonly columnAffixes: ColumnAffixesSnapshot;
  readonly reqLevel: number;
}

export interface UniqueItemRef {
  readonly type: 'unique';
  readonly id: number;
  readonly snapshot: UniqueSnapshot;
}

export interface MythicalItemRef {
  readonly type: 'mythical';
  readonly id: number;
  readonly snapshot: UniqueSnapshot;
}

export interface RunewordItemRef {
  readonly type: 'runeword';
  readonly name: string;
  readonly variant: number;
  readonly snapshot: RunewordSnapshot;
}

export interface GemwordItemRef {
  readonly type: 'gemword';
  readonly name: string;
  readonly variant: number;
  readonly snapshot: GemwordSnapshot;
}

export interface FreetextItemRef {
  readonly type: 'freetext';
  readonly name: string;
}

export type ItemRef = UniqueItemRef | MythicalItemRef | RunewordItemRef | GemwordItemRef | FreetextItemRef;

export type EquipmentSlot = 'helmet' | 'armor' | 'weapon' | 'shield' | 'gloves' | 'boots' | 'belt' | 'amulet' | 'ring1' | 'ring2';
export type WeaponSwapSlot = 'weapon2' | 'shield2';

export interface BuildData {
  readonly items?: Partial<Record<EquipmentSlot, ItemRef | null>>;
  readonly weaponSwap?: Partial<Record<WeaponSwapSlot, ItemRef | null>>;
  readonly mercenary?: Partial<Record<EquipmentSlot, ItemRef | null>>;
  // Per-slot crafting/corruption notes (rune-forging, D-Stone, corruption, etc.).
  // Keyed by slot, parallel to the item maps above, so they survive snapshot refresh
  // on edit and persist when the item in a slot is swapped.
  readonly itemNotes?: Partial<Record<EquipmentSlot, string>>;
  readonly weaponSwapNotes?: Partial<Record<WeaponSwapSlot, string>>;
  readonly mercenaryNotes?: Partial<Record<EquipmentSlot, string>>;
  readonly charms?: readonly string[];
  readonly ascendancy?: string | null;
  readonly skills?: string | null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isColumnAffixes(value: unknown): boolean {
  return isRecord(value) && isStringArray(value.weaponsGloves) && isStringArray(value.helmsBoots) && isStringArray(value.armorShieldsBelts);
}

function isUniqueSnapshot(s: UnknownRecord): boolean {
  return (
    typeof s.name === 'string' &&
    typeof s.baseItem === 'string' &&
    isStringArray(s.properties) &&
    (s.specialProperties === undefined || isStringArray(s.specialProperties))
  );
}

function isSocketableSnapshot(s: UnknownRecord, recipeKey: 'runes' | 'gems'): boolean {
  return isStringArray(s[recipeKey]) && isColumnAffixes(s.columnAffixes);
}

/** Runtime check of the fields the display/lookup/diff code dereferences. */
export function isItemRef(value: unknown): value is ItemRef {
  if (!isRecord(value)) return false;
  if (value.type === 'freetext') return typeof value.name === 'string';
  const snapshot = value.snapshot;
  if (!isRecord(snapshot)) return false;
  switch (value.type) {
    case 'unique':
    case 'mythical':
      return typeof value.id === 'number' && isUniqueSnapshot(snapshot);
    case 'runeword':
    case 'gemword':
      return (
        typeof value.name === 'string' &&
        typeof value.variant === 'number' &&
        isSocketableSnapshot(snapshot, value.type === 'runeword' ? 'runes' : 'gems')
      );
    default:
      return false;
  }
}

/** Keeps only the entries of a jsonb object whose value passes `isValid`; undefined if not an object. */
function filterEntries<T>(value: unknown, isValid: (entry: unknown) => entry is T): Record<string, T> | undefined {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, T] => isValid(entry[1])));
}

const isString = (value: unknown): value is string => typeof value === 'string';
const optionalString = (value: unknown): string | null | undefined => (typeof value === 'string' || value === null ? value : undefined);

/**
 * Defensive read of the jsonb column into BuildData. The column is user-writable
 * (any authenticated owner can PATCH arbitrary JSON through PostgREST), so every
 * field is validated: malformed item refs, notes and charms are dropped rather than
 * crashing the detail/edit screens.
 */
export function asBuildData(value: unknown): BuildData {
  if (!isRecord(value)) return {};
  return {
    items: filterEntries(value.items, isItemRef),
    weaponSwap: filterEntries(value.weaponSwap, isItemRef),
    mercenary: filterEntries(value.mercenary, isItemRef),
    itemNotes: filterEntries(value.itemNotes, isString),
    weaponSwapNotes: filterEntries(value.weaponSwapNotes, isString),
    mercenaryNotes: filterEntries(value.mercenaryNotes, isString),
    charms: Array.isArray(value.charms) ? value.charms.filter(isString) : undefined,
    ascendancy: optionalString(value.ascendancy),
    skills: optionalString(value.skills),
  };
}
