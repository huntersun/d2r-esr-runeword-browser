import { useSelector } from 'react-redux';
import {
  FILTER_URL_PARAM_KEYS,
  appendCommonFilterParams,
  appendSelectionParam,
  buildShareUrl,
  appendExactNameParam,
  appendMatchModeParam,
} from '@/core/utils/filterUrlParams';
import {
  selectSearchText,
  selectSocketRange,
  selectMaxReqLevel,
  selectSelectedItemTypes,
  selectSelectedRunes,
  selectRuneMatchMode,
  selectMaxTierPoints,
  selectExactName,
} from '../store/runewordsSlice';

/**
 * Returns a function that generates a shareable URL with current filter state.
 * Used by CopyLinkButton to create links that can be shared.
 */
export function useShareUrl(): () => string {
  const searchText = useSelector(selectSearchText);
  const socketRange = useSelector(selectSocketRange);
  const maxReqLevel = useSelector(selectMaxReqLevel);
  const selectedItemTypes = useSelector(selectSelectedItemTypes);
  const selectedRunes = useSelector(selectSelectedRunes);
  const runeMatchMode = useSelector(selectRuneMatchMode);
  const maxTierPoints = useSelector(selectMaxTierPoints);
  const exactName = useSelector(selectExactName);

  return () => {
    const params = new URLSearchParams();
    appendCommonFilterParams(params, { searchText, socketRange, maxReqLevel, selectedItemTypes });
    appendSelectionParam(params, FILTER_URL_PARAM_KEYS.RUNES, selectedRunes);
    appendMatchModeParam(params, FILTER_URL_PARAM_KEYS.RUNEMODE, runeMatchMode);
    appendExactNameParam(params, exactName);

    // Tier points: serialize non-null entries as "esrRunes:1=64,lodRunes:2=128"
    const tierPtsEntries = Object.entries(maxTierPoints)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => `${key}=${String(value)}`);
    if (tierPtsEntries.length > 0) {
      params.set(FILTER_URL_PARAM_KEYS.TIERPTS, tierPtsEntries.join(','));
    }

    return buildShareUrl('runewords', params);
  };
}
