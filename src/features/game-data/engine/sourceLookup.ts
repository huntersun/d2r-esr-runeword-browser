/**
 * Name lookup into the `sources` bundle ("where does this item come from") for the item cards.
 * HTM names and string-table names differ in casing, apostrophes and whitespace; both sides go through
 * `normaliseItemName` before matching.
 */
import { normaliseItemName } from '../../../core/utils/itemName.ts';
import type { ItemSource, SourcesBundle } from './schema.ts';

export type ItemSourceKind = ItemSource['item'];

export type SourceIndex = ReadonlyMap<string, readonly ItemSource[]>;

/** Groups the bundle entries by normalised name (several entries when the same name exists as unique/set/misc). */
export function buildSourceIndex(bundle: SourcesBundle): SourceIndex {
  const index = new Map<string, ItemSource[]>();
  for (const entry of bundle.items) {
    const key = normaliseItemName(entry.name);
    const list = index.get(key);
    if (list === undefined) index.set(key, [entry]);
    else list.push(entry);
  }
  return index;
}

/**
 * Finds the entry for a display name. With `kind`, an entry of that kind wins; otherwise (or when no entry of that
 * kind exists) the first entry with the name is returned. `null` when the name is not in the bundle.
 */
export function findItemSource(index: SourceIndex, name: string, kind?: ItemSourceKind): ItemSource | null {
  const entries = index.get(normaliseItemName(name));
  if (entries === undefined || entries.length === 0) return null;
  if (kind !== undefined) {
    const preferred = entries.find((entry) => entry.item === kind);
    if (preferred !== undefined) return preferred;
  }
  return entries[0] ?? null;
}
