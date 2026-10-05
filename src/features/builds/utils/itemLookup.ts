import { db } from '@/core/db';
import type { HtmUniqueItem, MythicalUnique } from '@/core/db';
import type { MythicalItemRef, UniqueItemRef, UniqueSnapshot } from '../buildData';

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
// (Runewords/gemwords are unaffected — they use a natural [name+variant] key.)

interface UniqueLike {
  readonly baseItem: string;
  readonly category: string;
  readonly reqLevel: number;
  readonly properties: readonly string[];
}

/** Jaccard similarity of two property-line multisets (1 = same lines, 0 = nothing shared). */
function propertySimilarity(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const remaining = new Map<string, number>();
  for (const line of a) remaining.set(line, (remaining.get(line) ?? 0) + 1);
  let shared = 0;
  for (const line of b) {
    const count = remaining.get(line) ?? 0;
    if (count > 0) {
      shared++;
      remaining.set(line, count - 1);
    }
  }
  return shared / (a.length + b.length - shared);
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, index) => line === b[index]);
}

/**
 * Picks the record a saved snapshot most likely refers to among same-name candidates.
 *
 * 1. A single candidate is always returned as-is, so a real upstream stat change on a
 *    unique still resolves to it (and diffs as `changed`) instead of going missing.
 * 2. Candidates are narrowed by base item + category, then base item (the original
 *    behaviour); if that leaves one, it wins.
 * 3. Among the remaining same-base variants: an exact properties + reqLevel match wins,
 *    otherwise the highest property-line similarity (reqLevel match breaks ties).
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

  const exact = pool.find((m) => m.reqLevel === snapshot.reqLevel && sameLines(m.properties, savedProperties));
  if (exact) return exact;

  let best: T | null = null;
  let bestSimilarity = -1;
  let bestLevelMatch = false;
  for (const candidate of pool) {
    const similarity = propertySimilarity(candidate.properties, savedProperties);
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
