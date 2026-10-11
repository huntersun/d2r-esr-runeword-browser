/**
 * Value conversions behind the rule editor's match controls.
 *
 * Number matches (`itemLevel`, `sockets`, `maxSockets`): one value, a list, or a `{ min, max }` range.
 * Named matches (`quality`, `baseTier`, `difficulty`): the same shapes over names or their numbers. A value the
 * user picks is stored as a name; numbers from the file stay numbers until the user changes that part.
 */
import {
  BASE_TIERS,
  DIFFICULTIES,
  QUALITIES,
  type NamedMatch,
  type NamedRange,
  type NamedValue,
  type NumberMatch,
  type NumberRange,
} from '../engine/types';

// Array.isArray does not narrow readonly arrays out of a union, so these guards do.
export function isNumberList(value: NumberMatch): value is readonly number[] {
  return Array.isArray(value);
}

export function isNamedList<N extends string>(value: NamedMatch<N>): value is readonly NamedValue<N>[] {
  return Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Number matches
// ---------------------------------------------------------------------------

export const NUMBER_MATCH_MODES = ['any', 'exactly', 'list', 'range'] as const;
export type NumberMatchMode = (typeof NUMBER_MATCH_MODES)[number];

export function numberMatchMode(value: NumberMatch | undefined): NumberMatchMode {
  if (value === undefined) return 'any';
  if (typeof value === 'number') return 'exactly';
  return isNumberList(value) ? 'list' : 'range';
}

/** Every number the match mentions, in order (range bounds min then max). */
function numbersOf(value: NumberMatch | undefined): number[] {
  if (value === undefined) return [];
  if (typeof value === 'number') return [value];
  if (isNumberList(value)) return [...value];
  return [value.min, value.max].filter((bound) => bound !== undefined);
}

/**
 * The match in another mode, keeping what it can: exactly takes the first number, a list keeps all of them,
 * a range spans them (`{ min: N, max: N }` from a single value). `fallback` fills an empty match.
 */
export function convertNumberMatch(value: NumberMatch | undefined, mode: NumberMatchMode, fallback: number): NumberMatch | undefined {
  if (mode === numberMatchMode(value)) return value;
  const numbers = numbersOf(value);
  switch (mode) {
    case 'any':
      return undefined;
    case 'exactly':
      return numbers[0] ?? fallback;
    case 'list':
      return numbers.length === 0 ? [fallback] : [...new Set(numbers)];
    case 'range':
      return numbers.length === 0 ? { min: fallback } : { min: Math.min(...numbers), max: Math.max(...numbers) };
  }
}

/** Sets or clears one bound; a range keeps whichever bounds are left (`undefined`, "any", when both are cleared). */
export function setRangeBound(range: NumberRange, bound: 'min' | 'max', value: number | undefined): NumberRange | undefined {
  const min = bound === 'min' ? value : range.min;
  const max = bound === 'max' ? value : range.max;
  if (min === undefined && max === undefined) return undefined;
  return { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
}

/** `"1, 2 3"` → `[1, 2, 3]`; whole numbers separated by commas or spaces. Empty or anything else → null. */
export function parseNumberList(text: string): number[] | null {
  const parts = text.split(/[\s,]+/).filter((part) => part !== '');
  if (parts.length === 0) return null;
  const numbers = parts.map(Number);
  return numbers.every((number) => Number.isInteger(number)) ? numbers : null;
}

export function formatNumberList(list: readonly number[]): string {
  return list.join(', ');
}

/** Short text for a number match: `3`, `1, 2`, `2–4`, `≥3`, `≤2`. */
export function formatNumberMatch(value: NumberMatch): string {
  if (typeof value === 'number') return String(value);
  if (isNumberList(value)) return formatNumberList(value);
  return formatRange(value.min === undefined ? undefined : String(value.min), value.max === undefined ? undefined : String(value.max));
}

function formatRange(min: string | undefined, max: string | undefined): string {
  if (min !== undefined && max !== undefined) return min === max ? min : `${min}–${max}`;
  if (min !== undefined) return `≥${min}`;
  if (max !== undefined) return `≤${max}`;
  return 'any';
}

// ---------------------------------------------------------------------------
// Named matches
// ---------------------------------------------------------------------------

export const NAMED_MATCH_MODES = ['any', 'one', 'several', 'range'] as const;
export type NamedMatchMode = (typeof NAMED_MATCH_MODES)[number];

/** The names of a named condition and the number of the first name (quality 1, base tier and difficulty 0). */
export interface NamedScale<N extends string> {
  readonly names: readonly N[];
  readonly offset: number;
}

export const QUALITY_SCALE = { names: QUALITIES, offset: 1 } as const;
export const BASE_TIER_SCALE = { names: BASE_TIERS, offset: 0 } as const;
export const DIFFICULTY_SCALE = { names: DIFFICULTIES, offset: 0 } as const;

export function namedMatchMode<N extends string>(value: NamedMatch<N> | undefined): NamedMatchMode {
  if (value === undefined) return 'any';
  if (typeof value === 'object') return isNamedList(value) ? 'several' : 'range';
  return 'one';
}

/** The name a value stands for; `undefined` for a number outside the scale. */
export function namedValueName<N extends string>(value: NamedValue<N>, scale: NamedScale<N>): N | undefined {
  if (typeof value === 'string') return scale.names.includes(value) ? value : undefined;
  return scale.names[value - scale.offset];
}

/** Position of the value on the scale (0-based); `undefined` when it is not on it. */
function positionOf<N extends string>(value: NamedValue<N>, scale: NamedScale<N>): number | undefined {
  const name = namedValueName(value, scale);
  return name === undefined ? undefined : scale.names.indexOf(name);
}

/** Every value the match mentions (range bounds min then max). */
function namedValuesOf<N extends string>(value: NamedMatch<N> | undefined): NamedValue<N>[] {
  if (value === undefined) return [];
  if (typeof value !== 'object') return [value];
  if (isNamedList(value)) return [...value];
  return [value.min, value.max].filter((bound) => bound !== undefined);
}

/** Names on the scale in scale order, without duplicates; values off the scale are dropped. */
function toNames<N extends string>(values: readonly NamedValue<N>[], scale: NamedScale<N>): N[] {
  const names = new Set(values.map((value) => namedValueName(value, scale)).filter((name) => name !== undefined));
  return scale.names.filter((name) => names.has(name));
}

/**
 * The match in another mode, as names: one takes the first value, several keeps all of them, a range spans
 * them. An empty match starts at the first name.
 */
export function convertNamedMatch<N extends string>(
  value: NamedMatch<N> | undefined,
  mode: NamedMatchMode,
  scale: NamedScale<N>
): NamedMatch<N> | undefined {
  if (mode === namedMatchMode(value)) return value;
  const names = toNames(namedValuesOf(value), scale);
  const first = names.at(0) ?? scale.names[0];
  switch (mode) {
    case 'any':
      return undefined;
    case 'one':
      return first;
    case 'several':
      return names.length === 0 ? [first] : names;
    case 'range':
      return { min: first, max: names.at(-1) ?? first };
  }
}

/** Adds or removes a name from a list match; the result is names in scale order. */
export function toggleNamedValue<N extends string>(
  list: readonly NamedValue<N>[],
  name: N,
  scale: NamedScale<N>
): readonly NamedValue<N>[] {
  const names = toNames(list, scale);
  return names.includes(name) ? names.filter((current) => current !== name) : toNames([...names, name], scale);
}

/** True when the list mentions the name (by name or number). */
export function namedListHas<N extends string>(list: readonly NamedValue<N>[], name: N, scale: NamedScale<N>): boolean {
  return list.some((value) => namedValueName(value, scale) === name);
}

/** Sets or clears one bound of a named range (the other bound keeps its form, name or number); both cleared → `undefined`. */
export function setNamedRangeBound<N extends string>(
  range: NamedRange<N>,
  bound: 'min' | 'max',
  name: N | undefined
): NamedRange<N> | undefined {
  const min = bound === 'min' ? name : range.min;
  const max = bound === 'max' ? name : range.max;
  if (min === undefined && max === undefined) return undefined;
  return { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
}

/** Short text for a named match: `unique`, `set/unique`, `magic–rare`, `≥rare`. Numbers show as names when known. */
export function formatNamedMatch<N extends string>(value: NamedMatch<N>, scale: NamedScale<N>): string {
  const show = (item: NamedValue<N>): string => namedValueName(item, scale) ?? String(item);
  if (typeof value !== 'object') return show(value);
  if (isNamedList(value)) return value.map(show).join('/');
  const min = value.min === undefined ? undefined : show(value.min);
  const max = value.max === undefined ? undefined : show(value.max);
  if (value.min !== undefined && value.max !== undefined && positionOf(value.min, scale) === positionOf(value.max, scale)) {
    return min ?? '';
  }
  return formatRange(min, max);
}
