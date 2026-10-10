import { useEffect, useRef } from 'react';
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
export function useUrlInitialize(): void {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlSearch = searchParams.get(FILTER_URL_PARAM_KEYS.SEARCH);
    const urlCats = searchParams.get(MYTHICAL_URL_PARAM_KEYS.CATS);
    const exactName = parseExactNameParam(searchParams.get(FILTER_URL_PARAM_KEYS.NAME));

    const hasUrlParams = urlSearch !== null || urlCats !== null || exactName !== null;

    if (hasUrlParams) {
      dispatch(setExactName(exactName));
      if (exactName !== null) {
        // A name focus starts from default filters (URL params below still apply) so leftover state can't hide the item
        dispatch(setSearchText(''));
        dispatch(setSelectedCategories([]));
      }

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
}
