import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, decodeSelectionParam } from '@/core/utils/filterUrlParams';
import { parseExactNameParam } from '@/core/utils/exactName';
import { useExactNameFromUrl, type ExactNameFromUrl } from '@/core/hooks/useExactNameFromUrl';
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
export function useUrlInitialize(): ExactNameFromUrl {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { nameFromUrl, clearExactName } = useExactNameFromUrl(setExactName);

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

    // `name` itself is applied by useExactNameFromUrl; only the URL cleaning happens here (it needs the other params)
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

  return { nameFromUrl, clearExactName };
}
