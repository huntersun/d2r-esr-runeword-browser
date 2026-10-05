import { useSelector } from 'react-redux';
import { FILTER_URL_PARAM_KEYS, appendSelectionParam, buildShareUrl } from '@/core/utils/filterUrlParams';
import { selectSearchText, selectEnabledCategories, selectOnlyHighestQuality } from '../store/socketablesSlice';
import { SOCKETABLE_URL_PARAM_KEYS } from './useUrlInitialize';

/**
 * Returns a function that generates a shareable URL with current filter state.
 * Used by CopyLinkButton to create links that can be shared.
 */
export function useShareUrl(): () => string {
  const searchText = useSelector(selectSearchText);
  const enabledCategories = useSelector(selectEnabledCategories);
  const onlyHighestQuality = useSelector(selectOnlyHighestQuality);

  return () => {
    const params = new URLSearchParams();

    if (searchText) {
      params.set(FILTER_URL_PARAM_KEYS.SEARCH, searchText);
    }

    // Categories: only listed when NOT all enabled
    appendSelectionParam(params, SOCKETABLE_URL_PARAM_KEYS.CATEGORIES, { ...enabledCategories });

    // Only highest quality: add if disabled (default is true)
    if (!onlyHighestQuality) {
      params.set(SOCKETABLE_URL_PARAM_KEYS.ONLY_HIGHEST, 'false');
    }

    return buildShareUrl('socketables', params);
  };
}
