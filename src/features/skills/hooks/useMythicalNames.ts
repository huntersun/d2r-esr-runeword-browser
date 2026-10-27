import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { normaliseItemName } from '@/core/utils/itemName';

const NONE: ReadonlySet<string> = new Set();

/**
 * Normalised names of the uniques the HTM mythicals page lists (the skill detail card links those there); empty until
 * the HTM data is in IndexedDB, when the Uniques page is linked instead.
 */
export function useMythicalNames(): ReadonlySet<string> {
  const names = useLiveQuery(async () => {
    const items = await db.mythicalUniques.toArray();
    return new Set(items.map((item) => normaliseItemName(item.name)));
  });
  return names ?? NONE;
}
