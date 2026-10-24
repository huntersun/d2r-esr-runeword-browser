/**
 * Shape of the static game-data bundles under `public/game-data/`.
 * Bump GAME_DATA_SCHEMA whenever a bundle shape changes incompatibly.
 */
export const GAME_DATA_SCHEMA = 1;

export type ClassCode = 'ama' | 'sor' | 'nec' | 'pal' | 'bar' | 'dru' | 'ass' | 'war';
export type GameDataFile = 'types' | 'bases' | 'runewords' | 'affixes' | 'sources' | 'lootfilter';

export interface GameDataManifest {
  schema: number;
  esrVersion: string;
  esrTag: string | null;
  esrCommit: string;
  generatedAt: string;
  files: Partial<Record<GameDataFile, { hash: string; bytes: number }>>;
  counts: Record<string, number>;
  warnings: string[];
}

export interface TypesBundle {
  types: ItemTypeInfo[];
  classes: ClassInfo[];
}

export interface ItemTypeInfo {
  code: string;
  name: string;
  parents: string[];
  /** Includes the type itself */
  ancestors: string[];
  sockets: [number, number, number];
  thresholds: [number, number];
  cls: ClassCode | null;
  ui: string | null;
  rwCats: string[];
  magic: boolean;
  rare: boolean;
  normal: boolean;
  bodyLoc: string | null;
}

export interface ClassInfo {
  code: ClassCode;
  name: string;
  tabs: [string, string, string];
}

export interface BasesBundle {
  bases: BaseItem[];
  /**
   * The automagic.txt rows some base can roll (`BaseItem.automods` ids), sorted by id. Always written by the generator;
   * optional only so hand-built test bundles can leave it out.
   */
  automods?: BaseAutomod[];
}

/** One automagic.txt row as shown on base cards (a subset of the affixes.json `Affix` with kind `a`). */
export interface BaseAutomod {
  /** 0-based automagic.txt row index (= `Affix.id` of the kind `a` affix) */
  id: number;
  /** String-resolved name; '' for ESR's "null" placeholder rows */
  name: string;
  lvl: number;
  /** 0 = no maximum */
  maxLvl: number;
  reqLvl: number;
  /** Rendered stat lines (same text as the Affixes page) */
  text: string[];
}

export interface BaseItem {
  code: string;
  name: string;
  kind: 'weapon' | 'armor' | 'misc';
  type: string;
  type2: string | null;
  /** Union over type + type2 */
  ancestors: string[];
  tier: 'normal' | 'exceptional' | 'elite' | 'mythical';
  /** norm / uber / ultra codes */
  family: [string, string, string];
  qlvl: number;
  reqLvl: number;
  reqStr: number;
  reqDex: number;
  gemSockets: number;
  /** min(gemSockets, own-type MaxSockets1/2/3) */
  socketCaps: [number, number, number];
  dmg1: [number, number] | null;
  dmg2: [number, number] | null;
  throwDmg: [number, number] | null;
  speed: number;
  /** weapons.txt `rangeadder`; omitted when 0 or blank */
  range?: number;
  strBonus: number;
  dexBonus: number;
  def: [number, number] | null;
  block: number | null;
  durability: number;
  indestructible: boolean;
  magicLvl: number;
  autoGroup: number | null;
  /**
   * ids of the `BasesBundle.automods` rows this base can roll: `group == autoGroup`, an itype among the ancestors and no
   * etype, class lock, and an affix level range reachable at some item level. One of them is picked per item. Omitted
   * when empty (no group, or a group with only invisible placeholder rows).
   */
  automods?: number[];
  /** itemtypes.txt `StaffMods` of the base's own `type` row: random +skill bonuses of this class; omitted when none */
  staffMods?: ClassCode;
  cls: ClassCode | null;
  inv: [number, number];
}

// Phase 2
export interface TxtRunewordsBundle {
  runewords: TxtRuneword[];
}

/** key = 'Runeword871' */
export interface TxtRuneword {
  key: string;
  name: string;
  rows: TxtRunewordRow[];
}

export interface TxtRunewordRow {
  /** Display names, jew/mjw removed and counted in `jewels` */
  ingredients: string[];
  codes: string[];
  jewels: number;
  sockets: number;
  itypes: string[];
  etypes: string[];
  /** Max ingredient levelreq */
  reqLvl: number;
  /** Runeword stats rendered from T1Code1-7 (incl. propertygroups pools); rune bonuses are not included */
  text: string[];
}

// Phase 3
export interface AffixesBundle {
  affixes: Affix[];
}

export interface Affix {
  id: number;
  kind: 'p' | 's' | 'a';
  name: string;
  lvl: number;
  maxLvl: number;
  reqLvl: number;
  /** `classspecific`: only spawns on items of this class */
  cls: ClassCode | null;
  /** `class`: characters of this class need `clsReqLvl` instead of `reqLvl` */
  reqCls: ClassCode | null;
  clsReqLvl: number;
  freq: number;
  group: number;
  rare: boolean;
  itypes: string[];
  etypes: string[];
  mods: AffixMod[];
  text: string[];
}

export interface AffixMod {
  prop: string;
  param: string | null;
  min: number;
  max: number;
}

export const CLASS_CODES: readonly ClassCode[] = ['ama', 'sor', 'nec', 'pal', 'bar', 'dru', 'ass', 'war'];

export function isClassCode(value: string): value is ClassCode {
  return (CLASS_CODES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// sources.json: where an item comes from (qualitative labels derived from the game files)
// ---------------------------------------------------------------------------

/** Order of precedence when several labels apply: cube, boss, maps, drop, buy, gamble, plugin, unknown */
export type SourceKind = 'cube' | 'boss' | 'maps' | 'drop' | 'buy' | 'gamble' | 'plugin' | 'unknown';

export interface SourceLabel {
  kind: SourceKind;
  /** Player-facing text, e.g. "Cube: Ancient Coupon", "Drops from Diablo Clone", "Buy: Gheed" */
  text: string;
}

export interface ItemSource {
  /** Display name (unique/set item name, or the misc item's string name) */
  name: string;
  /** Base code (uniques/sets) or item code (misc) */
  code: string;
  item: 'unique' | 'set' | 'misc';
  labels: SourceLabel[];
}

export interface SourcesBundle {
  items: ItemSource[];
}

// ---------------------------------------------------------------------------
// lootfilter.json: reference data for the loot-filter editor (pickers + validator)
// ---------------------------------------------------------------------------

export interface LootFilterItem {
  code: string;
  /** Display name (namestr through the string table, else the `name` column) */
  name: string;
  kind: 'weapon' | 'armor' | 'misc';
  /** itemtypes.txt code of the `type` column */
  type: string;
  /** itemtypes.txt code of the `type2` column, when the row has one (the game treats the item as both types) */
  type2?: string;
  /**
   * Position in the weapons/armor tier family (`normcode`/`ubercode`/`ultracode`); only set when the three family codes
   * differ. Omitted for misc rows and for items without a tier family (rings, amulets, charms, jewels, arrows, ESR
   * mythical bases, quest rows), whose three family columns all hold the item's own code.
   */
  tier?: 'normal' | 'exceptional' | 'elite';
  /** `spawnable` = 1; non-spawnable rows are kept (uniques sit on non-spawnable "shadow" bases) */
  spawnable: boolean;
}

/** A unique (uniqueitems.txt) or set item (setitems.txt) */
export interface LootFilterUniqueOrSet {
  /** 0-based data-row number as the game loads the table (what the plugin's uniqueOrSetIds match) */
  id: number;
  name: string;
  /** Base item code */
  code: string;
}

export interface LootFilterDataBundle {
  /** Every weapons/armor/misc row with a code, first row per code */
  items: LootFilterItem[];
  /** Every itemstatcost.txt row: id = row number (= `*ID`), name = `Stat` */
  stats: { id: number; name: string }[];
  /** Every levels.txt row with an `Id`; act is the 0-based `Act` column */
  areas: { id: number; name: string; act: number }[];
  /** sounds.txt `Sound` by row number (`sounds[row]`; row 0 is the blank "none" row) */
  sounds: string[];
  uniques: LootFilterUniqueOrSet[];
  sets: LootFilterUniqueOrSet[];
}
