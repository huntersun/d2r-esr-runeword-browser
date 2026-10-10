import { useGameData } from './useGameData';
import { buildSourceIndex, type SourceIndex } from '../engine/sourceLookup';
import type { SourcesBundle } from '../engine/schema';

// One index per loaded bundle object (the loader caches the bundle for the page lifetime), shared by every screen.
const indexCache = new WeakMap<SourcesBundle, SourceIndex>();

function getIndex(bundle: SourcesBundle): SourceIndex {
  let index = indexCache.get(bundle);
  if (index === undefined) {
    index = buildSourceIndex(bundle);
    indexCache.set(bundle, index);
  }
  return index;
}

/**
 * Loads the `sources` game-data bundle for the item cards and returns its name index: null until the bundle has
 * loaded (or when it failed to load). Call once per list screen and pass the index down; the cards render no source
 * line while it is null.
 */
export function useItemSources(): SourceIndex | null {
  const sources = useGameData(['sources']);
  return sources.status === 'ready' ? getIndex(sources.data.sources) : null;
}
