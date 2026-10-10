import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, decodeCategoryListParam } from '@/core/utils/filterUrlParams';
import { parseExactNameParam } from '@/core/utils/exactName';
import { useExactNameFromUrl, type ExactNameFromUrl } from '@/core/hooks/useExactNameFromUrl';
import { setSearchText, setExactName, setSelectedCategories } from '../store';

export const MYTHICAL_URL_PARAM_KEYS = {
  CATS: 'cats',
} as const;

/**
 * Initializes mythical uniques filter state from URL query parameters (one-time on mount).
 * After initialization, cleans the URL to keep it tidy while browsing.
 */
export function useUrlInitialize(): ExactNameFromUrl {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { nameFromUrl, clearExactName } = useExactNameFromUrl(setExactName);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlSearch = searchParams.get(FILTER_URL_PARAM_KEYS.SEARCH);
    const urlCats = searchParams.get(MYTHICAL_URL_PARAM_KEYS.CATS);
    const exactName = parseExactNameParam(searchParams.get(FILTER_URL_PARAM_KEYS.NAME));

    const hasUrlParams = urlSearch !== null || urlCats !== null;

    // `name` itself is applied by useExactNameFromUrl; only the URL cleaning happens here (it needs the other params)
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

  return { nameFromUrl, clearExactName };
}
