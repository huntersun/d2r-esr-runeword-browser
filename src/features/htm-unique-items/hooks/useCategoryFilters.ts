import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import type { HtmFilterGroup } from '../types';
import { groupHtmCategories } from '../constants/htmCategoryGroups';

/**
 * Hook to build category filter groups from the HTM unique items table.
 * Returns undefined while loading.
 */
export function useCategoryFilters(): readonly HtmFilterGroup[] | undefined {
  return useLiveQuery(async () => {
    const allItems = await db.htmUniqueItems.toArray();

    // Collect all unique categories
    const categories = new Set<string>();
    for (const item of allItems) {
      categories.add(item.category);
    }

    return groupHtmCategories(Array.from(categories).sort((a, b) => a.localeCompare(b)));
  });
}

/**
 * Get all categories from filter groups (for toggle logic)
 */
export function getAllCategoriesFromGroups(groups: readonly HtmFilterGroup[]): string[] {
  const categories: string[] = [];
  for (const group of groups) {
    categories.push(...group.categories);
  }
  return categories;
}
