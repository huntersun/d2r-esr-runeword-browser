import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { loadGameDataFile } from '@/features/game-data/engine/browser/loadGameData';
import type { HomeSearchSources } from '../utils/homeSearch';

type ItemSources = Required<Pick<HomeSearchSources, 'runewords' | 'gemwords' | 'uniques' | 'mythicals'>>;

/**
 * Unique runeword, gemword, unique and mythical names from Dexie (the name indexes), read only once `enabled` (the
 * startup sync has finished and the visitor has typed). Undefined until then.
 */
export function useItemNames(enabled: boolean): ItemSources | undefined {
  return useLiveQuery(async (): Promise<ItemSources | undefined> => {
    if (!enabled) return undefined;
    const [runewords, gemwords, uniques, mythicals] = await Promise.all([
      db.runewords.orderBy('name').uniqueKeys(),
      db.gemwords.orderBy('name').uniqueKeys(),
      db.htmUniqueItems.orderBy('name').uniqueKeys(),
      db.mythicalUniques.orderBy('name').uniqueKeys(),
    ]);
    return {
      runewords: runewords.map(String),
      gemwords: gemwords.map(String),
      uniques: uniques.map(String),
      mythicals: mythicals.map(String),
    };
  }, [enabled]);
}

export type BaseNamesState =
  | { readonly status: 'idle' | 'loading' | 'error' }
  | { readonly status: 'ready'; readonly names: readonly string[] };

/** Base item names from the static bases.json bundle, fetched once `enabled` (on the first keystroke). */
export function useBaseNames(enabled: boolean): BaseNamesState {
  const [loaded, setLoaded] = useState<BaseNamesState | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadGameDataFile('bases').then(
      (bundle) => {
        if (!cancelled) setLoaded({ status: 'ready', names: bundle.bases.map((base) => base.name) });
      },
      (error: unknown) => {
        console.error('[Home] Failed to load base names for search:', error);
        if (!cancelled) setLoaded({ status: 'error' });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (loaded !== null) return loaded;
  return { status: enabled ? 'loading' : 'idle' };
}
