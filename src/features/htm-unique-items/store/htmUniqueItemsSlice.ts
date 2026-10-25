import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '@/core/store/store';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';
import { createCategorySelectionSelectors, setCategoriesInSelection, toggleCategoryInSelection } from '@/core/store/categorySelection';
import { BASE_TIERS, type BaseTier } from '@/features/game-data/constants/bases';
import type { AcquisitionFilter } from '../utils/acquisition';

/**
 * State for HTM unique items feature
 * selectedCategories: Array of categories that are selected for filtering
 * Empty array means "all categories selected" (no category filtering)
 */
interface HtmUniqueItemsState {
  readonly searchText: string;
  readonly maxReqLevel: number | null;
  readonly selectedCategories: readonly string[];
  /** Acquisition chip (All / Coupon only / Gambleable / Drop only / No coupon) */
  readonly acquisition: AcquisitionFilter;
  /** Exact-name focus from the `name` URL param; set only by URL init, never by the search box */
  readonly exactName: string | null;
  /** Base tiers to show (tiers.json); empty = all tiers, including items whose base has no tier */
  readonly tiers: readonly BaseTier[];
}

const initialState: HtmUniqueItemsState = {
  searchText: '',
  maxReqLevel: null,
  selectedCategories: [], // Empty = all selected
  acquisition: 'all',
  exactName: null,
  tiers: [],
};

const htmUniqueItemsSlice = createSlice({
  name: 'htmUniqueItems',
  initialState,
  reducers: {
    setSearchText(state, action: PayloadAction<string>) {
      state.searchText = action.payload;
    },
    setExactName(state, action: PayloadAction<string | null>) {
      state.exactName = action.payload;
    },
    setMaxReqLevel(state, action: PayloadAction<number | null>) {
      state.maxReqLevel = action.payload;
    },
    toggleCategory(
      state,
      action: PayloadAction<{
        category: string;
        allCategories: readonly string[];
      }>
    ) {
      const { category, allCategories } = action.payload;
      state.selectedCategories = toggleCategoryInSelection(state.selectedCategories, category, allCategories);
    },
    toggleGroup(
      state,
      action: PayloadAction<{
        groupCategories: readonly string[];
        selected: boolean;
        allCategories: readonly string[];
      }>
    ) {
      const { groupCategories, selected, allCategories } = action.payload;
      state.selectedCategories = setCategoriesInSelection(state.selectedCategories, groupCategories, selected, allCategories);
    },
    selectAllCategories(state) {
      state.selectedCategories = [];
    },
    deselectAllCategories(state) {
      state.selectedCategories = [NO_CATEGORIES_MARKER];
    },
    setSelectedCategories(state, action: PayloadAction<readonly string[]>) {
      state.selectedCategories = [...action.payload];
    },
    setAcquisition(state, action: PayloadAction<AcquisitionFilter>) {
      state.acquisition = action.payload;
    },
    toggleTier(state, action: PayloadAction<BaseTier>) {
      const tier = action.payload;
      // Kept in BASE_TIERS order so share links are stable
      state.tiers = state.tiers.includes(tier)
        ? state.tiers.filter((value) => value !== tier)
        : BASE_TIERS.filter((value) => value === tier || state.tiers.includes(value));
    },
    setTiers(state, action: PayloadAction<readonly BaseTier[]>) {
      state.tiers = BASE_TIERS.filter((tier) => action.payload.includes(tier));
    },
  },
});

export const {
  setSearchText,
  setExactName,
  setMaxReqLevel,
  toggleCategory,
  toggleGroup,
  selectAllCategories,
  deselectAllCategories,
  setSelectedCategories,
  setAcquisition,
  toggleTier,
  setTiers,
} = htmUniqueItemsSlice.actions;
export default htmUniqueItemsSlice.reducer;

// Selectors
const selectHtmUniqueItemsState = (state: RootState) => state.htmUniqueItems;

export const selectSearchText = createSelector([selectHtmUniqueItemsState], (s) => s.searchText);

export const selectExactName = createSelector([selectHtmUniqueItemsState], (s) => s.exactName);

export const selectMaxReqLevel = createSelector([selectHtmUniqueItemsState], (s) => s.maxReqLevel);

export const selectSelectedCategoriesRaw = createSelector([selectHtmUniqueItemsState], (s) => s.selectedCategories);

export const { selectSelectedCategories, selectIsAllCategoriesSelected } = createCategorySelectionSelectors(selectSelectedCategoriesRaw);

export const selectAcquisition = createSelector([selectHtmUniqueItemsState], (s) => s.acquisition);

export const selectTiers = createSelector([selectHtmUniqueItemsState], (s) => s.tiers);
