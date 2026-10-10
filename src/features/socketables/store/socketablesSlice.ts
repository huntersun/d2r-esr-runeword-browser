import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '@/core/store/store';

export interface EnabledCategories {
  readonly gems: boolean;
  readonly esrRunes: boolean;
  readonly lodRunes: boolean;
  readonly kanjiRunes: boolean;
  readonly crystals: boolean;
}

/** All socketable categories, in display/URL order. */
export const SOCKETABLE_CATEGORIES: readonly (keyof EnabledCategories)[] = ['gems', 'esrRunes', 'lodRunes', 'kanjiRunes', 'crystals'];

interface SocketablesState {
  readonly enabledCategories: EnabledCategories;
  readonly searchText: string;
  readonly onlyHighestQuality: boolean;
  /** Exact-name focus from the `name` URL param; set only by URL init, never by the search box */
  readonly exactName: string | null;
}

const initialState: SocketablesState = {
  enabledCategories: {
    gems: true,
    esrRunes: true,
    lodRunes: true,
    kanjiRunes: true,
    crystals: true,
  },
  searchText: '',
  onlyHighestQuality: true,
  exactName: null,
};

const socketablesSlice = createSlice({
  name: 'socketables',
  initialState,
  reducers: {
    toggleCategory(state, action: PayloadAction<keyof EnabledCategories>) {
      const category = action.payload;
      state.enabledCategories[category] = !state.enabledCategories[category];
    },
    setSearchText(state, action: PayloadAction<string>) {
      state.searchText = action.payload;
    },
    setExactName(state, action: PayloadAction<string | null>) {
      state.exactName = action.payload;
    },
    toggleOnlyHighestQuality(state) {
      state.onlyHighestQuality = !state.onlyHighestQuality;
    },
    selectAllCategories(state) {
      state.enabledCategories = {
        gems: true,
        esrRunes: true,
        lodRunes: true,
        kanjiRunes: true,
        crystals: true,
      };
    },
    initializeFromUrl(
      state,
      action: PayloadAction<{
        searchText?: string;
        enabledCategories?: EnabledCategories;
        onlyHighestQuality?: boolean;
        exactName?: string | null;
      }>
    ) {
      const { searchText, enabledCategories, onlyHighestQuality, exactName } = action.payload;
      if (exactName !== undefined) state.exactName = exactName;
      if (searchText !== undefined) state.searchText = searchText;
      if (enabledCategories !== undefined) state.enabledCategories = enabledCategories;
      if (onlyHighestQuality !== undefined) state.onlyHighestQuality = onlyHighestQuality;
    },
  },
});

export const { toggleCategory, setSearchText, setExactName, toggleOnlyHighestQuality, selectAllCategories, initializeFromUrl } =
  socketablesSlice.actions;
export default socketablesSlice.reducer;

// Selectors
const selectSocketablesState = (state: RootState) => state.socketables;

export const selectEnabledCategories = createSelector([selectSocketablesState], (socketables) => socketables.enabledCategories);

export const selectSearchText = createSelector([selectSocketablesState], (socketables) => socketables.searchText);

export const selectExactName = createSelector([selectSocketablesState], (socketables) => socketables.exactName);

export const selectOnlyHighestQuality = createSelector([selectSocketablesState], (socketables) => socketables.onlyHighestQuality);
