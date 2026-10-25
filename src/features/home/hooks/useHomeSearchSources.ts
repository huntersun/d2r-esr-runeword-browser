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

export type BundleNamesState =
  | { readonly status: 'idle' | 'loading' | 'error' }
  | { readonly status: 'ready'; readonly sources: HomeSearchSources };

type NamesBundle = 'bases' | 'sets';

/** The search names a static bundle contributes: base names, or set names and set item names */
async function loadNames(file: NamesBundle): Promise<HomeSearchSources> {
  if (file === 'bases') {
    const bundle = await loadGameDataFile('bases');
    return { bases: bundle.bases.map((base) => base.name) };
  }
  const bundle = await loadGameDataFile('sets');
  return { sets: bundle.sets.map((set) => set.name), setItems: bundle.sets.flatMap((set) => set.items.map((item) => item.name)) };
}

/** Item names from a static game-data bundle (bases.json, sets.json), fetched once `enabled` (on the first keystroke). */
export function useBundleNames(file: NamesBundle, enabled: boolean): BundleNamesState {
  const [loaded, setLoaded] = useState<BundleNamesState | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadNames(file).then(
      (sources) => {
        if (!cancelled) setLoaded({ status: 'ready', sources });
      },
      (error: unknown) => {
        console.error(`[Home] Failed to load ${file} names for search:`, error);
        if (!cancelled) setLoaded({ status: 'error' });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [file, enabled]);

  if (loaded !== null) return loaded;
  return { status: enabled ? 'loading' : 'idle' };
}
