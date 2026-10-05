import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FILTER_URL_PARAM_KEYS } from '@/core/utils/filterUrlParams';
import { initializeFromUrl } from '../store';

/**
 * Initializes ascendancies filter state from URL query parameters (one-time on mount).
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

    if (urlSearch !== null) {
      dispatch(initializeFromUrl({ searchText: urlSearch }));

      // Clean the URL after initialization
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, dispatch]);
}
