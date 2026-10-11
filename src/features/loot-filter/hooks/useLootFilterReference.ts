import { useGameData, type GameDataStatus } from '@/features/game-data/hooks/useGameData';
import type { LootFilterDataBundle, TypesBundle } from '@/features/game-data/engine/schema';
import { buildLootFilterReference, EMPTY_LOOT_FILTER_REFERENCE } from '../engine/reference';
import type { LootFilterReference } from '../engine/types';

export interface LootFilterReferenceState {
  readonly status: GameDataStatus;
  /** The game-data lookups once the bundles are in; the empty reference (no reference checks) until then or on error. */
  readonly reference: LootFilterReference;
}

const BUNDLES = ['lootfilter', 'types'] as const;

// One reference per loaded bundle pair: the bundles are cached for the page's lifetime, so this keeps the
// reference's identity stable across components and renders (the diagnostics selector memoizes on it).
let cached: { readonly data: LootFilterDataBundle; readonly types: TypesBundle; readonly reference: LootFilterReference } | null = null;

function referenceFor(data: LootFilterDataBundle, types: TypesBundle): LootFilterReference {
  if (cached?.data !== data || cached.types !== types) cached = { data, types, reference: buildLootFilterReference(data, types) };
  return cached.reference;
}

/** Loads the `lootfilter` and `types` bundles and builds the validator's reference from them. */
export function useLootFilterReference(): LootFilterReferenceState {
  const gameData = useGameData(BUNDLES);
  if (gameData.status !== 'ready') return { status: gameData.status, reference: EMPTY_LOOT_FILTER_REFERENCE };
  return { status: 'ready', reference: referenceFor(gameData.data.lootfilter, gameData.data.types) };
}
