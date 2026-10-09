/**
 * Best base finder: which spawnable bases can hold a txt runeword row, for a given character, and in which order.
 */
import type { BaseItem, ClassCode, ItemTypeInfo, TxtRunewordRow } from './schema.ts';
import { minIlvlForSockets } from './sockets.ts';

/** Ethereal bases: −10 str/dex requirement, ×1.5 damage/defense (vanilla rules, shown as an estimate). */
const ETHEREAL_REQ_REDUCTION = 10;
const ETHEREAL_STAT_FACTOR = 1.5;

export interface Character {
  cls: ClassCode | 'any';
  level: number;
  str: number;
  dex: number;
}

export interface BestBaseOptions {
  /** Also return bases whose requirements the character does not meet yet (see `deficits`) */
  includeUnusable?: boolean;
  ethereal?: boolean;
}

export interface Deficits {
  lvl: number;
  str: number;
  dex: number;
}

export interface EligibleBase {
  base: BaseItem;
  /** Qualifying row with the fewest sockets (first in bundle order on ties) */
  row: TxtRunewordRow;
  /** Every row of the runeword the base qualifies for */
  rows: TxtRunewordRow[];
  /** max(base.reqLvl, row.reqLvl) */
  effectiveReqLvl: number;
  /** Requirements after the ethereal reduction */
  reqStr: number;
  reqDex: number;
  minIlvlForSockets: number;
  deficits: Deficits;
  usable: boolean;
  /** Damage/defense after the ethereal bonus; `estimate` when the bonus was applied */
  dmg1: [number, number] | null;
  dmg2: [number, number] | null;
  throwDmg: [number, number] | null;
  def: [number, number] | null;
  estimate: boolean;
  /** Ranking scores: average 1H / 2H damage (null when absent) and max defense */
  avgDmg1: number | null;
  avgDmg2: number | null;
  maxDef: number | null;
}

export interface FindEligibleBasesInput {
  rows: readonly TxtRunewordRow[];
  bases: readonly BaseItem[];
  types: ReadonlyMap<string, ItemTypeInfo>;
  character: Character;
  options?: BestBaseOptions;
}

export function fitsItemTypes(base: Pick<BaseItem, 'ancestors'>, row: Pick<TxtRunewordRow, 'itypes' | 'etypes'>): boolean {
  return row.itypes.some((code) => base.ancestors.includes(code)) && !row.etypes.some((code) => base.ancestors.includes(code));
}

export function fitsClass(base: Pick<BaseItem, 'cls'>, cls: Character['cls']): boolean {
  return cls === 'any' || base.cls === null || base.cls === cls;
}

function scale(pair: [number, number] | null, factor: number): [number, number] | null {
  return pair === null ? null : [Math.floor(pair[0] * factor), Math.floor(pair[1] * factor)];
}

function average(pair: [number, number] | null): number | null {
  return pair === null ? null : (pair[0] + pair[1]) / 2;
}

function toResult(base: BaseItem, rows: TxtRunewordRow[], minIlvl: number, input: FindEligibleBasesInput): EligibleBase | null {
  const row = rows.at(0);
  if (row === undefined) return null;
  const { character, options = {} } = input;
  const ethereal = options.ethereal === true && base.kind !== 'misc';
  const factor = ethereal ? ETHEREAL_STAT_FACTOR : 1;
  const reduction = ethereal ? ETHEREAL_REQ_REDUCTION : 0;

  const effectiveReqLvl = Math.max(base.reqLvl, row.reqLvl);
  const reqStr = Math.max(0, base.reqStr - reduction);
  const reqDex = Math.max(0, base.reqDex - reduction);
  const deficits: Deficits = {
    lvl: Math.max(0, effectiveReqLvl - character.level),
    str: Math.max(0, reqStr - character.str),
    dex: Math.max(0, reqDex - character.dex),
  };
  const usable = deficits.lvl === 0 && deficits.str === 0 && deficits.dex === 0;
  if (!usable && options.includeUnusable !== true) return null;

  const dmg1 = scale(base.dmg1, factor);
  const dmg2 = scale(base.dmg2, factor);
  const def = scale(base.def, factor);
  return {
    base,
    row,
    rows,
    effectiveReqLvl,
    reqStr,
    reqDex,
    minIlvlForSockets: minIlvl,
    deficits,
    usable,
    dmg1,
    dmg2,
    throwDmg: scale(base.throwDmg, factor),
    def,
    estimate: ethereal,
    avgDmg1: average(dmg1),
    avgDmg2: average(dmg2),
    maxDef: def === null ? null : def[1],
  };
}

/**
 * Bases that can hold at least one of the rows: item types fit (ancestors ∩ itypes ≠ ∅, ancestors ∩ etypes = ∅),
 * the base can roll the row's socket count at some item level, and the class lock allows the character.
 * Each base appears once, with the qualifying row that needs the fewest sockets.
 */
export function findEligibleBases(input: FindEligibleBasesInput): EligibleBase[] {
  const results: EligibleBase[] = [];
  for (const base of input.bases) {
    if (!fitsClass(base, input.character.cls)) continue;
    const thresholds = input.types.get(base.type)?.thresholds;
    if (thresholds === undefined) continue;

    const qualifying = input.rows
      .filter((row) => fitsItemTypes(base, row) && minIlvlForSockets(base, row.sockets, thresholds) !== null)
      .sort((a, b) => a.sockets - b.sockets);
    const first = qualifying.at(0);
    if (first === undefined) continue;

    const result = toResult(base, qualifying, minIlvlForSockets(base, first.sockets, thresholds) ?? 1, input);
    if (result !== null) results.push(result);
  }
  return results;
}

export type RankKind = BaseItem['kind'];

/** Damage score of a weapon: the higher of its 1H and 2H average damage, else its throw damage. */
export function damageScore(result: Pick<EligibleBase, 'avgDmg1' | 'avgDmg2' | 'throwDmg'>): number {
  const scores = [result.avgDmg1, result.avgDmg2].filter((score) => score !== null);
  if (scores.length > 0) return Math.max(...scores);
  return average(result.throwDmg) ?? 0;
}

const byName = (a: EligibleBase, b: EligibleBase) => a.base.name.localeCompare(b.base.name);

const COMPARATORS: Record<RankKind, (a: EligibleBase, b: EligibleBase) => number> = {
  // Higher damage, then faster (lower speed value), then lower str + dex requirement
  weapon: (a, b) =>
    damageScore(b) - damageScore(a) || a.base.speed - b.base.speed || a.reqStr + a.reqDex - (b.reqStr + b.reqDex) || byName(a, b),
  // Higher max defense, then (shields) higher block, then lower str requirement
  armor: (a, b) => (b.maxDef ?? 0) - (a.maxDef ?? 0) || (b.base.block ?? 0) - (a.base.block ?? 0) || a.reqStr - b.reqStr || byName(a, b),
  // Accessories: lowest required level first
  misc: (a, b) => a.effectiveReqLvl - b.effectiveReqLvl || byName(a, b),
};

/** Sorted copy of the results, best first, using the ranking of the given kind. */
export function rankBases(results: readonly EligibleBase[], kind: RankKind): EligibleBase[] {
  return [...results].sort(COMPARATORS[kind]);
}

/** Groups results by the base's immediate `type`, keeping the input order within and across groups. */
export function groupByType<T extends { base: Pick<BaseItem, 'type'> }>(results: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const result of results) {
    const list = groups.get(result.base.type) ?? [];
    list.push(result);
    groups.set(result.base.type, list);
  }
  return groups;
}

const NEXT_TIER_INDEX: Partial<Record<BaseItem['tier'], 1 | 2>> = { normal: 1, exceptional: 2 };

/** Next-tier member of the base's family (normal → exceptional → elite), if it is among `allBases`. */
export function upgradePath(base: Pick<BaseItem, 'code' | 'tier' | 'family'>, allBases: readonly BaseItem[]): BaseItem | null {
  const index = NEXT_TIER_INDEX[base.tier];
  if (index === undefined) return null;
  const code = base.family[index];
  if (code === '' || code === base.code) return null;
  return allBases.find((other) => other.code === code) ?? null;
}
