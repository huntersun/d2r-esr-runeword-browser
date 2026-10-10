import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';

/**
 * Shared helpers for encoding/decoding recipe filter state in share URLs.
 * Used by the useShareUrl/useUrlInitialize hooks of every filterable screen so
 * the param names and "absent param = everything selected" semantics stay in sync.
 */
export const FILTER_URL_PARAM_KEYS = {
  SEARCH: 'search',
  SOCKETS: 'sockets',
  MAXLVL: 'maxlvl',
  ITEMS: 'items',
  RUNES: 'runes',
  TIERPTS: 'tierpts',
  GEMS: 'gems',
  NAME: 'name',
} as const;

export const SOCKET_COUNT_RANGE = { min: 1, max: 6 } as const;
export const MAX_REQ_LEVEL_RANGE = { min: 1, max: 999 } as const;

export interface CommonFilterState {
  readonly searchText: string;
  readonly socketCount: number | null;
  readonly maxReqLevel: number | null;
  readonly selectedItemTypes: Record<string, boolean>;
}

/**
 * Adds a comma-separated selection param, but only when NOT everything is
 * selected (an absent param means "all selected" when decoding).
 */
export function appendSelectionParam(params: URLSearchParams, key: string, selection: Record<string, boolean>): void {
  const keys = Object.keys(selection);
  if (keys.length === 0) return;
  if (Object.values(selection).every(Boolean)) return;

  const selectedKeys = keys.filter((entry) => selection[entry]);
  if (selectedKeys.length > 0) {
    params.set(key, selectedKeys.join(','));
  }
}

/** Adds the search/sockets/maxlvl/items params shared by all recipe screens. */
export function appendCommonFilterParams(params: URLSearchParams, filters: CommonFilterState): void {
  if (filters.searchText) {
    params.set(FILTER_URL_PARAM_KEYS.SEARCH, filters.searchText);
  }

  if (filters.socketCount !== null) {
    params.set(FILTER_URL_PARAM_KEYS.SOCKETS, String(filters.socketCount));
  }

  if (filters.maxReqLevel !== null) {
    params.set(FILTER_URL_PARAM_KEYS.MAXLVL, String(filters.maxReqLevel));
  }

  appendSelectionParam(params, FILTER_URL_PARAM_KEYS.ITEMS, filters.selectedItemTypes);
}

/**
 * Decodes a comma-separated selection param into a full selection record:
 * - param present → only the listed keys are selected
 * - param absent → stored value per key (when provided), defaulting to selected
 */
export function decodeSelectionParam<K extends string>(
  allKeys: readonly K[],
  paramValue: string | null,
  storedSelection?: Partial<Record<K, boolean>>
): Record<K, boolean> {
  const selectedSet: ReadonlySet<string> | null = paramValue ? new Set(paramValue.split(',')) : null;
  const selection = {} as Record<K, boolean>;
  for (const key of allKeys) {
    selection[key] = selectedSet ? selectedSet.has(key) : (storedSelection?.[key] ?? true);
  }
  return selection;
}

/** Parses an integer URL param, returning null when missing or out of range. */
export function parseBoundedIntParam(value: string | null, range: { readonly min: number; readonly max: number }): number | null {
  if (value === null) return null;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < range.min || parsed > range.max) return null;
  return parsed;
}

/** Builds an absolute share URL for a route ('' for the index route). */
export function buildShareUrl(routePath: string, params: URLSearchParams): string {
  const baseUrl = import.meta.env.BASE_URL;
  const path = routePath ? `${baseUrl.replace(/\/$/, '')}/${routePath}` : baseUrl;
  const base = `${window.location.origin}${path}`;
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Adds a category list param (unique item screens). Omitted when all
 * categories (`[]`) or none (`[NO_CATEGORIES_MARKER]`) are selected.
 */
export function appendCategoryListParam(params: URLSearchParams, key: string, selectedCategories: readonly string[]): void {
  if (selectedCategories.length > 0 && selectedCategories[0] !== NO_CATEGORIES_MARKER) {
    params.set(key, selectedCategories.join(','));
  }
}

/** Decodes a category list param; null when absent or empty (keep the current selection). */
export function decodeCategoryListParam(paramValue: string | null): string[] | null {
  if (paramValue === null) return null;
  const categories = paramValue.split(',').filter(Boolean);
  return categories.length > 0 ? categories : null;
}
