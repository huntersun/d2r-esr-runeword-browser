import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { writePersistentJson } from '@/core/hooks/usePersistentState';
import { Button } from '@/components/ui/button';
import { RecipeCommonFilters } from '@/core/components/RecipeCommonFilters';
import { GemCheckboxGroup } from './GemCheckboxGroup';
import { useGemGroups } from '../hooks/useGemGroups';
import { useShareUrl } from '../hooks/useShareUrl';
import { useAvailableItemTypes } from '../hooks/useAvailableItemTypes';
import { GEMWORD_FILTER_STORAGE_KEY } from '../hooks/useUrlInitialize';
import { buildGemQualitySelection } from '../utils/filteringHelpers';
import { GEM_QUALITIES } from '@/features/data-sync/constants/constants';
import type { GemQuality } from '@/core/db';
import {
  setSearchText,
  setSocketCount,
  setMaxReqLevel,
  toggleItemType,
  toggleItemTypeGroup,
  selectAllItemTypes,
  deselectAllItemTypes,
  setAllGems,
  selectSearchText,
  selectSocketCount,
  selectMaxReqLevel,
  selectAllGems,
  deselectAllGems,
  selectSelectedGems,
  selectSelectedItemTypes,
} from '../store/gemwordsSlice';

const FILTER_SELECTORS = { selectSearchText, selectSocketCount, selectMaxReqLevel, selectSelectedItemTypes };
const FILTER_ACTIONS = {
  setSearchText,
  setSocketCount,
  setMaxReqLevel,
  toggleItemType,
  toggleItemTypeGroup,
  selectAllItemTypes,
  deselectAllItemTypes,
};

export function GemwordFilters() {
  const dispatch = useDispatch();
  const searchText = useSelector(selectSearchText);
  const socketCount = useSelector(selectSocketCount);
  const maxReqLevel = useSelector(selectMaxReqLevel);
  const selectedGems = useSelector(selectSelectedGems);
  const selectedItemTypes = useSelector(selectSelectedItemTypes);
  const gemGroups = useGemGroups();
  const itemTypes = useAvailableItemTypes();
  const getShareUrl = useShareUrl();

  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (Object.keys(selectedItemTypes).length === 0 || Object.keys(selectedGems).length === 0) return;

    // The first populated state comes from useUrlInitialize (storage or a shared
    // URL). Skip persisting it: re-writing storage-derived state is pointless,
    // and persisting URL-derived state would silently overwrite the user's own
    // saved filters. Only changes made after hydration are persisted.
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    writePersistentJson(typeof window === 'undefined' ? null : window.localStorage, GEMWORD_FILTER_STORAGE_KEY, {
      searchText,
      socketCount,
      maxReqLevel,
      selectedItemTypes,
      selectedGems,
    });
  }, [maxReqLevel, searchText, selectedGems, selectedItemTypes, socketCount]);

  const allGemsSelected = Object.keys(selectedGems).length > 0 && Object.values(selectedGems).every(Boolean);
  const noGemsSelected = Object.keys(selectedGems).length > 0 && Object.values(selectedGems).every((value) => !value);

  // Qualities that actually appear among the gems used by gemwords
  const availableQualities = new Set((gemGroups ?? []).flatMap((group) => group.gems.map((gem) => gem.quality)));

  const handleSelectQualityOnly = (quality: GemQuality) => {
    if (!gemGroups) return;
    dispatch(setAllGems(buildGemQualitySelection(gemGroups, quality)));
  };

  return (
    <div className="space-y-4 mb-6">
      <RecipeCommonFilters
        selectors={FILTER_SELECTORS}
        actions={FILTER_ACTIONS}
        itemTypes={itemTypes}
        getShareUrl={getShareUrl}
        idPrefix="gemword-"
        searchPlaceholder="Search name, gems or affixes..."
      />

      {/* Gem Filter */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">Gems:</span>
          <Button variant="outline" size="sm" onClick={() => dispatch(selectAllGems())} disabled={allGemsSelected}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={() => dispatch(deselectAllGems())} disabled={noGemsSelected}>
            None
          </Button>
          <span className="text-xs text-muted-foreground">Only quality:</span>
          {GEM_QUALITIES.filter((quality) => availableQualities.has(quality)).map((quality) => (
            <Button
              key={quality}
              variant="outline"
              size="sm"
              title={`Select only ${quality} gems`}
              onClick={() => {
                handleSelectQualityOnly(quality);
              }}
            >
              {quality}
            </Button>
          ))}
        </div>
        <GemCheckboxGroup />
      </div>
    </div>
  );
}
