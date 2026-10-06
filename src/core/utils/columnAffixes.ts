import type { BonusPool, ColumnBonusPools, SocketableBonuses } from '@/core/db/models';
import type { BonusCategory } from './itemCategoryMapping';

/**
 * Whether a recipe's own bonuses differ between the given item categories
 * (compared by raw text, in order). Fewer than two categories never differ.
 */
export function hasColumnDifferences(columnAffixes: SocketableBonuses, categories: readonly BonusCategory[]): boolean {
  if (categories.length <= 1) return false;
  const firstColumn = columnAffixes[categories[0]];
  return categories.some((category) => {
    const column = columnAffixes[category];
    if (column.length !== firstColumn.length) return true;
    return column.some((affix, index) => affix.rawText !== firstColumn[index].rawText);
  });
}

function poolsKey(pools: readonly BonusPool[]): string {
  return JSON.stringify(pools.map((pool) => [pool.label, ...pool.affixes.map((affix) => affix.rawText)]));
}

/**
 * Whether a recipe's random bonus pools differ between the given item categories
 * (compared by label and raw text, in order). Fewer than two categories never differ.
 */
export function hasPoolColumnDifferences(columnBonusPools: ColumnBonusPools, categories: readonly BonusCategory[]): boolean {
  if (categories.length <= 1) return false;
  const firstColumn = poolsKey(columnBonusPools[categories[0]]);
  return categories.some((category) => poolsKey(columnBonusPools[category]) !== firstColumn);
}

/** The pools of the first column that has any (mirrors how `affixes` picks the first non-empty column). */
export function firstNonEmptyPools(columnBonusPools: ColumnBonusPools): readonly BonusPool[] {
  const { weaponsGloves, helmsBoots, armorShieldsBelts } = columnBonusPools;
  return [weaponsGloves, helmsBoots, armorShieldsBelts].find((pools) => pools.length > 0) ?? [];
}
