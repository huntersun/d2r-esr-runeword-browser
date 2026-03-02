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

interface SocketablesState {
  readonly enabledCategories: EnabledCategories;
  readonly searchText: string;
  readonly onlyHighestQuality: boolean;
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
      }>
    ) {
      const { searchText, enabledCategories, onlyHighestQuality } = action.payload;
      if (searchText !== undefined) state.searchText = searchText;
      if (enabledCategories !== undefined) state.enabledCategories = enabledCategories;
      if (onlyHighestQuality !== undefined) state.onlyHighestQuality = onlyHighestQuality;
    },
  },
});

export const { toggleCategory, setSearchText, toggleOnlyHighestQuality, selectAllCategories, initializeFromUrl } = socketablesSlice.actions;
export default socketablesSlice.reducer;

// Selectors
const selectSocketablesState = (state: RootState) => state.socketables;

export const selectEnabledCategories = createSelector([selectSocketablesState], (socketables) => socketables.enabledCategories);

export const selectSearchText = createSelector([selectSocketablesState], (socketables) => socketables.searchText);

export const selectOnlyHighestQuality = createSelector([selectSocketablesState], (socketables) => socketables.onlyHighestQuality);
