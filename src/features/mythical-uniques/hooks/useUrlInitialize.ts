import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, decodeCategoryListParam } from '@/core/utils/filterUrlParams';
import { parseExactNameParam } from '@/core/utils/exactName';
import { setSearchText, setExactName, setSelectedCategories } from '../store';

export const MYTHICAL_URL_PARAM_KEYS = {
  CATS: 'cats',
} as const;

/**
 * Initializes mythical uniques filter state from URL query parameters (one-time on mount).
 * After initialization, cleans the URL to keep it tidy while browsing.
 */
export function useUrlInitialize(): boolean {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  // Whether this visit came with a `name` param (the URL is cleaned after init, so capture it once)
  const [nameFromUrl] = useState(() => parseExactNameParam(searchParams.get(FILTER_URL_PARAM_KEYS.NAME)) !== null);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlSearch = searchParams.get(FILTER_URL_PARAM_KEYS.SEARCH);
    const urlCats = searchParams.get(MYTHICAL_URL_PARAM_KEYS.CATS);
    const exactName = parseExactNameParam(searchParams.get(FILTER_URL_PARAM_KEYS.NAME));

    const hasUrlParams = urlSearch !== null || urlCats !== null;

    // The name focus is independent of the other filters (it overrides them while set, see applyExactNameFocus):
    // set from the URL, and cleared by any visit whose URL has no `name`, so it never outlives the deep link
    dispatch(setExactName(exactName));
    if (exactName !== null && !hasUrlParams) {
      setSearchParams({}, { replace: true });
    }

    if (hasUrlParams) {
      if (urlSearch !== null) {
        dispatch(setSearchText(urlSearch));
      }

      const categories = decodeCategoryListParam(urlCats);
      if (categories !== null) {
        dispatch(setSelectedCategories(categories));
      }

      // Clean the URL after initialization
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, dispatch]);

  return nameFromUrl;
}
