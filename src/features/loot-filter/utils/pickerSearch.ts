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
  /** Shown greyed out with `hint` (e.g. a non-spawnable "shadow" base); still selectable. */
  readonly muted?: boolean;
  readonly hint?: string;
  /** Lowercase text the query terms are matched against (name, code, id). */
  readonly search: string;
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

/** 0 = the value or label is the query, 1 = the label or value starts with it, 2 = anything else. */
function rank(option: PickerOption, query: string): number {
  const label = option.label.toLowerCase();
  const value = option.value.toLowerCase();
  if (value === query || label === query) return 0;
  if (label.startsWith(query) || value.startsWith(query)) return 1;
  return 2;
}

/**
 * Options whose search text holds every whitespace-separated query term (case-insensitive), exact and
 * prefix matches first, then in list order; at most `limit` of them. An empty query lists the options in order.
 */
export function filterPickerOptions(options: readonly PickerOption[], query: string, limit = PICKER_MATCH_LIMIT): PickerMatches {
  const normalized = query.trim().toLowerCase();
  const terms = normalized.split(/\s+/).filter((term) => term !== '');
  const found = terms.length === 0 ? options : options.filter((option) => terms.every((term) => option.search.includes(term)));
  const ranked =
    terms.length === 0
      ? found
      : found
          .map((option, index) => ({ option, index, score: rank(option, normalized) }))
          .sort((a, b) => a.score - b.score || a.index - b.index)
          .map((entry) => entry.option);
  return { matches: ranked.slice(0, limit), total: ranked.length };
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
