/**
 * Home page cross-section search: ranks item names per category and builds the link of a picked result.
 * Pure (no Dexie, no DOM) so it is unit-tested; the home search component feeds it the names it has loaded.
 */
import { NAME_FOCUS_PAGES } from '@/features/guide/engine/linkSchemes';
import { normaliseItemName } from '@/core/utils/itemName';

export type HomeSearchCategory = 'runewords' | 'gemwords' | 'uniques' | 'mythicals' | 'bases';

export interface HomeSearchCategoryInfo {
  readonly key: HomeSearchCategory;
  readonly label: string;
}

/** Results popover groups, in display order. */
export const HOME_SEARCH_CATEGORIES: readonly HomeSearchCategoryInfo[] = [
  { key: 'runewords', label: 'Runewords' },
  { key: 'gemwords', label: 'Gemwords' },
  { key: 'uniques', label: 'Uniques' },
  { key: 'mythicals', label: 'Mythicals' },
  { key: 'bases', label: 'Bases' },
];

/** Results shown per group. */
export const HOME_SEARCH_GROUP_LIMIT = 6;

export type HomeSearchSources = Partial<Record<HomeSearchCategory, readonly string[]>>;

export interface HomeSearchGroup {
  readonly category: HomeSearchCategory;
  readonly label: string;
  readonly names: readonly string[];
}

/** 0 exact, 1 name starts with the query, 2 a later word starts with it, 3 anywhere else; null when it does not match. */
function matchRank(name: string, query: string): number | null {
  const at = name.indexOf(query);
  if (at === -1) return null;
  if (name === query) return 0;
  if (at === 0) return 1;
  if (new RegExp(`(^|[\\s'"(-])${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name)) return 2;
  return 3;
}

/**
 * Names containing `query` (case-insensitive, quotes/dashes/whitespace unified), best first: exact, prefix, word prefix,
 * substring; ties alphabetical. Duplicate names (runeword variants, same-named items) collapse to one entry.
 */
export function rankNames(names: readonly string[], query: string, limit = HOME_SEARCH_GROUP_LIMIT): string[] {
  const needle = normaliseItemName(query);
  if (needle === '') return [];
  const seen = new Set<string>();
  const ranked: { name: string; rank: number }[] = [];
  for (const name of names) {
    const normalised = normaliseItemName(name);
    if (normalised === '' || seen.has(normalised)) continue;
    const rank = matchRank(normalised, needle);
    if (rank === null) continue;
    seen.add(normalised);
    ranked.push({ name, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return ranked.slice(0, limit).map((entry) => entry.name);
}

/** The non-empty result groups, in HOME_SEARCH_CATEGORIES order; categories missing from `sources` are skipped. */
export function searchHome(query: string, sources: HomeSearchSources, limit = HOME_SEARCH_GROUP_LIMIT): HomeSearchGroup[] {
  return HOME_SEARCH_CATEGORIES.flatMap(({ key, label }) => {
    const names = sources[key];
    if (names === undefined) return [];
    const matches = rankNames(names, query, limit);
    return matches.length === 0 ? [] : [{ category: key, label, names: matches }];
  });
}

const NAME_FOCUS_PATHS: Record<Exclude<HomeSearchCategory, 'bases'>, string> = {
  runewords: NAME_FOCUS_PAGES.rw,
  gemwords: NAME_FOCUS_PAGES.gw,
  uniques: NAME_FOCUS_PAGES.unique,
  mythicals: NAME_FOCUS_PAGES.mythical,
};

/**
 * Page link of a picked result: the list pages focus the exact name (`?name=`); the Bases page has no exact-name focus,
 * so it gets a quoted phrase search (the same link the guide's `base:` scheme builds).
 */
export function homeResultHref(category: HomeSearchCategory, name: string): string {
  if (category === 'bases') return `/game-data/bases?search=${encodeURIComponent(`"${name}"`)}`;
  return `${NAME_FOCUS_PATHS[category]}?name=${encodeURIComponent(name)}`;
}

/** Enter without picking a result: the runewords free-text search (names and bonuses). */
export function runewordsSearchHref(query: string): string {
  return `${NAME_FOCUS_PAGES.rw}?search=${encodeURIComponent(query.trim())}`;
}
