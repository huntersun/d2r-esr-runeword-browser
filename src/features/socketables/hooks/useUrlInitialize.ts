import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, decodeSelectionParam } from '@/core/utils/filterUrlParams';
import { initializeFromUrl, SOCKETABLE_CATEGORIES } from '../store/socketablesSlice';

export const SOCKETABLE_URL_PARAM_KEYS = {
  CATEGORIES: 'categories',
  ONLY_HIGHEST: 'onlyHighest',
} as const;

/**
 * Initializes socketables filter state from URL query parameters (one-time on mount).
 * After initialization, cleans the URL to keep it tidy while browsing.
 * Use useShareUrl() to generate shareable URLs with current filter state.
 */
export function useUrlInitialize(): void {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  // Track initialization state
  const initializedRef = useRef(false);

  // URL → Redux (on mount)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlSearch = searchParams.get(FILTER_URL_PARAM_KEYS.SEARCH);
    const urlCategories = searchParams.get(SOCKETABLE_URL_PARAM_KEYS.CATEGORIES);
    const urlOnlyHighest = searchParams.get(SOCKETABLE_URL_PARAM_KEYS.ONLY_HIGHEST);

    const hasUrlParams = urlSearch !== null || urlCategories !== null || urlOnlyHighest !== null;

    if (hasUrlParams) {
      dispatch(
        initializeFromUrl({
          searchText: urlSearch ?? '',
          enabledCategories: decodeSelectionParam(SOCKETABLE_CATEGORIES, urlCategories),
          onlyHighestQuality: urlOnlyHighest !== null ? urlOnlyHighest !== 'false' : undefined,
        })
      );

      // Clean the URL after initialization
      setSearchParams({}, { replace: true });
    }
    // If no URL params, keep the default state from the slice (all categories enabled)
  }, [searchParams, setSearchParams, dispatch]);
}
