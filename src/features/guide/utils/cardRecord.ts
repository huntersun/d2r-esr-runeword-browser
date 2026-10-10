/**
 * Name matching for the embedded item cards (`card` data blocks): the bundle carries the item's display name, and the
 * card is resolved in the browser against the viewer's local HTM data with the same normaliser as `?name=` links.
 * Pure functions over arrays so the matching is testable without Dexie.
 */
import type { Crystal, EsrRune, Gem, KanjiRune, LodRune } from '@/core/db';
import { normaliseItemName } from '@/core/utils/itemName';
import type { UnifiedSocketable } from '@/features/socketables/types';

/** Variants shown stacked when a runeword/gemword has at most this many; with more, only the first is shown. */
export const MAX_STACKED_VARIANTS = 2;

/** Every record whose name equals `name` after normalisation (case, whitespace, quotes and dashes unified), in input order. */
export function findCardRecords<T extends { readonly name: string }>(records: readonly T[], name: string): T[] {
  const target = normaliseItemName(name);
  return records.filter((record) => normaliseItemName(record.name) === target);
}

/** The first record whose name matches `name` (see findCardRecords), or null. */
export function findCardRecord<T extends { readonly name: string }>(records: readonly T[], name: string): T | null {
  return findCardRecords(records, name)[0] ?? null;
}

/**
 * The runeword/gemword variants to render for a name: all of them (by variant number) when there are at most
 * MAX_STACKED_VARIANTS, otherwise just the first variant. Empty when nothing matches.
 */
export function pickCardVariants<T extends { readonly name: string; readonly variant: number }>(records: readonly T[], name: string): T[] {
  const matches = findCardRecords(records, name).sort((a, b) => a.variant - b.variant);
  return matches.length <= MAX_STACKED_VARIANTS ? matches : matches.slice(0, 1);
}

export interface SocketableTables {
  readonly gems: readonly Gem[];
  readonly esrRunes: readonly EsrRune[];
  readonly lodRunes: readonly LodRune[];
  readonly kanjiRunes: readonly KanjiRune[];
  readonly crystals: readonly Crystal[];
}

/**
 * Finds a socketable by name across the five socketable tables (gems, ESR runes, LoD runes, Kanji runes, crystals —
 * checked in that order) and shapes it like the socketables screen does for its card. Null when nothing matches.
 */
export function findSocketable(tables: SocketableTables, name: string): UnifiedSocketable | null {
  const gem = findCardRecord(tables.gems, name);
  if (gem) {
    return {
      name: gem.name,
      category: 'gems',
      color: gem.color,
      reqLevel: gem.reqLevel,
      bonuses: gem.bonuses,
      sortOrder: 0,
      quality: gem.quality,
    };
  }
  const esrRune = findCardRecord(tables.esrRunes, name);
  if (esrRune) {
    const { name: runeName, color, reqLevel, bonuses, points } = esrRune;
    return { name: runeName, category: 'esrRunes', color, reqLevel, bonuses, sortOrder: 0, points };
  }
  const lodRune = findCardRecord(tables.lodRunes, name);
  if (lodRune) {
    const { name: runeName, reqLevel, bonuses, points } = lodRune;
    return { name: runeName, category: 'lodRunes', color: null, reqLevel, bonuses, sortOrder: 0, points };
  }
  const kanjiRune = findCardRecord(tables.kanjiRunes, name);
  if (kanjiRune) {
    const { name: runeName, reqLevel, bonuses } = kanjiRune;
    return { name: runeName, category: 'kanjiRunes', color: null, reqLevel, bonuses, sortOrder: 0 };
  }
  const crystal = findCardRecord(tables.crystals, name);
  if (crystal) {
    const { name: crystalName, color, reqLevel, bonuses, quality } = crystal;
    return { name: crystalName, category: 'crystals', color, reqLevel, bonuses, sortOrder: 0, quality };
  }
  return null;
}
