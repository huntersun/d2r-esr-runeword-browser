import type { HtmUniqueItem, MythicalUnique } from '@/core/db';

/** Default number of distinguishing property lines shown per variant. */
export const MAX_HINT_LINES = 2;

interface VariantHintOptions<T> {
  /** Identity used for grouping (the item name). */
  readonly getName: (item: T) => string;
  /** Visible fields that already tell variants apart (e.g. base item + coupon flag). */
  readonly getDistinguishKey: (item: T) => string;
  readonly getProperties: (item: T) => readonly string[];
  readonly maxLines?: number;
}

/**
 * For items that share a name AND the visible distinguishing key (base item, coupon flag),
 * returns the property lines that set each variant apart: lines not present on every
 * variant of that sub-group, lines unique to the variant first. Items that are singletons
 * or already distinguishable by their key get no entry.
 */
export function computeVariantHints<T>(items: readonly T[], options: VariantHintOptions<T>): Map<T, readonly string[]> {
  const { getName, getDistinguishKey, getProperties, maxLines = MAX_HINT_LINES } = options;

  // Group by name + distinguishing key: only those sub-groups still look identical in the list.
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = `${getName(item)}\u0000${getDistinguishKey(item)}`;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [item]);
    else group.push(item);
  }

  const hints = new Map<T, readonly string[]>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;

    // How many variants of the group carry each line (counted once per variant).
    const lineCounts = new Map<string, number>();
    for (const item of group) {
      for (const line of new Set(getProperties(item))) lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
    }

    for (const item of group) {
      const lines = [...new Set(getProperties(item))];
      const exclusive = lines.filter((line) => lineCounts.get(line) === 1);
      const partial = lines.filter((line) => {
        const count = lineCounts.get(line) ?? 0;
        return count > 1 && count < group.length;
      });
      const picked = [...exclusive, ...partial].slice(0, maxLines);
      if (picked.length > 0) hints.set(item, picked);
    }
  }
  return hints;
}

/** Distinguishing property lines for same-name unique items not told apart by base item + coupon flag. */
export function uniqueVariantHints(items: readonly HtmUniqueItem[], maxLines?: number): Map<HtmUniqueItem, readonly string[]> {
  return computeVariantHints(items, {
    getName: (item) => item.name,
    getDistinguishKey: (item) => `${item.baseItem}\u0000${String(item.isAncientCoupon)}`,
    getProperties: (item) => item.properties,
    maxLines,
  });
}

/** Distinguishing property lines for same-name mythical uniques not told apart by base item. */
export function mythicalVariantHints(items: readonly MythicalUnique[], maxLines?: number): Map<MythicalUnique, readonly string[]> {
  return computeVariantHints(items, {
    getName: (item) => item.name,
    getDistinguishKey: (item) => item.baseItem,
    getProperties: (item) => item.properties,
    maxLines,
  });
}
