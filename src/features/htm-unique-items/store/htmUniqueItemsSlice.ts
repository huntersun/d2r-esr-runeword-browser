import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '@/core/store/store';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';
import { createCategorySelectionSelectors, setCategoriesInSelection, toggleCategoryInSelection } from '@/core/store/categorySelection';

/**
 * State for HTM unique items feature
 * selectedCategories: Array of categories that are selected for filtering
 * Empty array means "all categories selected" (no category filtering)
 */
interface HtmUniqueItemsState {
  readonly searchText: string;
  readonly maxReqLevel: number | null;
  readonly selectedCategories: readonly string[];
  readonly includeCouponItems: boolean;
}

const initialState: HtmUniqueItemsState = {
  searchText: '',
  maxReqLevel: null,
  selectedCategories: [], // Empty = all selected
  includeCouponItems: true,
};

const htmUniqueItemsSlice = createSlice({
  name: 'htmUniqueItems',
  initialState,
  reducers: {
    setSearchText(state, action: PayloadAction<string>) {
      state.searchText = action.payload;
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
    setIncludeCouponItems(state, action: PayloadAction<boolean>) {
      state.includeCouponItems = action.payload;
    },
  },
});

export const {
  setSearchText,
  setMaxReqLevel,
  toggleCategory,
  toggleGroup,
  selectAllCategories,
  deselectAllCategories,
  setSelectedCategories,
  setIncludeCouponItems,
} = htmUniqueItemsSlice.actions;
export default htmUniqueItemsSlice.reducer;

// Selectors
const selectHtmUniqueItemsState = (state: RootState) => state.htmUniqueItems;

export const selectSearchText = createSelector([selectHtmUniqueItemsState], (s) => s.searchText);

export const selectMaxReqLevel = createSelector([selectHtmUniqueItemsState], (s) => s.maxReqLevel);

export const selectSelectedCategoriesRaw = createSelector([selectHtmUniqueItemsState], (s) => s.selectedCategories);

export const { selectSelectedCategories, selectIsAllCategoriesSelected } = createCategorySelectionSelectors(selectSelectedCategoriesRaw);

export const selectIncludeCouponItems = createSelector([selectHtmUniqueItemsState], (s) => s.includeCouponItems);
