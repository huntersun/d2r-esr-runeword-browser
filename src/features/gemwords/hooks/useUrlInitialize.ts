import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { readPersistentJson } from '@/core/hooks/usePersistentState';
import {
  FILTER_URL_PARAM_KEYS,
  MAX_REQ_LEVEL_RANGE,
  decodeSelectionParam,
  parseBoundedIntParam,
  parseSocketRangeParam,
} from '@/core/utils/filterUrlParams';
import { parseExactNameParam } from '@/core/utils/exactName';
import { SOCKET_COUNT_RANGE, type SocketRange } from '@/core/utils/socketRange';
import { useExactNameFromUrl, type ExactNameFromUrl } from '@/core/hooks/useExactNameFromUrl';
import { useAvailableItemTypes } from './useAvailableItemTypes';
import { useGemGroups } from './useGemGroups';
import { setSearchText, setExactName, setSocketRange, setMaxReqLevel, setAllItemTypes, setAllGems } from '../store/gemwordsSlice';

export const GEMWORD_FILTER_STORAGE_KEY = 'd2r-esr.gemwords.filters.v1';

interface PersistedGemwordFilters {
  readonly searchText: string;
  readonly socketRange: SocketRange | null;
  readonly maxReqLevel: number | null;
  readonly selectedItemTypes: Record<string, boolean>;
  readonly selectedGems: Record<string, boolean>;
}

const DEFAULT_PERSISTED_FILTERS: PersistedGemwordFilters = {
  searchText: '',
  socketRange: null,
  maxReqLevel: null,
  selectedItemTypes: {},
  selectedGems: {},
};

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return typeof value === 'object' && value !== null && Object.values(value).every((entry) => typeof entry === 'boolean');
}

function isSocketRange(value: unknown): value is SocketRange {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SocketRange>;
  return (
    typeof candidate.min === 'number' &&
    typeof candidate.max === 'number' &&
    candidate.min >= SOCKET_COUNT_RANGE.min &&
    candidate.max <= SOCKET_COUNT_RANGE.max &&
    candidate.min <= candidate.max
  );
}

function isPersistedGemwordFilters(value: unknown): value is PersistedGemwordFilters {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PersistedGemwordFilters>;

  return (
    typeof candidate.searchText === 'string' &&
    (candidate.socketRange === null || isSocketRange(candidate.socketRange)) &&
    (candidate.maxReqLevel === null || typeof candidate.maxReqLevel === 'number') &&
    isBooleanRecord(candidate.selectedItemTypes) &&
    isBooleanRecord(candidate.selectedGems)
  );
}

/** Filters saved before the socket range filter had `socketCount: number | null` instead of `socketRange`. */
function upgradeLegacyStoredFilters(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('socketCount' in value)) return value;
  const { socketCount, ...rest } = value;
  const socketRange = typeof socketCount === 'number' ? { min: socketCount, max: socketCount } : null;
  return { ...rest, socketRange };
}

function readStoredGemwordFilters(): PersistedGemwordFilters {
  const stored = upgradeLegacyStoredFilters(
    readPersistentJson<unknown>(typeof window === 'undefined' ? null : window.localStorage, GEMWORD_FILTER_STORAGE_KEY, null)
  );
  return isPersistedGemwordFilters(stored) ? stored : DEFAULT_PERSISTED_FILTERS;
}

/**
 * Initializes gemword filter state from URL query parameters (one-time on mount),
 * falling back to the user's persisted filters when no params are present.
 * After URL initialization, cleans the URL to keep it tidy while browsing.
 * Use useShareUrl() to generate shareable URLs with current filter state.
 */
export function useUrlInitialize(): ExactNameFromUrl {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { nameFromUrl, clearExactName } = useExactNameFromUrl(setExactName);
  const itemTypes = useAvailableItemTypes();
  const gemGroups = useGemGroups();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!itemTypes || itemTypes.length === 0) return;
    if (!gemGroups || gemGroups.length === 0) return;

    initializedRef.current = true;

    const allGemNames = gemGroups.flatMap((group) => group.gems.map((gem) => gem.name));
    const urlSearch = searchParams.get(FILTER_URL_PARAM_KEYS.SEARCH);
    const urlSockets = searchParams.get(FILTER_URL_PARAM_KEYS.SOCKETS);
    const urlMaxLvl = searchParams.get(FILTER_URL_PARAM_KEYS.MAXLVL);
    const urlItems = searchParams.get(FILTER_URL_PARAM_KEYS.ITEMS);
    const urlGems = searchParams.get(FILTER_URL_PARAM_KEYS.GEMS);
    const exactName = parseExactNameParam(searchParams.get(FILTER_URL_PARAM_KEYS.NAME));
    const hasUrlParams = urlSearch !== null || urlSockets !== null || urlMaxLvl !== null || urlItems !== null || urlGems !== null;

    // `name` itself is applied by useExactNameFromUrl; only the URL cleaning happens here (it needs the other params)
    if (exactName !== null && !hasUrlParams) {
      setSearchParams({}, { replace: true });
    }

    if (hasUrlParams) {
      if (urlSearch !== null) {
        dispatch(setSearchText(urlSearch));
      }

      const socketRange = parseSocketRangeParam(urlSockets);
      if (socketRange !== null) {
        dispatch(setSocketRange(socketRange));
      }

      const maxReqLevel = parseBoundedIntParam(urlMaxLvl, MAX_REQ_LEVEL_RANGE);
      if (maxReqLevel !== null) {
        dispatch(setMaxReqLevel(maxReqLevel));
      }

      dispatch(setAllItemTypes(decodeSelectionParam(itemTypes, urlItems)));
      dispatch(setAllGems(decodeSelectionParam(allGemNames, urlGems)));

      setSearchParams({}, { replace: true });
    } else {
      const storedFilters = readStoredGemwordFilters();

      dispatch(setSearchText(storedFilters.searchText));
      dispatch(setSocketRange(storedFilters.socketRange));
      dispatch(setMaxReqLevel(storedFilters.maxReqLevel));
      dispatch(setAllItemTypes(decodeSelectionParam(itemTypes, null, storedFilters.selectedItemTypes)));
      dispatch(setAllGems(decodeSelectionParam(allGemNames, null, storedFilters.selectedGems)));
    }
  }, [itemTypes, gemGroups, searchParams, setSearchParams, dispatch]);

  return { nameFromUrl, clearExactName };
}
