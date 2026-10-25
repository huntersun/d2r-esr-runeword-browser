import type { BaseTier } from '@/features/game-data/constants/bases';
import type { BaseTierIndex } from '@/features/game-data/hooks/useBaseTiers';

/** The base tier of a unique item (tiers.json, by base code); undefined for rings, amulets, charms, jewels, unknown codes. */
export function uniqueBaseTier(baseItemCode: string, tierOf: BaseTierIndex): BaseTier | undefined {
  return tierOf.get(baseItemCode.toLowerCase());
}

/**
 * The tier filter: an empty selection keeps every item; otherwise the item's base tier must be selected, so items
 * whose base has no tier (rings, amulets, charms, jewels) or an unknown code are hidden.
 */
export function matchesTiers(baseItemCode: string, tiers: readonly BaseTier[], tierOf: BaseTierIndex): boolean {
  if (tiers.length === 0) return true;
  const tier = uniqueBaseTier(baseItemCode, tierOf);
  return tier !== undefined && tiers.includes(tier);
}
