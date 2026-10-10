import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, MAX_REQ_LEVEL_RANGE, decodeCategoryListParam, parseBoundedIntParam } from '@/core/utils/filterUrlParams';
import { parseExactNameParam } from '@/core/utils/exactName';
import { setSearchText, setExactName, setMaxReqLevel, setSelectedCategories, setIncludeCouponItems } from '../store';

export const HTM_URL_PARAM_KEYS = {
  CATS: 'cats',
  COUPON: 'coupon',
} as const;

/**
 * Initializes HTM unique items filter state from URL query parameters (one-time on mount).
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
    const urlMaxLvl = searchParams.get(FILTER_URL_PARAM_KEYS.MAXLVL);
    const urlCats = searchParams.get(HTM_URL_PARAM_KEYS.CATS);
    const urlCoupon = searchParams.get(HTM_URL_PARAM_KEYS.COUPON);
    const exactName = parseExactNameParam(searchParams.get(FILTER_URL_PARAM_KEYS.NAME));

    const hasUrlParams = urlSearch !== null || urlMaxLvl !== null || urlCats !== null || urlCoupon !== null || exactName !== null;

    if (hasUrlParams) {
      dispatch(setExactName(exactName));
      if (exactName !== null) {
        // A name focus starts from default filters (URL params below still apply) so leftover state can't hide the item
        dispatch(setSearchText(''));
        dispatch(setMaxReqLevel(null));
        dispatch(setSelectedCategories([]));
        dispatch(setIncludeCouponItems(true));
      }

      if (urlSearch !== null) {
        dispatch(setSearchText(urlSearch));
      }

      const maxReqLevel = parseBoundedIntParam(urlMaxLvl, MAX_REQ_LEVEL_RANGE);
      if (maxReqLevel !== null) {
        dispatch(setMaxReqLevel(maxReqLevel));
      }

      const categories = decodeCategoryListParam(urlCats);
      if (categories !== null) {
        dispatch(setSelectedCategories(categories));
      }

      if (urlCoupon === '0') {
        dispatch(setIncludeCouponItems(false));
      }

      // Clean the URL after initialization
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, dispatch]);
}
