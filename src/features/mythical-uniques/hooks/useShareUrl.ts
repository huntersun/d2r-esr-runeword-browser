import { useSelector } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, appendCategoryListParam, buildShareUrl } from '@/core/utils/filterUrlParams';
import { selectSearchText, selectSelectedCategoriesRaw } from '../store';
import { MYTHICAL_URL_PARAM_KEYS } from './useUrlInitialize';

/**
 * Returns a function that generates a shareable URL with current filter state.
 * Used by CopyLinkButton to create links that can be shared.
 */
export function useShareUrl(): () => string {
  const searchText = useSelector(selectSearchText);
  const selectedCategories = useSelector(selectSelectedCategoriesRaw);

  return () => {
    const params = new URLSearchParams();
    if (searchText) {
      params.set(FILTER_URL_PARAM_KEYS.SEARCH, searchText);
    }
    appendCategoryListParam(params, MYTHICAL_URL_PARAM_KEYS.CATS, selectedCategories);
    return buildShareUrl('mythicals', params);
  };
}
