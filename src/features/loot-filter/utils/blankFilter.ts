import { FORMAT_VERSION, type LootFilter } from '../engine/types';

/** A new, empty filter: one level, no rules. `name` becomes the file's `title`. */
export function createBlankFilter(name: string): LootFilter {
  return {
    formatVersion: FORMAT_VERSION,
    title: name,
    filterLevels: [{ id: 1, name: 'Default' }],
    defaultLevel: 1,
    rules: [],
    leadingComments: [],
  };
}
