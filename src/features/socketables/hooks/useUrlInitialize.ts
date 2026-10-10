import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, decodeSelectionParam } from '@/core/utils/filterUrlParams';
import { parseExactNameParam } from '@/core/utils/exactName';
import { initializeFromUrl, setExactName, SOCKETABLE_CATEGORIES } from '../store/socketablesSlice';

export const SOCKETABLE_URL_PARAM_KEYS = {
  CATEGORIES: 'categories',
  ONLY_HIGHEST: 'onlyHighest',
} as const;

/**
 * Initializes socketables filter state from URL query parameters (one-time on mount).
 * After initialization, cleans the URL to keep it tidy while browsing.
 * Use useShareUrl() to generate shareable URLs with current filter state.
 */
export function useUrlInitialize(): boolean {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  // Whether this visit came with a `name` param (the URL is cleaned after init, so capture it once)
  const [nameFromUrl] = useState(() => parseExactNameParam(searchParams.get(FILTER_URL_PARAM_KEYS.NAME)) !== null);

  // Track initialization state
  const initializedRef = useRef(false);

  // URL → Redux (on mount)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlSearch = searchParams.get(FILTER_URL_PARAM_KEYS.SEARCH);
    const urlCategories = searchParams.get(SOCKETABLE_URL_PARAM_KEYS.CATEGORIES);
    const urlOnlyHighest = searchParams.get(SOCKETABLE_URL_PARAM_KEYS.ONLY_HIGHEST);
    const exactName = parseExactNameParam(searchParams.get(FILTER_URL_PARAM_KEYS.NAME));

    const hasUrlParams = urlSearch !== null || urlCategories !== null || urlOnlyHighest !== null;

    // The name focus is independent of the other filters (it overrides them while set, see applyExactNameFocus):
    // set from the URL, and cleared by any visit whose URL has no `name`, so it never outlives the deep link
    dispatch(setExactName(exactName));
    if (exactName !== null && !hasUrlParams) {
      setSearchParams({}, { replace: true });
    }

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

  return nameFromUrl;
}
