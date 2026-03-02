import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setSearchText, setMaxReqLevel, setSelectedCategories, setIncludeCouponItems } from '../store';

const URL_PARAM_KEYS = {
  SEARCH: 'search',
  MAXLVL: 'maxlvl',
  CATS: 'cats',
  COUPON: 'coupon',
} as const;

/**
 * Initializes HTM unique items filter state from URL query parameters (one-time on mount).
 * After initialization, cleans the URL to keep it tidy while browsing.
 */
export function useUrlInitialize(): void {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const urlSearch = searchParams.get(URL_PARAM_KEYS.SEARCH);
    const urlMaxLvl = searchParams.get(URL_PARAM_KEYS.MAXLVL);
    const urlCats = searchParams.get(URL_PARAM_KEYS.CATS);
    const urlCoupon = searchParams.get(URL_PARAM_KEYS.COUPON);

    const hasUrlParams = urlSearch !== null || urlMaxLvl !== null || urlCats !== null || urlCoupon !== null;

    if (hasUrlParams) {
      if (urlSearch !== null) {
        dispatch(setSearchText(urlSearch));
      }

      if (urlMaxLvl !== null) {
        const parsed = parseInt(urlMaxLvl, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
          dispatch(setMaxReqLevel(parsed));
        }
      }

      if (urlCats !== null) {
        const categories = urlCats.split(',').filter(Boolean);
        if (categories.length > 0) {
          dispatch(setSelectedCategories(categories));
        }
      }

      if (urlCoupon === '0') {
        dispatch(setIncludeCouponItems(false));
      }

      // Clean the URL after initialization
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, dispatch]);
}
