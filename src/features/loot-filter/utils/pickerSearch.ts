/** Options and search for the game-data pickers (items, types, stats, areas, uniques and sets). */

export interface PickerOption {
  /** Unique per option list (cmdk's item value); usually equal to `value`. */
  readonly key: string;
  /** What selecting the option adds (an item code, a type code, a stat name, an id as text). */
  readonly value: string;
  readonly label: string;
  /** Secondary text after the label: the code or id, parents, base item… */
  readonly detail?: string;
  /** Heading the option is listed under (act, unique or set); options keep their order within a group. */
  readonly group?: string;
  /** Shown greyed out with `hint` (a non-spawnable "shadow" base, a misc item that never drops); still selectable. */
  readonly muted?: boolean;
  readonly hint?: string;
  /** Lowercase text the query terms are matched against (name, code, id). */
  readonly search: string;
  /**
   * More lowercase text the terms may match (an item's type names and codes); an option that needs it to match every
   * term is ranked below the options whose `search` alone matches.
   */
  readonly searchMore?: string;
}

export interface PickerMatches {
  readonly matches: readonly PickerOption[];
  /** Matches before the limit was applied. */
  readonly total: number;
}

/** Most matches a picker lists; more than that asks the user to type more. */
export const PICKER_MATCH_LIMIT = 200;

/** Lowercase search text from the parts (name, code, id…). */
export function searchText(...parts: readonly (string | number | undefined)[]): string {
  return parts
    .filter((part) => part !== undefined && part !== '')
    .map((part) => String(part).toLowerCase())
    .join(' ');
}

/**
 * 0 = the value or label is the query, 1 = the label or value starts with it, 2 = `search` holds every term,
 * 3 = only `search` plus `searchMore` do (an item found through its type).
 */
function rank(option: PickerOption, query: string, terms: readonly string[]): number {
  const label = option.label.toLowerCase();
  const value = option.value.toLowerCase();
  if (value === query || label === query) return 0;
  if (label.startsWith(query) || value.startsWith(query)) return 1;
  return terms.every((term) => option.search.includes(term)) ? 2 : 3;
}

function fullSearch(option: PickerOption): string {
  return option.searchMore === undefined || option.searchMore === '' ? option.search : `${option.search} ${option.searchMore}`;
}

/**
 * Options whose search text (`search` and `searchMore`) holds every whitespace-separated query term
 * (case-insensitive): exact and prefix matches first, then name/code matches, then the rest (`searchMore` matches),
 * each in list order; at most `limit` of them. An empty query lists the options in order.
 */
export function filterPickerOptions(options: readonly PickerOption[], query: string, limit = PICKER_MATCH_LIMIT): PickerMatches {
  const normalized = query.trim().toLowerCase();
  const terms = normalized.split(/\s+/).filter((term) => term !== '');
  if (terms.length === 0) return { matches: options.slice(0, limit), total: options.length };
  const ranked = options
    .filter((option) => {
      const text = fullSearch(option);
      return terms.every((term) => text.includes(term));
    })
    .map((option, index) => ({ option, index, score: rank(option, normalized, terms) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.option);
  return { matches: ranked.slice(0, limit), total: ranked.length };
}

/** What "Add all" / "Remove all" would do for a query: the values to add or remove and the muted matches skipped. */
export interface BulkPick {
  readonly action: 'add' | 'remove';
  readonly values: readonly string[];
  /** Muted matches (shadow bases, items that never drop) left out of an add. */
  readonly skipped: number;
  /** `skipped` split by the options' `hint` (`''` without one), in first-seen order. */
  readonly skippedByHint: readonly (readonly [hint: string, count: number])[];
}

/**
 * The bulk action for every match of a non-empty query (not only the shown ones): add the matches not picked yet,
 * leaving out muted ones; when every unmuted match is picked already, remove all picked matches (muted ones too).
 * Null for an empty query or when there is nothing to add or remove.
 */
export function bulkPick(options: readonly PickerOption[], query: string, selected: readonly string[]): BulkPick | null {
  if (query.trim() === '') return null;
  const { matches } = filterPickerOptions(options, query, Infinity);
  const picked = new Set(selected);
  const toAdd = new Set<string>();
  const skipped = new Map<string, string>();
  for (const option of matches) {
    if (picked.has(option.value)) continue;
    if (option.muted === true) skipped.set(option.value, option.hint ?? '');
    else toAdd.add(option.value);
  }
  if (toAdd.size > 0) {
    const byHint = new Map<string, number>();
    for (const hint of skipped.values()) byHint.set(hint, (byHint.get(hint) ?? 0) + 1);
    return { action: 'add', values: [...toAdd], skipped: skipped.size, skippedByHint: [...byHint] };
  }
  const toRemove = new Set(matches.filter((option) => picked.has(option.value)).map((option) => option.value));
  return toRemove.size === 0 ? null : { action: 'remove', values: [...toRemove], skipped: 0, skippedByHint: [] };
}

/** Splits matches into groups in order of first appearance; options without a group go under ''. */
export function groupPickerOptions(
  options: readonly PickerOption[]
): readonly { readonly heading: string; readonly options: readonly PickerOption[] }[] {
  const groups = new Map<string, PickerOption[]>();
  for (const option of options) {
    const heading = option.group ?? '';
    const list = groups.get(heading);
    if (list === undefined) groups.set(heading, [option]);
    else list.push(option);
  }
  return [...groups].map(([heading, list]) => ({ heading, options: list }));
}
