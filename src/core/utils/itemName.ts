/**
 * Item-name normalisation shared by the exact-name focus (`?name=`) and the sources lookup.
 * Plain TS with no DOM or `@/` imports: the game-data build scripts compile it too.
 */

/** Trim, collapse whitespace, unify quotes/apostrophes and dashes, case-fold. */
export function normaliseItemName(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[‘’‚‛′´`]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
