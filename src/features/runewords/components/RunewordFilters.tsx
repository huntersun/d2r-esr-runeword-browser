import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { RecipeCommonFilters } from '@/core/components/RecipeCommonFilters';
import { RuneCheckboxGroup } from './RuneCheckboxGroup';
import { TierPointsFilter } from './TierPointsFilter';
import { useShareUrl } from '../hooks/useShareUrl';
import { useAvailableItemTypes } from '../hooks/useAvailableItemTypes';
import {
  setSearchText,
  setSocketCount,
  setMaxReqLevel,
  toggleItemType,
  toggleItemTypeGroup,
  selectAllItemTypes,
  deselectAllItemTypes,
  selectSearchText,
  selectSocketCount,
  selectMaxReqLevel,
  selectSelectedItemTypes,
  selectAllRunes,
  deselectAllRunes,
  selectSelectedRunes,
} from '../store/runewordsSlice';

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

export function RunewordFilters() {
  const dispatch = useDispatch();
  const selectedRunes = useSelector(selectSelectedRunes);
  const itemTypes = useAvailableItemTypes();
  const getShareUrl = useShareUrl();

  const allRunesSelected = Object.keys(selectedRunes).length > 0 && Object.values(selectedRunes).every(Boolean);
  const noRunesSelected = Object.keys(selectedRunes).length > 0 && Object.values(selectedRunes).every((v) => !v);

  return (
    <div className="space-y-4 mb-6">
      <RecipeCommonFilters
        selectors={FILTER_SELECTORS}
        actions={FILTER_ACTIONS}
        itemTypes={itemTypes}
        getShareUrl={getShareUrl}
        idPrefix=""
        searchPlaceholder="Search name or affixes..."
      />

      {/* Tier Points Filter */}
      <TierPointsFilter />

      {/* Rune Filter with All/None toggles */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Runes:</span>
          <Button variant="outline" size="sm" onClick={() => dispatch(selectAllRunes())} disabled={allRunesSelected}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={() => dispatch(deselectAllRunes())} disabled={noRunesSelected}>
            None
          </Button>
        </div>
        <RuneCheckboxGroup />
      </div>
    </div>
  );
}
