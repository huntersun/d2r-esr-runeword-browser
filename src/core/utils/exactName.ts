/**
 * Exact-name focus (`?name=<Name>` on the list screens): shows only the items whose name equals the
 * given one (see normaliseItemName: case, whitespace, quotes/apostrophes and dashes are unified).
 * Unlike the free-text search it never matches affix or property text, and while it is set the
 * screen's other filters are ignored so the named item is always visible.
 */
import { normaliseItemName } from './itemName';

/** Parses the `name` URL param: null when absent or blank, otherwise the trimmed name. */
export function parseExactNameParam(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** True when no exact name is set, or `name` equals it after normalisation. */
export function matchesExactName(name: string, exactName: string | null): boolean {
  if (exactName === null) return true;
  return normaliseItemName(name) === normaliseItemName(exactName);
}

/**
 * Applies the exact-name focus to an item list: with a name set, returns only the items with that
 * name and skips `applyOtherFilters` entirely; otherwise returns `applyOtherFilters(items)`.
 */
export function applyExactNameFocus<T extends { readonly name: string }>(
  items: readonly T[],
  exactName: string | null,
  applyOtherFilters: (items: readonly T[]) => T[]
): T[] {
  if (exactName === null) return applyOtherFilters(items);
  return items.filter((item) => matchesExactName(item.name, exactName));
}
