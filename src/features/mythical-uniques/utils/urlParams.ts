import {
  FILTER_URL_PARAM_KEYS,
  MAX_REQ_LEVEL_RANGE,
  appendCategoryListParam,
  appendExactNameParam,
  decodeCategoryListParam,
  parseBoundedIntParam,
} from '@/core/utils/filterUrlParams';

export const MYTHICAL_URL_PARAM_KEYS = {
  CATS: 'cats',
} as const;

export interface MythicalShareFilters {
  readonly searchText: string;
  readonly maxReqLevel: number | null;
  readonly selectedCategories: readonly string[];
  readonly exactName: string | null;
}

/** Filter values decoded from a mythicals URL; null = param absent or invalid (keep the current state) */
export interface MythicalUrlFilters {
  readonly searchText: string | null;
  readonly maxReqLevel: number | null;
  readonly categories: string[] | null;
}

export function buildMythicalShareParams(filters: MythicalShareFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.searchText) params.set(FILTER_URL_PARAM_KEYS.SEARCH, filters.searchText);
  if (filters.maxReqLevel !== null) params.set(FILTER_URL_PARAM_KEYS.MAXLVL, String(filters.maxReqLevel));
  appendCategoryListParam(params, MYTHICAL_URL_PARAM_KEYS.CATS, filters.selectedCategories);
  appendExactNameParam(params, filters.exactName);
  return params;
}

/** True when any mythicals filter param (not `name`) is present, i.e. the URL should drive the filters. */
export function hasMythicalFilterParams(params: URLSearchParams): boolean {
  return [FILTER_URL_PARAM_KEYS.SEARCH, FILTER_URL_PARAM_KEYS.MAXLVL, MYTHICAL_URL_PARAM_KEYS.CATS].some((key) => params.has(key));
}

export function parseMythicalUrlParams(params: URLSearchParams): MythicalUrlFilters {
  return {
    searchText: params.get(FILTER_URL_PARAM_KEYS.SEARCH),
    maxReqLevel: parseBoundedIntParam(params.get(FILTER_URL_PARAM_KEYS.MAXLVL), MAX_REQ_LEVEL_RANGE),
    categories: decodeCategoryListParam(params.get(MYTHICAL_URL_PARAM_KEYS.CATS)),
  };
}
