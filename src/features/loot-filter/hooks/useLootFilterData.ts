import { useGameData, type GameDataStatus } from '@/features/game-data/hooks/useGameData';
import type { LootFilterDataBundle, TypesBundle } from '@/features/game-data/engine/schema';
import {
  buildLookup,
  buildPickerOptions,
  EMPTY_LOOKUP,
  EMPTY_PICKER_OPTIONS,
  type LootFilterLookup,
  type LootFilterPickerOptions,
} from '../utils/lookup';

export interface LootFilterData {
  readonly status: GameDataStatus;
  readonly data: LootFilterDataBundle | null;
  readonly types: TypesBundle | null;
  /** Names for codes and ids; every lookup returns undefined until the bundles are in. */
  readonly lookup: LootFilterLookup;
  /** The pickers' option lists; empty until the bundles are in (the pickers then take typed codes and ids). */
  readonly options: LootFilterPickerOptions;
}

const BUNDLES = ['lootfilter', 'types'] as const;

// One lookup per loaded bundle pair: the bundles are cached for the page's lifetime, so the maps and option
// lists are built once and every component shares them.
let cached: {
  readonly data: LootFilterDataBundle;
  readonly types: TypesBundle;
  readonly lookup: LootFilterLookup;
  readonly options: LootFilterPickerOptions;
} | null = null;

function derived(data: LootFilterDataBundle, types: TypesBundle) {
  if (cached?.data !== data || cached.types !== types) {
    cached = { data, types, lookup: buildLookup(data, types), options: buildPickerOptions(data, types) };
  }
  return cached;
}

/** Loads the `lootfilter` and `types` bundles for the rule editor's pickers, summaries and names. */
export function useLootFilterData(): LootFilterData {
  const gameData = useGameData(BUNDLES);
  if (gameData.status !== 'ready') {
    return { status: gameData.status, data: null, types: null, lookup: EMPTY_LOOKUP, options: EMPTY_PICKER_OPTIONS };
  }
  const { lootfilter, types } = gameData.data;
  const { lookup, options } = derived(lootfilter, types);
  return { status: 'ready', data: lootfilter, types, lookup, options };
}
