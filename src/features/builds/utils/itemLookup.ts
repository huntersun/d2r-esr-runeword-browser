import { db } from '@/core/db';
import type { HtmUniqueItem, MythicalUnique } from '@/core/db';
import type { MythicalItemRef, UniqueItemRef, UniqueSnapshot } from '../buildData';
import { propertyText, propertyTokens } from './propertyText';

// htmUniqueItems / mythicalUniques use an auto-increment primary key (`++id`) that is
// reassigned on every data re-parse: the sync clears each table and bulk-puts the
// freshly parsed rows, and IndexedDB's key generator is NOT reset by clear(), so the
// id range shifts each sync (and differs per device). A build therefore can't rely on
// the stored ref.id to find its item again — after any re-sync every id is orphaned.
// Resolve by the stable item name from the saved snapshot instead.
//
// A name is NOT unique: ESR ships several same-name items, sometimes even on the same
// base item + category (Ancient Coupon variants like Lycander's Aim / The Oculus, the
// three Tathamet's Awakening mythicals, Vorador's Essence, ...). Those variants differ
// only in their stats, so the saved snapshot's properties are the disambiguator. This
// works purely from data every saved build already carries (no new ref field), so old
// builds and exported JSON resolve correctly without migration.
// Properties are compared as text, not lines: the ESR site hard-wraps long lines and
// the parsers may merge those wraps differently over time (see propertyText.ts).
// (Runewords/gemwords are unaffected — they use a natural [name+variant] key.)

interface UniqueLike {
  readonly baseItem: string;
  readonly category: string;
  readonly reqLevel: number;
  readonly properties: readonly string[];
  /** Mythicals only. */
  readonly specialProperties?: readonly string[];
}

/** Jaccard similarity of two word multisets (1 = same words, 0 = nothing shared). */
function tokenSimilarity(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const remaining = new Map<string, number>();
  for (const token of a) remaining.set(token, (remaining.get(token) ?? 0) + 1);
  let shared = 0;
  for (const token of b) {
    const count = remaining.get(token) ?? 0;
    if (count > 0) {
      shared++;
      remaining.set(token, count - 1);
    }
  }
  return shared / (a.length + b.length - shared);
}

/**
 * The lines of a record to compare with a snapshot: special + regular when the snapshot
 * recorded special lines, otherwise regular only (uniques, and legacy mythical snapshots
 * that never stored them).
 */
function comparableLines(item: UniqueLike, includeSpecial: boolean): readonly string[] {
  return includeSpecial ? [...(item.specialProperties ?? []), ...item.properties] : item.properties;
}

/**
 * Picks the record a saved snapshot most likely refers to among same-name candidates.
 *
 * 1. A single candidate is always returned as-is, so a real upstream stat change on a
 *    unique still resolves to it (and diffs as `changed`) instead of going missing.
 * 2. Candidates are narrowed by base item + category, then base item (the original
 *    behaviour); if that leaves one, it wins.
 * 3. Among the remaining same-base variants: an exact properties text + reqLevel match
 *    wins, otherwise the highest property word similarity (reqLevel match breaks ties).
 *    Both ignore line wrapping, so a snapshot saved with split lines still matches the
 *    merged lines of current data.
 *    Remaining ties keep the first candidate, i.e. the previous `matches[0]` behaviour.
 */
export function pickBestMatch<T extends UniqueLike>(matches: readonly T[], snapshot: UniqueSnapshot): T | null {
  if (matches.length <= 1) return matches[0] ?? null;

  const sameBaseAndCategory = matches.filter((m) => m.baseItem === snapshot.baseItem && m.category === snapshot.category);
  const sameBase = matches.filter((m) => m.baseItem === snapshot.baseItem);
  const pool = sameBaseAndCategory.length > 0 ? sameBaseAndCategory : sameBase.length > 0 ? sameBase : matches;
  if (pool.length === 1) return pool[0] ?? null;

  // Defensive: snapshots come from jsonb, so tolerate a missing properties array.
  const savedProperties: readonly string[] = Array.isArray(snapshot.properties) ? snapshot.properties : [];
  // Only mythical snapshots saved since specialProperties was snapshotted carry it.
  const savedSpecial: readonly string[] | null = Array.isArray(snapshot.specialProperties) ? snapshot.specialProperties : null;
  const includeSpecial = savedSpecial !== null;
  const savedLines = savedSpecial !== null ? [...savedSpecial, ...savedProperties] : savedProperties;
  const savedText = propertyText(savedLines);
  const savedTokens = propertyTokens(savedLines);

  const exact = pool.find((m) => m.reqLevel === snapshot.reqLevel && propertyText(comparableLines(m, includeSpecial)) === savedText);
  if (exact) return exact;

  let best: T | null = null;
  let bestSimilarity = -1;
  let bestLevelMatch = false;
  for (const candidate of pool) {
    const similarity = tokenSimilarity(propertyTokens(comparableLines(candidate, includeSpecial)), savedTokens);
    const levelMatch = candidate.reqLevel === snapshot.reqLevel;
    // Similarity dominates; reqLevel only breaks ties between equally similar variants.
    if (similarity > bestSimilarity || (similarity === bestSimilarity && levelMatch && !bestLevelMatch)) {
      best = candidate;
      bestSimilarity = similarity;
      bestLevelMatch = levelMatch;
    }
  }
  return best;
}

/** The current htmUniqueItems record behind a unique ref, matched by stable name + saved stats. */
export async function findUniqueRecord(ref: UniqueItemRef): Promise<HtmUniqueItem | null> {
  const matches = await db.htmUniqueItems.where('name').equals(ref.snapshot.name).toArray();
  return pickBestMatch(matches, ref.snapshot);
}

/** The current mythicalUniques record behind a mythical ref, matched by stable name + saved stats. */
export async function findMythicalRecord(ref: MythicalItemRef): Promise<MythicalUnique | null> {
  const matches = await db.mythicalUniques.where('name').equals(ref.snapshot.name).toArray();
  return pickBestMatch(matches, ref.snapshot);
}
