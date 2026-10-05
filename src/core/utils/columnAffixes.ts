import type { SocketableBonuses } from '@/core/db/models';
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
