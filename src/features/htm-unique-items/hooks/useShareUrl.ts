import { useSelector } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, appendCategoryListParam, buildShareUrl } from '@/core/utils/filterUrlParams';
import { selectSearchText, selectMaxReqLevel, selectSelectedCategoriesRaw, selectIncludeCouponItems } from '../store';
import { HTM_URL_PARAM_KEYS } from './useUrlInitialize';

/**
 * Returns a function that generates a shareable URL with current filter state.
 * Used by CopyLinkButton to create links that can be shared.
 */
export function useShareUrl(): () => string {
  const searchText = useSelector(selectSearchText);
  const maxReqLevel = useSelector(selectMaxReqLevel);
  const selectedCategories = useSelector(selectSelectedCategoriesRaw);
  const includeCouponItems = useSelector(selectIncludeCouponItems);

  return () => {
    const params = new URLSearchParams();

    if (searchText) {
      params.set(FILTER_URL_PARAM_KEYS.SEARCH, searchText);
    }

    if (maxReqLevel !== null) {
      params.set(FILTER_URL_PARAM_KEYS.MAXLVL, String(maxReqLevel));
    }

    appendCategoryListParam(params, HTM_URL_PARAM_KEYS.CATS, selectedCategories);

    if (!includeCouponItems) {
      params.set(HTM_URL_PARAM_KEYS.COUPON, '0');
    }

    return buildShareUrl('uniques', params);
  };
}
