/**
 * Shape of the static game-data bundles under `public/game-data/`.
 * Bump GAME_DATA_SCHEMA whenever a bundle shape changes incompatibly.
 */
export const GAME_DATA_SCHEMA = 1;

export type ClassCode = 'ama' | 'sor' | 'nec' | 'pal' | 'bar' | 'dru' | 'ass' | 'war';
export type GameDataFile = 'types' | 'bases' | 'runewords' | 'affixes' | 'sources';

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
  strBonus: number;
  dexBonus: number;
  def: [number, number] | null;
  block: number | null;
  durability: number;
  indestructible: boolean;
  magicLvl: number;
  autoGroup: number | null;
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
