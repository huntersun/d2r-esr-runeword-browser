import type { PickerCustom } from './PickerList';

/** Offers any typed code without spaces ("Add code …"). */
export function codeCustom(what: string): PickerCustom {
  return (query) => (/^\S+$/.test(query) ? { value: query, label: `Add ${what} code “${query}”` } : null);
}

/** Offers a typed whole number of up to six digits ("Add id …"), normalised (`007` → `7`). */
export function idCustom(what: string): PickerCustom {
  return (query) => {
    if (!/^\d{1,6}$/.test(query)) return null;
    const id = String(Number(query));
    return { value: id, label: `Add ${what} id ${id}` };
  };
}

/** The ids as option values. */
export function idsToValues(ids: readonly number[]): readonly string[] {
  return ids.map(String);
}

/** Option values back to ids (anything that is not a whole number is dropped). */
export function valuesToIds(values: readonly string[]): readonly number[] {
  return values.filter((value) => /^\d+$/.test(value)).map(Number);
}
