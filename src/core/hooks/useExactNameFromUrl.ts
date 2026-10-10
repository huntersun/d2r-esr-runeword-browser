import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { PayloadAction } from '@reduxjs/toolkit';
import { FILTER_URL_PARAM_KEYS } from '@/core/utils/filterUrlParams';
import { parseExactNameParam } from '@/core/utils/exactName';

export interface ExactNameFromUrl {
  /** Whether this visit came with a `name` param (the URL is cleaned after init, so it is captured once) */
  readonly nameFromUrl: boolean;
  /** Clears the exact-name focus (the chip's "×") */
  readonly clearExactName: () => void;
}

/**
 * Applies the `?name=` exact-name focus of a list screen on mount, without waiting for the filter data.
 * The focus is independent of the other filters (it overrides them while set, see applyExactNameFocus): set from
 * the URL, and cleared by any visit whose URL has no `name`, so it never outlives the deep link.
 * Cleaning the URL stays with the screen's own useUrlInitialize, which knows its other params.
 */
export function useExactNameFromUrl(setExactName: (name: string | null) => PayloadAction<string | null>): ExactNameFromUrl {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [initialName] = useState(() => parseExactNameParam(searchParams.get(FILTER_URL_PARAM_KEYS.NAME)));

  const appliedRef = useRef(false);
  useEffect(() => {
    if (appliedRef.current) return;
    appliedRef.current = true;
    dispatch(setExactName(initialName));
  }, [initialName, setExactName, dispatch]);

  return { nameFromUrl: initialName !== null, clearExactName: () => dispatch(setExactName(null)) };
}
