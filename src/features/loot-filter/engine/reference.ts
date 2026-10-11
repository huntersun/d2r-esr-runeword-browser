import type { LootFilterDataBundle, TypesBundle } from '../../game-data/engine/schema.ts';
import type { LootFilterReference } from './types.ts';

/** Reference for validating without game data (every lookup fails, no sound rows). */
export const EMPTY_LOOT_FILTER_REFERENCE: LootFilterReference = {
  itemCodes: new Set(),
  itemTypes: new Set(),
  statNames: new Set(),
  statIds: new Set(),
  areaIds: new Set(),
  soundNames: new Set(),
  soundRowCount: 0,
  uniqueOrSetIds: new Set(),
};

/** Validator lookups from lootfilter.json and types.json. */
export function buildLootFilterReference(data: LootFilterDataBundle, types: TypesBundle): LootFilterReference {
  return {
    itemCodes: new Set(data.items.map((item) => item.code)),
    itemTypes: new Set(types.types.map((type) => type.code)),
    statNames: new Set(data.stats.map((stat) => stat.name).filter((name) => name !== '')),
    statIds: new Set(data.stats.map((stat) => stat.id)),
    areaIds: new Set(data.areas.map((area) => area.id)),
    soundNames: new Set(data.sounds.filter((name) => name !== '')),
    soundRowCount: data.sounds.length,
    uniqueOrSetIds: new Set([...data.uniques.map((entry) => entry.id), ...data.sets.map((entry) => entry.id)]),
  };
}
