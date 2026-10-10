import { useLiveQuery } from 'dexie-react-hooks';
import { useSelector } from 'react-redux';
import { db } from '@/core/db';
import type { HtmUniqueItem } from '@/core/db';
import { selectSearchText, selectExactName, selectMaxReqLevel, selectSelectedCategories, selectIncludeCouponItems } from '../store';
import { applyExactNameFocus } from '@/core/utils/exactName';
import { parseSearchTerms } from '@/core/utils/searchTerms';
import { matchesCategory } from '@/core/store/categorySelection';

/**
 * Hook to get filtered and sorted HTM unique items.
 * Returns undefined while loading.
 */
export function useFilteredHtmUniqueItems(): readonly HtmUniqueItem[] | undefined {
  const searchText = useSelector(selectSearchText);
  const maxReqLevel = useSelector(selectMaxReqLevel);
  const selectedCategories = useSelector(selectSelectedCategories);
  const includeCouponItems = useSelector(selectIncludeCouponItems);
  const exactName = useSelector(selectExactName);

  const allItems = useLiveQuery(() => db.htmUniqueItems.toArray());

  if (!allItems) {
    return undefined;
  }

  const searchTerms = parseSearchTerms(searchText);

  // A name focus overrides every other filter
  const filtered = applyExactNameFocus(allItems, exactName, (list) =>
    list
      .filter((item) => includeCouponItems || !item.isAncientCoupon)
      .filter((item) => maxReqLevel === null || item.reqLevel <= maxReqLevel)
      .filter((item) => matchesCategory(item.category, selectedCategories))
      .filter((item) => matchesSearch(item, searchTerms))
  );

  // Sort by reqLevel ascending, then by name alphabetically
  filtered.sort((a, b) => {
    if (a.reqLevel !== b.reqLevel) {
      return a.reqLevel - b.reqLevel;
    }
    return a.name.localeCompare(b.name);
  });

  return filtered;
}

function matchesSearch(item: HtmUniqueItem, searchTerms: readonly string[]): boolean {
  if (searchTerms.length === 0) return true;

  const propertyText = item.properties.join(' ');
  const searchableText = `${item.name} ${item.baseItem} ${item.category} ${propertyText} ${item.notes}`.toLowerCase();

  return searchTerms.every((term) => searchableText.includes(term));
}
