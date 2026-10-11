import { useEffect, useState } from 'react';
import { decodeSprite, type DecodedSprite } from '../engine/sprite';
import { bundledIconUrl } from '../utils/bundledAssets';

export type SpriteState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly sprite: DecodedSprite }
  | { readonly status: 'error'; readonly message: string };

const IDLE: SpriteState = { status: 'idle' };
const LOADING: SpriteState = { status: 'loading' };

// Decoded sprites per bundled icon name, for the page's lifetime; a failed load is evicted so it can be retried.
const cache = new Map<string, Promise<DecodedSprite>>();

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function loadBundledSprite(name: string): Promise<DecodedSprite> {
  const cached = cache.get(name);
  if (cached) return cached;
  const promise = fetch(bundledIconUrl(name))
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load ${name}.sprite (HTTP ${String(response.status)})`);
      return response.arrayBuffer();
    })
    .then((bytes) => decodeSprite(bytes));
  promise.catch(() => {
    cache.delete(name);
  });
  cache.set(name, promise);
  return promise;
}

/** Fetches and decodes a bundled icon (`BUNDLED_ICONS`); idle while `name` is undefined. */
export function useBundledSprite(name: string | undefined): SpriteState {
  const [result, setResult] = useState<{ readonly name: string; readonly state: SpriteState } | null>(null);

  useEffect(() => {
    if (name === undefined) return;
    let cancelled = false;
    loadBundledSprite(name).then(
      (sprite) => {
        if (!cancelled) setResult({ name, state: { status: 'ready', sprite } });
      },
      (error: unknown) => {
        if (!cancelled) setResult({ name, state: { status: 'error', message: errorMessage(error) } });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (name === undefined) return IDLE;
  return result?.name === name ? result.state : LOADING;
}
