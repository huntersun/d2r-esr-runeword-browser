import { useSelector } from 'react-redux';
import { buildShareUrl } from '@/core/utils/filterUrlParams';
import { selectSearchText, selectExactName, selectMaxReqLevel, selectSelectedCategoriesRaw, selectAcquisition } from '../store';
import { buildHtmShareParams } from '../utils/urlParams';

/**
 * Returns a function that generates a shareable URL with current filter state.
 * Used by CopyLinkButton to create links that can be shared.
 */
export function useShareUrl(): () => string {
  const searchText = useSelector(selectSearchText);
  const maxReqLevel = useSelector(selectMaxReqLevel);
  const selectedCategories = useSelector(selectSelectedCategoriesRaw);
  const acquisition = useSelector(selectAcquisition);
  const exactName = useSelector(selectExactName);

  return () => buildShareUrl('uniques', buildHtmShareParams({ searchText, maxReqLevel, selectedCategories, acquisition, exactName }));
}
