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

/** One per-item set bonus group: active while `pieces` items of the set are worn. */
export interface SetBonusGroupSnapshot {
  readonly pieces: number;
  readonly lines: readonly string[];
}

/** Snapshot for a set item (from the sets.json game-data bundle). */
export interface SetItemSnapshot {
  readonly name: string;
  /** Display name of the set (hireling sets share it across difficulties; `setId` is unique). */
  readonly setName: string;
  /** sets.txt `index` of the set; groups equipped pieces for the set bonuses. */
  readonly setId: string;
  readonly baseItem: string;
  readonly category: string;
  readonly reqLevel: number;
  /** The item's own property lines. */
  readonly properties: readonly string[];
  /** The item's own partial bonuses (need N items of the set). */
  readonly partial: readonly SetBonusGroupSnapshot[];
}

/** The author's chosen base for a runeword (bases.json `code`); absent on builds saved before it existed */
export interface RunewordBaseChoice {
  readonly code: string;
  readonly name: string;
}

// `base` and `socketed` are AUTHOR CHOICES, not snapshots: the version diff ignores them,
// and a snapshot refresh (resolveCurrentRef / refreshBuildData) carries them over unchanged.

export interface UniqueItemRef {
  readonly type: 'unique';
  readonly id: number;
  readonly snapshot: UniqueSnapshot;
  /** Author-chosen socket fillers (rune / gem / crystal / jewel names, free text allowed), in socket order */
  readonly socketed?: readonly string[];
}

export interface MythicalItemRef {
  readonly type: 'mythical';
  readonly id: number;
  readonly snapshot: UniqueSnapshot;
  /** Author-chosen socket fillers (rune / gem / crystal / jewel names, free text allowed), in socket order */
  readonly socketed?: readonly string[];
}

export interface RunewordItemRef {
  readonly type: 'runeword';
  readonly name: string;
  readonly variant: number;
  readonly snapshot: RunewordSnapshot;
  readonly base?: RunewordBaseChoice;
  /** Author-chosen fillers for the runeword's free (jewel) sockets, in socket order */
  readonly socketed?: readonly string[];
}

export interface GemwordItemRef {
  readonly type: 'gemword';
  readonly name: string;
  readonly variant: number;
  readonly snapshot: GemwordSnapshot;
}

/** A set item, identified by its name (set item names are unique across sets.json). */
export interface SetItemRef {
  readonly type: 'set';
  readonly name: string;
  readonly snapshot: SetItemSnapshot;
  /** Author-chosen socket fillers (rune / gem / crystal / jewel names, free text allowed), in socket order */
  readonly socketed?: readonly string[];
}

export interface FreetextItemRef {
  readonly type: 'freetext';
  readonly name: string;
}

export type ItemRef = UniqueItemRef | MythicalItemRef | RunewordItemRef | GemwordItemRef | SetItemRef | FreetextItemRef;

/** Item refs that can carry socket fillers (gemword sockets are the recipe; freetext has nothing to attach to). */
export type SocketableItemRef = UniqueItemRef | MythicalItemRef | RunewordItemRef | SetItemRef;

/** Most socket fillers stored on one item (the largest socket count in the game). */
export const SOCKETED_MAX_ENTRIES = 6;
/** Longest filler name / base code / base name accepted. */
export const ITEM_CHOICE_MAX_LENGTH = 100;

export function supportsSocketed(ref: ItemRef): ref is SocketableItemRef {
  return ref.type === 'unique' || ref.type === 'mythical' || ref.type === 'runeword' || ref.type === 'set';
}

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

function isSetBonusGroup(value: unknown): boolean {
  return isRecord(value) && typeof value.pieces === 'number' && isStringArray(value.lines);
}

function isSetItemSnapshot(s: UnknownRecord): boolean {
  return (
    typeof s.name === 'string' &&
    typeof s.setName === 'string' &&
    typeof s.setId === 'string' &&
    typeof s.baseItem === 'string' &&
    typeof s.category === 'string' &&
    typeof s.reqLevel === 'number' &&
    isStringArray(s.properties) &&
    Array.isArray(s.partial) &&
    s.partial.every(isSetBonusGroup)
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
    case 'set':
      return typeof value.name === 'string' && isSetItemSnapshot(snapshot);
    default:
      return false;
  }
}

const isChoiceText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= ITEM_CHOICE_MAX_LENGTH;

/** A stored runeword base choice, or undefined when absent or malformed. */
export function asRunewordBaseChoice(value: unknown): RunewordBaseChoice | undefined {
  if (!isRecord(value) || !isChoiceText(value.code) || !isChoiceText(value.name)) return undefined;
  return { code: value.code.trim(), name: value.name.trim() };
}

/**
 * Stored socket fillers, cleaned: trimmed, blank / non-string / over-long entries dropped, at most
 * SOCKETED_MAX_ENTRIES kept. Undefined when absent, not an array, or nothing valid is left.
 */
export function asSocketed(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const fillers = value
    .filter(isChoiceText)
    .map((entry) => entry.trim())
    .slice(0, SOCKETED_MAX_ENTRIES);
  return fillers.length > 0 ? fillers : undefined;
}

/**
 * Re-validates the optional author choices (`base`, `socketed`) of a ref that passed isItemRef:
 * malformed ones are dropped, never the item. Refs without them are returned as is, and the fields
 * are left alone on types that do not use them (unknown keys are ignored, as everywhere else).
 */
export function sanitizeItemRef(ref: ItemRef): ItemRef {
  if (!supportsSocketed(ref)) return ref;
  const raw = ref as unknown as UnknownRecord;
  const choiceKeys = ref.type === 'runeword' ? ['base', 'socketed'] : ['socketed'];
  if (!choiceKeys.some((key) => key in raw)) return ref;
  const rest = Object.fromEntries(Object.entries(raw).filter(([key]) => !choiceKeys.includes(key)));
  const base = ref.type === 'runeword' ? asRunewordBaseChoice(raw.base) : undefined;
  const socketed = asSocketed(raw.socketed);
  return {
    ...rest,
    ...(base !== undefined ? { base } : {}),
    ...(socketed !== undefined ? { socketed } : {}),
  } as unknown as ItemRef;
}

function itemSection(value: unknown): Record<string, ItemRef> | undefined {
  const section = filterEntries(value, isItemRef);
  if (section === undefined) return undefined;
  return Object.fromEntries(Object.entries(section).map(([slot, ref]) => [slot, sanitizeItemRef(ref)]));
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
 * crashing the detail/edit screens. A malformed `base` / `socketed` drops just that field.
 */
export function asBuildData(value: unknown): BuildData {
  if (!isRecord(value)) return {};
  return {
    items: itemSection(value.items),
    weaponSwap: itemSection(value.weaponSwap),
    mercenary: itemSection(value.mercenary),
    itemNotes: filterEntries(value.itemNotes, isString),
    weaponSwapNotes: filterEntries(value.weaponSwapNotes, isString),
    mercenaryNotes: filterEntries(value.mercenaryNotes, isString),
    charms: Array.isArray(value.charms) ? value.charms.filter(isString) : undefined,
    ascendancy: optionalString(value.ascendancy),
    skills: optionalString(value.skills),
  };
}
