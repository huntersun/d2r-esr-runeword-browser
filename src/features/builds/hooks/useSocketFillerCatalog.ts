import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { UNIQUE_JEWEL_CATEGORY, type SocketFillerCatalog } from '../utils/socketFillers';

/** Local runes, gems, crystals and unique jewels for the socket filler picker and display. Undefined while loading. */
export function useSocketFillerCatalog(): SocketFillerCatalog | undefined {
  return useLiveQuery(async () => {
    const [esrRunes, lodRunes, kanjiRunes, gems, crystals, uniqueJewels] = await Promise.all([
      db.esrRunes.orderBy('order').toArray(),
      db.lodRunes.orderBy('order').toArray(),
      db.kanjiRunes.toArray(),
      db.gems.toArray(),
      db.crystals.toArray(),
      db.htmUniqueItems.where('category').equals(UNIQUE_JEWEL_CATEGORY).toArray(),
    ]);
    return { esrRunes, lodRunes, kanjiRunes, gems, crystals, uniqueJewels };
  });
}
