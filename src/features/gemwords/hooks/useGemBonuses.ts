import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import type { SocketableBonuses } from '@/core/db/models';
import { aggregateBonusTexts, type BonusTextsByCategory } from '@/core/utils/socketableLookup';

export type GemBonusMap = ReadonlyMap<string, SocketableBonuses>;

/**
 * Loads the gems table once at screen level. Pass the resulting map down to
 * the cards — a per-card live query would issue cards × gems IndexedDB reads
 * and one subscription per card.
 */
export function useGemBonusMap(): GemBonusMap | undefined {
  return useLiveQuery(async () => {
    const gems = await db.gems.toArray();
    return new Map(gems.map((gem) => [gem.name, gem.bonuses]));
  }, []);
}

/** Aggregates the per-column bonuses of a gemword's gems for display. */
export function aggregateGemBonuses(gems: readonly string[], gemBonusMap: GemBonusMap): BonusTextsByCategory {
  return aggregateBonusTexts(gems.flatMap((gemName) => gemBonusMap.get(gemName) ?? []));
}
