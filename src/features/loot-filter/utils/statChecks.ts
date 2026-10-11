/** Helpers for the rule editor's stat check rows (`itemStats`, `itemStatsAnyOf`, `playerStats`, `playerStatsAnyOf`). */
import type { StatCheck, StatOp } from '../engine/types';
import type { LootFilterLookup } from './lookup';

export const DEFAULT_STAT_OP: StatOp = '>=';

/** A new row for the picked stat: `>= 1`. */
export function newStatCheck(stat: string | number): StatCheck {
  return { stat, op: DEFAULT_STAT_OP, value: 1 };
}

/** What the user typed as a stat: whole digits are an id (number), anything else a name. Empty → null. */
export function parseStatInput(text: string): string | number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

/** Changes the op; `between` turns the value into `[v, v]`, leaving it takes the low end. */
export function setStatOp(check: StatCheck, op: StatOp): StatCheck {
  const { value } = check;
  if (op === 'between') return { ...check, op, value: typeof value === 'number' ? [value, value] : value };
  return { ...check, op, value: typeof value === 'number' ? value : value[0] };
}

/** Sets the value (`index` 0 is the value or the low end, 1 the high end of a `between`). */
export function setStatValue(check: StatCheck, index: 0 | 1, next: number): StatCheck {
  const { value } = check;
  if (typeof value === 'number') return index === 0 ? { ...check, value: next } : { ...check, value: [value, next] };
  return { ...check, value: index === 0 ? [next, value[1]] : [value[0], next] };
}

/** Sets or removes `param`. */
export function setStatParam(check: StatCheck, param: number | undefined): StatCheck {
  const { param: _old, ...rest } = check;
  return param === undefined ? rest : { ...rest, param };
}

/** Replaces the row at `index`. */
export function replaceStatCheck(list: readonly StatCheck[], index: number, check: StatCheck): readonly StatCheck[] {
  return list.map((current, position) => (position === index ? check : current));
}

/** Removes the row at `index`; an emptied list is `undefined` (the key goes away). */
export function removeStatCheck(list: readonly StatCheck[], index: number): readonly StatCheck[] | undefined {
  const next = list.filter((_, position) => position !== index);
  return next.length === 0 ? undefined : next;
}

/** `item_numsockets ≥2`, `strength[1] 5–10` (between), `#96 >0` (an unknown id), `? ≥1` (no stat yet). */
export function formatStatCheck(check: StatCheck, lookup: LootFilterLookup): string {
  const stat =
    typeof check.stat === 'number' ? (lookup.statName(check.stat) ?? `#${String(check.stat)}`) : check.stat === '' ? '?' : check.stat;
  const param = check.param === undefined ? '' : `[${String(check.param)}]`;
  const op = check.op ?? DEFAULT_STAT_OP;
  const value = typeof check.value === 'number' ? String(check.value) : `${String(check.value[0])}–${String(check.value[1])}`;
  const shownOp = op === '>=' ? '≥' : op === '<=' ? '≤' : op === 'between' ? '' : op;
  return `${stat}${param} ${shownOp}${value}`.replace(/\s+/g, ' ');
}
