import { useEffect, useState } from 'react';
import { loadGuide, type LoadedGuide } from '../engine/browser/loadGuide';

export type GuideState =
  | { readonly status: 'loading'; readonly data: null; readonly error: null; readonly retry: () => void }
  | { readonly status: 'ready'; readonly data: LoadedGuide; readonly error: null; readonly retry: () => void }
  | { readonly status: 'error'; readonly data: null; readonly error: unknown; readonly retry: () => void };

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: LoadedGuide }
  | { readonly status: 'error'; readonly error: unknown };

/** Loads the guide bundle (cached by `loadGuide`). `retry` refetches after an error. */
export function useGuide(): GuideState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadGuide().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data });
      },
      (error: unknown) => {
        console.error('Failed to load the guide:', error);
        if (!cancelled) setState({ status: 'error', error });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  };

  switch (state.status) {
    case 'loading':
      return { status: 'loading', data: null, error: null, retry };
    case 'ready':
      return { status: 'ready', data: state.data, error: null, retry };
    case 'error':
      return { status: 'error', data: null, error: state.error, retry };
  }
}
