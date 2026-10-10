import { useLiveQuery } from 'dexie-react-hooks';
import { useSelector } from 'react-redux';
import { db } from '@/core/db';
import type { MythicalUnique } from '@/core/db';
import { selectSearchText, selectExactName, selectSelectedCategories } from '../store';
import { applyExactNameFocus } from '@/core/utils/exactName';
import { parseSearchTerms } from '@/core/utils/searchTerms';
import { matchesCategory } from '@/core/store/categorySelection';

/**
 * Hook to get filtered and sorted mythical unique items.
 * Returns undefined while loading.
 */
export function useFilteredMythicalUniques(): readonly MythicalUnique[] | undefined {
  const searchText = useSelector(selectSearchText);
  const selectedCategories = useSelector(selectSelectedCategories);
  const exactName = useSelector(selectExactName);

  const allItems = useLiveQuery(() => db.mythicalUniques.toArray());

  if (!allItems) {
    return undefined;
  }

  const searchTerms = parseSearchTerms(searchText);

  const filtered = applyExactNameFocus(allItems, exactName, (list) =>
    list.filter((item) => matchesCategory(item.category, selectedCategories)).filter((item) => matchesSearch(item, searchTerms))
  );

  // Sort by name alphabetically
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  return filtered;
}

function matchesSearch(item: MythicalUnique, searchTerms: readonly string[]): boolean {
  if (searchTerms.length === 0) return true;

  const propertyText = item.properties.join(' ');
  const specialPropertyText = item.specialProperties.join(' ');
  const notesText = item.notes.join(' ');
  const searchableText = `${item.name} ${item.baseItem} ${item.category} ${propertyText} ${specialPropertyText} ${notesText}`.toLowerCase();

  return searchTerms.every((term) => searchableText.includes(term));
}
