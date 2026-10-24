import {
  FILTER_URL_PARAM_KEYS,
  MAX_REQ_LEVEL_RANGE,
  appendCategoryListParam,
  appendExactNameParam,
  decodeCategoryListParam,
  parseBoundedIntParam,
} from '@/core/utils/filterUrlParams';
import { isAcquisitionFilter, type AcquisitionFilter } from './acquisition';

export const HTM_URL_PARAM_KEYS = {
  CATS: 'cats',
  /** Acquisition chip: `coupon` | `gamble` | `drop` | `nocoupon`; omitted for "All" */
  ACQ: 'acq',
  /** Legacy exclude-only toggle: `coupon=0` = hide coupon items. Read for old links, never written. */
  COUPON: 'coupon',
} as const;

export interface HtmShareFilters {
  readonly searchText: string;
  readonly maxReqLevel: number | null;
  readonly selectedCategories: readonly string[];
  readonly acquisition: AcquisitionFilter;
  readonly exactName: string | null;
}

/** Filter values decoded from a uniques URL; null = param absent or invalid (keep the current state) */
export interface HtmUrlFilters {
  readonly searchText: string | null;
  readonly maxReqLevel: number | null;
  readonly categories: string[] | null;
  readonly acquisition: AcquisitionFilter | null;
}

export function buildHtmShareParams(filters: HtmShareFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.searchText) params.set(FILTER_URL_PARAM_KEYS.SEARCH, filters.searchText);
  if (filters.maxReqLevel !== null) params.set(FILTER_URL_PARAM_KEYS.MAXLVL, String(filters.maxReqLevel));
  appendCategoryListParam(params, HTM_URL_PARAM_KEYS.CATS, filters.selectedCategories);
  if (filters.acquisition !== 'all') params.set(HTM_URL_PARAM_KEYS.ACQ, filters.acquisition);
  appendExactNameParam(params, filters.exactName);
  return params;
}

/**
 * Decodes the `acq` param, falling back to the legacy `coupon=0` (→ `nocoupon`).
 * `acq` wins when both are present; unknown values are ignored.
 */
export function parseAcquisitionParam(params: URLSearchParams): AcquisitionFilter | null {
  const acq = params.get(HTM_URL_PARAM_KEYS.ACQ);
  if (acq !== null && isAcquisitionFilter(acq)) return acq;
  if (params.get(HTM_URL_PARAM_KEYS.COUPON) === '0') return 'nocoupon';
  return null;
}

/** True when any uniques filter param (not `name`) is present, i.e. the URL should drive the filters. */
export function hasHtmFilterParams(params: URLSearchParams): boolean {
  return [
    FILTER_URL_PARAM_KEYS.SEARCH,
    FILTER_URL_PARAM_KEYS.MAXLVL,
    HTM_URL_PARAM_KEYS.CATS,
    HTM_URL_PARAM_KEYS.ACQ,
    HTM_URL_PARAM_KEYS.COUPON,
  ].some((key) => params.has(key));
}

export function parseHtmUrlParams(params: URLSearchParams): HtmUrlFilters {
  return {
    searchText: params.get(FILTER_URL_PARAM_KEYS.SEARCH),
    maxReqLevel: parseBoundedIntParam(params.get(FILTER_URL_PARAM_KEYS.MAXLVL), MAX_REQ_LEVEL_RANGE),
    categories: decodeCategoryListParam(params.get(HTM_URL_PARAM_KEYS.CATS)),
    acquisition: parseAcquisitionParam(params),
  };
}
