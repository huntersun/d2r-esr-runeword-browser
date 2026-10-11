/** Helpers shared by the evaluator and the validator for number and named matches. */
import type { NamedMatch, NamedValue, NumberMatch } from './types.ts';

// Array.isArray does not narrow readonly arrays out of a union, so these guards do.
export function isNumberList(value: NumberMatch): value is readonly number[] {
  return Array.isArray(value);
}

export function isNamedList<N extends string>(value: NamedMatch<N>): value is readonly NamedValue<N>[] {
  return Array.isArray(value);
}

/** Resolves a name or number to its number; `offset` is the number of the first name (1 for the qualities, else 0). */
export function namedToNumber(value: string | number, names: readonly string[], offset: number): number | undefined {
  if (typeof value === 'number') return value;
  const index = names.indexOf(value);
  return index < 0 ? undefined : index + offset;
}
