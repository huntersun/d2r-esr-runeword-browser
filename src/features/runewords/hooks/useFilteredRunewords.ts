import { useLiveQuery } from 'dexie-react-hooks';
import { useSelector } from 'react-redux';
import { db } from '@/core/db';
import type { Runeword } from '@/core/db/models';
import type { SocketableLookup } from '@/core/utils/socketableLookup';
import {
  selectSearchText,
  selectSocketCount,
  selectMaxReqLevel,
  selectSelectedItemTypes,
  selectSelectedRunes,
  selectMaxTierPoints,
  selectExactName,
} from '../store/runewordsSlice';
import { applyExactNameFocus } from '@/core/utils/exactName';
import { parseSearchTerms } from '@/core/utils/searchTerms';
import {
  matchesSearch,
  matchesSockets,
  matchesMaxReqLevel,
  matchesItemTypes,
  matchesRunes,
  matchesTierPoints,
  buildRuneCategoryMap,
  buildRuneBonusMap,
  buildGemBonusMap,
  expandRunewordsByColumn,
} from '../utils/filteringHelpers';

/** `lookup` is the screen-level rune/gem lookup (see useSocketableLookupQuery), reused for search and rune filters. */
export function useFilteredRunewords(lookup: SocketableLookup | undefined): readonly Runeword[] | undefined {
  const searchText = useSelector(selectSearchText);
  const socketCount = useSelector(selectSocketCount);
  const maxReqLevel = useSelector(selectMaxReqLevel);
  const selectedItemTypes = useSelector(selectSelectedItemTypes);
  const selectedRunes = useSelector(selectSelectedRunes);
  const maxTierPoints = useSelector(selectMaxTierPoints);
  const exactName = useSelector(selectExactName);

  // Fetch runewords pre-sorted by sortKey from IndexedDB (ESR/Kanji first by reqLevel, then LoD by reqLevel)
  const runewords = useLiveQuery(() => db.runewords.orderBy('sortKey').toArray(), []);

  if (!runewords || !lookup) return undefined;

  const runeBonusMap = buildRuneBonusMap(lookup.esrRunes.values(), lookup.lodRunes.values(), lookup.kanjiRunes.values());
  const gemBonusMap = buildGemBonusMap(lookup.gems.values());
  const runeCategoryMap = buildRuneCategoryMap(lookup.esrRunes.values(), lookup.lodRunes.values(), lookup.kanjiRunes.values());

  // Expand runewords with different column bonuses into separate entries per item category
  const expandedRunewords = expandRunewordsByColumn(runewords);

  const searchTerms = parseSearchTerms(searchText);

  // Filter preserves the pre-sorted order from IndexedDB; a name focus overrides every other filter
  return applyExactNameFocus(expandedRunewords, exactName, (list) =>
    list.filter((runeword) => {
      if (!matchesSearch(runeword, searchTerms, runeBonusMap, gemBonusMap)) return false;
      if (!matchesSockets(runeword, socketCount)) return false;
      if (!matchesMaxReqLevel(runeword, maxReqLevel)) return false;
      if (!matchesItemTypes(runeword, selectedItemTypes)) return false;
      if (!matchesRunes(runeword, selectedRunes, runeCategoryMap)) return false;
      if (!matchesTierPoints(runeword, maxTierPoints)) return false;
      return true;
    })
  );
}
