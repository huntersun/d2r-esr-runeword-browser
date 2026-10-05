import { useSelector } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, buildShareUrl } from '@/core/utils/filterUrlParams';
import { selectSearchText } from '../store';

/**
 * Returns a function that generates a shareable URL with current filter state.
 * Used by CopyLinkButton to create links that can be shared.
 */
export function useShareUrl(): () => string {
  const searchText = useSelector(selectSearchText);

  return () => {
    const params = new URLSearchParams();
    if (searchText) {
      params.set(FILTER_URL_PARAM_KEYS.SEARCH, searchText);
    }
    return buildShareUrl('ascendancies', params);
  };
}
