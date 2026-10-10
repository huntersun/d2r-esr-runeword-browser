/**
 * Typed access to the game tables used by the bundle builders.
 * Column names are the exact txt headers (they differ slightly between weapons/armor/misc).
 */
import type { TsvRow, TsvTable } from './tsv.ts';

export interface ItemTypeRow {
  name: string;
  code: string;
  parents: string[];
  bodyLoc: string;
  magic: boolean;
  rare: boolean;
  normal: boolean;
  maxSockets: [number, number, number];
  thresholds: [number, number];
  cls: string;
  ui: string;
  rwCats: string[];
}

export type ItemKind = 'weapon' | 'armor' | 'misc';

export interface ItemRow {
  kind: ItemKind;
  /** Internal (English) name column */
  name: string;
  namestr: string;
  code: string;
  type: string;
  type2: string;
  spawnable: number;
  quest: number;
  level: number;
  levelreq: number;
  reqstr: number;
  reqdex: number;
  gemsockets: number;
  normcode: string;
  ubercode: string;
  ultracode: string;
  mindam: number;
  maxdam: number;
  twoHandMindam: number;
  twoHandMaxdam: number;
  minmisdam: number;
  maxmisdam: number;
  speed: number;
  strBonus: number;
  dexBonus: number;
  minac: number;
  maxac: number;
  block: number;
  durability: number;
  nodurability: number;
  magicLvl: number;
  autoPrefix: number;
  invwidth: number;
  invheight: number;
}

export interface CharStatsRow {
  name: string;
  skillTabKeys: [string, string, string];
}

/** Numeric cell of a column that only some item tables have (e.g. `minac` is armor-only); 0 when absent. */
export function optNum(row: TsvRow, column: string): number {
  return row.has(column) ? row.num(column) : 0;
}

/** Text cell of a column that only some item tables have; '' when absent. */
export function optStr(row: TsvRow, column: string): string {
  return row.has(column) ? row.str(column) : '';
}

export function readItemTypes(table: TsvTable): ItemTypeRow[] {
  return table.rows.map((row) => ({
    name: row.str('ItemType'),
    code: row.str('Code'),
    parents: row.list('Equiv', 2),
    bodyLoc: row.str('BodyLoc1'),
    magic: row.num('Magic') === 1,
    rare: row.num('Rare') === 1,
    normal: row.num('Normal') === 1,
    maxSockets: [row.num('MaxSockets1'), row.num('MaxSockets2'), row.num('MaxSockets3')],
    thresholds: [row.num('MaxSocketsLevelThreshold1'), row.num('MaxSocketsLevelThreshold2')],
    cls: row.str('Class'),
    ui: row.str('UICategory'),
    rwCats: row.list('RunewordCategory', 2),
  }));
}

export function readItems(table: TsvTable, kind: ItemKind): ItemRow[] {
  return table.rows.map((row) => ({
    kind,
    name: row.str('name'),
    namestr: row.str('namestr'),
    code: row.str('code'),
    type: row.str('type'),
    type2: row.str('type2'),
    spawnable: row.num('spawnable'),
    quest: row.num('quest'),
    level: row.num('level'),
    levelreq: row.num('levelreq'),
    reqstr: optNum(row, 'reqstr'),
    reqdex: optNum(row, 'reqdex'),
    gemsockets: row.num('gemsockets'),
    normcode: optStr(row, 'normcode'),
    ubercode: optStr(row, 'ubercode'),
    ultracode: optStr(row, 'ultracode'),
    mindam: optNum(row, 'mindam'),
    maxdam: optNum(row, 'maxdam'),
    twoHandMindam: optNum(row, '2handmindam'),
    twoHandMaxdam: optNum(row, '2handmaxdam'),
    minmisdam: optNum(row, 'minmisdam'),
    maxmisdam: optNum(row, 'maxmisdam'),
    speed: optNum(row, 'speed'),
    strBonus: optNum(row, 'StrBonus'),
    dexBonus: optNum(row, 'DexBonus'),
    minac: optNum(row, 'minac'),
    maxac: optNum(row, 'maxac'),
    block: optNum(row, 'block'),
    durability: optNum(row, 'durability'),
    nodurability: optNum(row, 'nodurability'),
    magicLvl: optNum(row, 'magic lvl'),
    autoPrefix: optNum(row, 'auto prefix'),
    invwidth: optNum(row, 'invwidth'),
    invheight: optNum(row, 'invheight'),
  }));
}

export function readCharStats(table: TsvTable): CharStatsRow[] {
  return table.rows.map((row) => ({
    name: row.str('class'),
    skillTabKeys: [row.str('StrSkillTab1'), row.str('StrSkillTab2'), row.str('StrSkillTab3')],
  }));
}

/** One runes.txt recipe row (runewords and gemwords; the `Name` column is the string key, e.g. `Runeword871`). */
export interface RuneRecipeRow {
  key: string;
  itypes: string[];
  etypes: string[];
  /** Rune1-6 item codes in order, including `jew` / `mjw` socket fillers */
  codes: string[];
  /** T1Code1-7 / T1Param / T1Min / T1Max (a code may be a properties.txt or propertygroups.txt code) */
  mods: PropertyMod[];
}

/** One `{code, param, min, max}` property of an affix or recipe row. */
export interface PropertyMod {
  code: string;
  param: string | null;
  min: number;
  max: number;
}

/** Non-empty `<prefix>Code<n>` property columns, e.g. `mods(row, 'T1', 7)` or the affix `mod1code` layout. */
function readMods(row: TsvRow, n: number, column: (i: number, part: 'code' | 'param' | 'min' | 'max') => string): PropertyMod[] {
  const mods: PropertyMod[] = [];
  for (let i = 1; i <= n; i++) {
    const code = row.str(column(i, 'code'));
    if (code === '') continue;
    const param = row.str(column(i, 'param'));
    mods.push({ code, param: param === '' ? null : param, min: row.num(column(i, 'min')), max: row.num(column(i, 'max')) });
  }
  return mods;
}

const RUNE_MOD_COLUMN = { code: 'Code', param: 'Param', min: 'Min', max: 'Max' } as const;

export function readRuneRecipes(table: TsvTable): RuneRecipeRow[] {
  return table.rows.map((row) => ({
    key: row.str('Name'),
    itypes: row.list('itype', 6),
    etypes: row.list('etype', 3),
    codes: row.list('Rune', 6),
    mods: readMods(row, 7, (i, part) => `T1${RUNE_MOD_COLUMN[part]}${String(i)}`),
  }));
}

export type AffixKind = 'p' | 's' | 'a';

/** One magicprefix / magicsuffix / automagic row (identical 39 columns). */
export interface AffixRow {
  kind: AffixKind;
  name: string;
  spawnable: number;
  rare: number;
  level: number;
  maxlevel: number;
  levelreq: number;
  classspecific: string;
  cls: string;
  classlevelreq: number;
  frequency: number;
  group: number;
  mods: PropertyMod[];
  itypes: string[];
  etypes: string[];
}

export function readAffixes(table: TsvTable, kind: AffixKind): AffixRow[] {
  return table.rows.map((row) => ({
    kind,
    name: row.str('Name'),
    spawnable: row.num('spawnable'),
    rare: row.num('rare'),
    level: row.num('level'),
    maxlevel: row.num('maxlevel'),
    levelreq: row.num('levelreq'),
    classspecific: row.str('classspecific'),
    cls: row.str('class'),
    classlevelreq: row.num('classlevelreq'),
    frequency: row.num('frequency'),
    group: row.num('group'),
    mods: readMods(row, 3, (i, part) => `mod${String(i)}${part}`),
    itypes: row.list('itype', 7),
    etypes: row.list('etype', 5),
  }));
}
