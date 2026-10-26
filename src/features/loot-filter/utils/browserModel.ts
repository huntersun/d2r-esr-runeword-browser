import type { BaseItem } from '@/features/game-data/engine/schema';

/**
 * The browsers' model, shared by the item browser's Bases and Misc tabs and the unique and set browser: groups → types
 * → a grid of rows by named column (Normal | Exceptional | Elite, Chipped … Perfect), a list per column, or a plain
 * list; plus search and selection helpers. The selection is a set of strings: item codes, or unique/set row ids.
 */

export type BaseTier = BaseItem['tier'];

/** A grid column; `tier` makes it render as a tier badge, else a plain label badge. */
export interface BrowserColumn {
  readonly key: string;
  readonly label: string;
  readonly tier?: BaseTier;
}

export interface BrowserItem {
  /** The cell's key, and the one code it selects unless `codes` is given. */
  readonly code: string;
  /** The codes the cell selects together (a unique merged from several rows: one id per row); default `[code]`. */
  readonly codes?: readonly string[];
  /** The small monospace text after the name; default `code`. */
  readonly tag?: string;
  readonly name: string;
  /** The column this item counts toward (`typeCodes(type, key)`), or null for none. */
  readonly column: BrowserColumn | null;
  /** One line of stats (bases only; the cell shows no stats line without it). */
  readonly stats?: string;
  /** Socket caps per item level band, for a tooltip (bases only). */
  readonly sockets?: string;
  /** A tooltip (when there are no sockets to show). */
  readonly title?: string;
  /** Why the cell cannot be ticked ("disabled in the game files"); such a cell counts toward no checkbox. */
  readonly disabled?: string;
  /** Lowercased search text (name, code, type name + code…). */
  readonly search: string;
}

/** One family: its members index-aligned with the type's columns (null where the family has none). */
export interface BrowserRow {
  readonly key: string;
  readonly cells: readonly (BrowserItem | null)[];
}

export interface BrowserType {
  readonly code: string;
  readonly name: string;
  /** The small monospace text after the name; default `code`, none when empty. */
  readonly tag?: string;
  /**
   * `grid`: family rows by column plus extras; `columns`: the items side by side by their column (each column a list)
   * plus extras; `list`: a plain list of items.
   */
  readonly layout: 'grid' | 'columns' | 'list';
  readonly columns: readonly BrowserColumn[];
  readonly rows: readonly BrowserRow[];
  /** The items below a grid that sit in no family row (mythical bases, misc items outside a quality family). */
  readonly extras: readonly BrowserItem[];
  /** The column the extras share (Mythical), shown as a heading with a checkbox; null for none. */
  readonly extrasColumn: BrowserColumn | null;
  /** The items of a `list` type, or of a `columns` type (each with one of its columns). */
  readonly items: readonly BrowserItem[];
}

export interface BrowserGroup {
  readonly label: string;
  readonly types: readonly BrowserType[];
}

export interface BrowserModel {
  readonly groups: readonly BrowserGroup[];
  /** Every code in display order (group, type, row, column, extras). */
  readonly codes: readonly string[];
}

/** The codes a cell selects: none for a disabled cell, else `codes` or its own code. */
export function itemCodes(item: BrowserItem): readonly string[] {
  if (item.disabled !== undefined) return [];
  return item.codes ?? [item.code];
}

/** The items of a `columns` type in display order: column by column, each in list order. */
export function columnItems(type: BrowserType, columnKey: string): BrowserItem[] {
  return type.items.filter((item) => item.column?.key === columnKey);
}

/** A type's cells in display order (rows, then the columns or the list, then the extras). */
function displayItems(type: BrowserType): BrowserItem[] {
  const items: BrowserItem[] = [];
  for (const row of type.rows) for (const cell of row.cells) if (cell !== null) items.push(cell);
  if (type.layout === 'columns') {
    for (const column of type.columns) items.push(...columnItems(type, column.key));
    items.push(...type.extras);
  } else {
    items.push(...type.extras, ...type.items);
  }
  return items;
}

/** Every code of a type in display order. */
export function displayCodes(type: BrowserType): string[] {
  return displayItems(type).flatMap((item) => itemCodes(item));
}

// --- Search ---

function searchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

const matchesAll = (text: string, terms: readonly string[]) => terms.every((term) => text.includes(term));

/**
 * The groups with only the rows and items matching every term of `query` (a row matches on the joined search text of
 * its cells); empty types and groups are dropped. An empty query returns the groups unchanged.
 */
export function filterBrowser(groups: readonly BrowserGroup[], query: string): readonly BrowserGroup[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return groups;
  return groups.flatMap((group): BrowserGroup[] => {
    const types = group.types.flatMap((type): BrowserType[] => {
      const rows = type.rows.filter((row) => matchesAll(row.cells.map((cell) => cell?.search ?? '').join(' '), terms));
      const extras = type.extras.filter((item) => matchesAll(item.search, terms));
      const items = type.items.filter((item) => matchesAll(item.search, terms));
      if (rows.length + extras.length + items.length === 0) return [];
      return [{ ...type, rows, extras, items }];
    });
    return types.length === 0 ? [] : [{ ...group, types }];
  });
}

// --- Selection ---

/** The codes of a type's (shown) items, optionally of one column only (by key). */
export function typeCodes(type: BrowserType, columnKey?: string): string[] {
  if (columnKey === undefined) return displayCodes(type);
  return displayItems(type)
    .filter((item) => item.column?.key === columnKey)
    .flatMap((item) => itemCodes(item));
}

export function groupCodes(group: BrowserGroup, columnKey?: string): string[] {
  return group.types.flatMap((type) => typeCodes(type, columnKey));
}

export function allCodes(groups: readonly BrowserGroup[], columnKey?: string): string[] {
  return groups.flatMap((group) => groupCodes(group, columnKey));
}

export type TriState = 'all' | 'some' | 'none';

/** Whether all, some or none of `codes` are selected (`none` for no codes). */
export function triState(codes: readonly string[], selected: ReadonlySet<string>): TriState {
  const count = codes.filter((code) => selected.has(code)).length;
  if (count === 0) return 'none';
  return count === codes.length ? 'all' : 'some';
}

/** A new set with `codes` added (`on`) or removed. */
export function toggleCodes(selected: ReadonlySet<string>, codes: readonly string[], on: boolean): Set<string> {
  const next = new Set(selected);
  for (const code of codes) {
    if (on) next.add(code);
    else next.delete(code);
  }
  return next;
}

/** The draft for `values`: the codes the browser lists. */
export function initialBrowserSelection(values: readonly string[], knownCodes: readonly string[]): Set<string> {
  const known = new Set(knownCodes);
  return new Set(values.filter((value) => known.has(value)));
}

/**
 * The picker's new values: `values` without the browser's codes the draft dropped (codes the browser does not list
 * are always kept, in place), then the draft's new codes in `knownCodes` order.
 */
export function applyBrowserSelection(values: readonly string[], knownCodes: readonly string[], draft: ReadonlySet<string>): string[] {
  const known = new Set(knownCodes);
  const kept = values.filter((value) => !known.has(value) || draft.has(value));
  const present = new Set(kept);
  return [...kept, ...knownCodes.filter((code) => draft.has(code) && !present.has(code))];
}
