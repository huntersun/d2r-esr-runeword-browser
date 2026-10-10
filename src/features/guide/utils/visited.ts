/**
 * "Visited notes" progress (per viewer, localStorage via usePersistentState). Pure helpers, unit-tested in visited.test.ts.
 */

export const VISITED_STORAGE_KEY = 'guide.visited';
/** Most slugs kept; the oldest visits drop off first. */
export const VISITED_CAP = 200;

export function isVisitedList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Adds `slug` as the most recent visit (moved to the end when already present), keeping at most `cap` slugs.
 * Returns the same array when nothing changes (already the most recent visit), so a state update is a no-op.
 */
export function addVisited(list: readonly string[], slug: string, cap = VISITED_CAP): readonly string[] {
  if (list.at(-1) === slug && list.length <= cap) return list;
  const next = [...list.filter((item) => item !== slug), slug];
  return next.length > cap ? next.slice(next.length - cap) : next;
}
