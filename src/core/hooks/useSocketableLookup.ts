import { createContext, use } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { buildSocketableLookup, type SocketableLookup } from '@/core/utils/socketableLookup';

/**
 * Screen-level rune/gem lookup for badges, tooltips and bonus aggregation, so
 * that cards don't each open their own IndexedDB live queries.
 * `null` = no provider above; `undefined` = provided but still loading.
 */
export const SocketableLookupContext = createContext<SocketableLookup | undefined | null>(null);

export function useSocketableLookup(): SocketableLookup | undefined | null {
  return use(SocketableLookupContext);
}

/** Loads all rune tables and gems once. Call at screen level and provide via `SocketableLookupContext`. */
export function useSocketableLookupQuery(): SocketableLookup | undefined {
  return useLiveQuery(async () => {
    const [esrRunes, lodRunes, kanjiRunes, gems] = await Promise.all([
      db.esrRunes.toArray(),
      db.lodRunes.toArray(),
      db.kanjiRunes.toArray(),
      db.gems.toArray(),
    ]);
    return buildSocketableLookup(esrRunes, lodRunes, kanjiRunes, gems);
  }, []);
}
