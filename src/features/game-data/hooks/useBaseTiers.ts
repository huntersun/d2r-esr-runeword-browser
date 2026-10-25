import type { BaseTier } from '../constants/bases';
import type { TiersBundle } from '../engine/schema';
import { useGameData, type GameDataStatus } from './useGameData';

/** Base tier by base code (tiers.json); codes without a tier (rings, amulets, charms, jewels, arrows) are absent. */
export type BaseTierIndex = ReadonlyMap<string, BaseTier>;

export interface BaseTiersState {
  readonly status: GameDataStatus;
  /** Null until tiers.json has loaded, and after a failed load */
  readonly index: BaseTierIndex | null;
}

// One index per loaded bundle object (the loader caches the bundle for the page lifetime), shared by every screen.
const indexCache = new WeakMap<TiersBundle, BaseTierIndex>();

function getIndex(bundle: TiersBundle): BaseTierIndex {
  let index = indexCache.get(bundle);
  if (index === undefined) {
    index = new Map(Object.entries(bundle.codes));
    indexCache.set(bundle, index);
  }
  return index;
}

/**
 * Loads the `tiers` game-data bundle (Normal / Exceptional / Elite / Mythical of every weapon and armor row, spawnable
 * or not) for the unique and set item tier badges. Call once per list screen and pass the index down; the cards render
 * no badge while it is null.
 */
export function useBaseTiers(): BaseTiersState {
  const tiers = useGameData(['tiers']);
  return { status: tiers.status, index: tiers.status === 'ready' ? getIndex(tiers.data.tiers) : null };
}
