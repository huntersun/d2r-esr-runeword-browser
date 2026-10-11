import type { PickerCustom } from './PickerList';

/** Offers any typed code without spaces ("Add code …"). */
export function codeCustom(what: string): PickerCustom {
  return (query) => (/^\S+$/.test(query) ? { value: query, label: `Add ${what} code “${query}”` } : null);
}

/** Offers a typed whole number ("Add id …"). */
export function idCustom(what: string): PickerCustom {
  return (query) => (/^\d+$/.test(query) ? { value: String(Number(query)), label: `Add ${what} id ${String(Number(query))}` } : null);
}

/** The ids as option values. */
export function idsToValues(ids: readonly number[]): readonly string[] {
  return ids.map(String);
}

/** Option values back to ids (anything that is not a number is dropped). */
export function valuesToIds(values: readonly string[]): readonly number[] {
  return values.map(Number).filter((id) => Number.isInteger(id));
}
