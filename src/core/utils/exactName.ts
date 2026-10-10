/**
 * Exact-name focus (`?name=<Name>` on the list screens): shows only the items whose name equals the
 * given one, case-insensitively and with typographic apostrophes/quotes treated as straight ones.
 * Unlike the free-text search it never matches affix or property text.
 */

/** Lowercases, trims, collapses whitespace and straightens ‘ ’ ‛ ′ ` and “ ” ″ so names compare reliably. */
export function normalizeItemName(name: string): string {
  return name
    .replace(/[‘’‛′`]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Parses the `name` URL param: null when absent or blank, otherwise the trimmed name. */
export function parseExactNameParam(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** True when no exact name is set, or `name` equals it (see normalizeItemName). */
export function matchesExactName(name: string, exactName: string | null): boolean {
  if (exactName === null) return true;
  return normalizeItemName(name) === normalizeItemName(exactName);
}
