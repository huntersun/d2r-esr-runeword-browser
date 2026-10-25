import {
  FILTER_URL_PARAM_KEYS,
  MAX_REQ_LEVEL_RANGE,
  appendCategoryListParam,
  appendExactNameParam,
  decodeCategoryListParam,
  parseBoundedIntParam,
} from '@/core/utils/filterUrlParams';
import { BASE_TIERS, type BaseTier } from '@/features/game-data/constants/bases';
import { isAcquisitionFilter, type AcquisitionFilter } from './acquisition';

export const HTM_URL_PARAM_KEYS = {
  CATS: 'cats',
  /** Acquisition chip: `coupon` | `gamble` | `drop` | `nocoupon`; omitted for "All" */
  ACQ: 'acq',
  /** Legacy exclude-only toggle: `coupon=0` = hide coupon items. Read for old links, never written. */
  COUPON: 'coupon',
  /** Base tiers, comma-separated (`tier=exceptional,elite`, the Bases page format); omitted for all tiers */
  TIER: 'tier',
} as const;

export interface HtmShareFilters {
  readonly searchText: string;
  readonly maxReqLevel: number | null;
  readonly selectedCategories: readonly string[];
  readonly acquisition: AcquisitionFilter;
  readonly exactName: string | null;
  readonly tiers: readonly BaseTier[];
}

/** Filter values decoded from a uniques URL; null = param absent or invalid (keep the current state) */
export interface HtmUrlFilters {
  readonly searchText: string | null;
  readonly maxReqLevel: number | null;
  readonly categories: string[] | null;
  readonly acquisition: AcquisitionFilter | null;
  readonly tiers: BaseTier[] | null;
}

/** Decodes `tier`: known tiers in Normal → Mythical order; null when absent or without a known tier. */
export function parseTierParam(value: string | null): BaseTier[] | null {
  if (value === null) return null;
  const parts = value.split(',');
  const tiers = BASE_TIERS.filter((tier) => parts.includes(tier));
  return tiers.length === 0 ? null : tiers;
}

export function buildHtmShareParams(filters: HtmShareFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.searchText) params.set(FILTER_URL_PARAM_KEYS.SEARCH, filters.searchText);
  if (filters.maxReqLevel !== null) params.set(FILTER_URL_PARAM_KEYS.MAXLVL, String(filters.maxReqLevel));
  appendCategoryListParam(params, HTM_URL_PARAM_KEYS.CATS, filters.selectedCategories);
  if (filters.acquisition !== 'all') params.set(HTM_URL_PARAM_KEYS.ACQ, filters.acquisition);
  if (filters.tiers.length > 0) params.set(HTM_URL_PARAM_KEYS.TIER, filters.tiers.join(','));
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
    HTM_URL_PARAM_KEYS.TIER,
  ].some((key) => params.has(key));
}

export function parseHtmUrlParams(params: URLSearchParams): HtmUrlFilters {
  return {
    searchText: params.get(FILTER_URL_PARAM_KEYS.SEARCH),
    maxReqLevel: parseBoundedIntParam(params.get(FILTER_URL_PARAM_KEYS.MAXLVL), MAX_REQ_LEVEL_RANGE),
    categories: decodeCategoryListParam(params.get(HTM_URL_PARAM_KEYS.CATS)),
    acquisition: parseAcquisitionParam(params),
    tiers: parseTierParam(params.get(HTM_URL_PARAM_KEYS.TIER)),
  };
}
