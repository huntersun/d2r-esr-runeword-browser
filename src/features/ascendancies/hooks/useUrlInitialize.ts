import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { initializeFromUrl } from '../store';

const URL_PARAM_KEYS = {
  SEARCH: 'search',
} as const;

/**
 * Initializes ascendancies filter state from URL query parameters (one-time on mount).
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

    if (urlSearch !== null) {
      dispatch(initializeFromUrl({ searchText: urlSearch }));

      // Clean the URL after initialization
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, dispatch]);
}
