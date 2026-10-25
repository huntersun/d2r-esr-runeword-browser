// Active set bonuses of one equipment section (the player's main gear, or the
// mercenary's gear). Sections are never mixed: weapon-swap set items are left out of
// the player's count, and the mercenary wears its own sets.

import type { SetsBundle } from '@/features/game-data/engine/schema';
import type { EquipmentSlot, ItemRef, SetBonusGroupSnapshot, SetItemRef } from '../buildData';

const SLOT_ORDER: readonly EquipmentSlot[] = ['helmet', 'armor', 'weapon', 'shield', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2'];

export type SectionItems = Partial<Record<EquipmentSlot, ItemRef | null>>;

export interface SetItemBonusSummary {
  readonly name: string;
  /** The item's own partial groups that the equipped piece count activates. */
  readonly activePartial: readonly SetBonusGroupSnapshot[];
}

export interface SetBonusSummary {
  readonly setId: string;
  readonly name: string;
  /** Distinct pieces of the set equipped in the section (a duplicate item counts once, as in game). */
  readonly equipped: number;
  /** Pieces in the set; null when the bundle is not loaded or no longer has the set. */
  readonly total: number | null;
  readonly complete: boolean;
  /** Set-wide partial groups active at the equipped count (empty without the bundle). */
  readonly activePartial: readonly SetBonusGroupSnapshot[];
  /** The first set-wide partial group not yet active. */
  readonly nextPartial: SetBonusGroupSnapshot | null;
  /** Full-set lines; empty unless the set is complete. */
  readonly full: readonly string[];
  /** The equipped pieces, in slot order. */
  readonly items: readonly SetItemBonusSummary[];
}

/** The section's set item refs in slot order. */
function sectionSetRefs(items: SectionItems): SetItemRef[] {
  return SLOT_ORDER.map((slot) => items[slot]).filter((ref): ref is SetItemRef => ref?.type === 'set');
}

/** Distinct equipped pieces per set id in one section (for marking a card's own partial groups). */
export function setPieceCounts(items: SectionItems): ReadonlyMap<string, number> {
  const names = new Map<string, Set<string>>();
  for (const ref of sectionSetRefs(items)) {
    const set = names.get(ref.snapshot.setId) ?? new Set<string>();
    set.add(ref.name);
    names.set(ref.snapshot.setId, set);
  }
  return new Map([...names].map(([setId, pieces]) => [setId, pieces.size]));
}

/** Whether a section has any set item equipped. */
export function hasSetItems(items: SectionItems): boolean {
  return sectionSetRefs(items).length > 0;
}

/**
 * Groups the section's set items by set and works out the active bonuses. Without the
 * bundle (loading, failed, or the set was removed) the set-wide lines are unknown, so
 * only the piece count and the items' own (snapshot) partial groups are reported.
 */
export function setBonuses(items: SectionItems, sets: SetsBundle | null): SetBonusSummary[] {
  const bySet = new Map<string, SetItemRef[]>();
  for (const ref of sectionSetRefs(items)) {
    const refs = bySet.get(ref.snapshot.setId) ?? [];
    if (!refs.some((other) => other.name === ref.name)) refs.push(ref);
    bySet.set(ref.snapshot.setId, refs);
  }

  return [...bySet].map(([setId, refs]) => {
    const equipped = refs.length;
    const set = sets?.sets.find((entry) => entry.id === setId) ?? null;
    const itemSummaries = refs.map((ref) => {
      // Prefer the current bundle's groups; fall back to the saved snapshot.
      const groups = set?.items.find((item) => item.name === ref.name)?.partial ?? ref.snapshot.partial;
      return { name: ref.name, activePartial: groups.filter((group) => group.pieces <= equipped) };
    });
    const total = set !== null ? set.items.length : null;
    const complete = total !== null && equipped >= total;
    return {
      setId,
      // Every group has at least one ref.
      name: set?.name ?? refs[0].snapshot.setName,
      equipped,
      total,
      complete,
      activePartial: set?.partial.filter((group) => group.pieces <= equipped) ?? [],
      nextPartial: set?.partial.find((group) => group.pieces > equipped) ?? null,
      full: complete && set !== null ? set.full : [],
      items: itemSummaries,
    };
  });
}
