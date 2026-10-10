import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '@/core/store/store';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';
import { createCategorySelectionSelectors, toggleCategoryInSelection } from '@/core/store/categorySelection';

/**
 * State for mythical uniques feature.
 * selectedCategories: Empty array means "all categories selected" (no filtering);
 * [NO_CATEGORIES_MARKER] means "no categories selected".
 */
interface MythicalUniquesState {
  readonly searchText: string;
  readonly selectedCategories: readonly string[];
  /** Exact-name focus from the `name` URL param; set only by URL init, never by the search box */
  readonly exactName: string | null;
}

const initialState: MythicalUniquesState = {
  searchText: '',
  selectedCategories: [], // Empty = all selected
  exactName: null,
};

const mythicalUniquesSlice = createSlice({
  name: 'mythicalUniques',
  initialState,
  reducers: {
    setSearchText(state, action: PayloadAction<string>) {
      state.searchText = action.payload;
    },
    setExactName(state, action: PayloadAction<string | null>) {
      state.exactName = action.payload;
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
    selectAllCategories(state) {
      state.selectedCategories = [];
    },
    deselectAllCategories(state) {
      state.selectedCategories = [NO_CATEGORIES_MARKER];
    },
    setSelectedCategories(state, action: PayloadAction<readonly string[]>) {
      state.selectedCategories = [...action.payload];
    },
  },
});

export const { setSearchText, setExactName, toggleCategory, selectAllCategories, deselectAllCategories, setSelectedCategories } =
  mythicalUniquesSlice.actions;
export default mythicalUniquesSlice.reducer;

// Selectors
const selectMythicalUniquesState = (state: RootState) => state.mythicalUniques;

export const selectSearchText = createSelector([selectMythicalUniquesState], (s) => s.searchText);

export const selectExactName = createSelector([selectMythicalUniquesState], (s) => s.exactName);

export const selectSelectedCategoriesRaw = createSelector([selectMythicalUniquesState], (s) => s.selectedCategories);

export const { selectSelectedCategories, selectIsAllCategoriesSelected } = createCategorySelectionSelectors(selectSelectedCategoriesRaw);
