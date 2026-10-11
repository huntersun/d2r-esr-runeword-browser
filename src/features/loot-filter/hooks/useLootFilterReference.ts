import type { GameDataStatus } from '@/features/game-data/hooks/useGameData';
import type { LootFilterReference } from '../engine/types';
import { useLootFilterData } from './useLootFilterData';

export interface LootFilterReferenceState {
  readonly status: GameDataStatus;
  /** The game-data lookups once the bundles are in; the empty reference (no reference checks) until then or on error. */
  readonly reference: LootFilterReference;
}

/** The validator's reference from `useLootFilterData` (shared cache, stable identity). */
export function useLootFilterReference(): LootFilterReferenceState {
  const { status, reference } = useLootFilterData();
  return { status, reference };
}
