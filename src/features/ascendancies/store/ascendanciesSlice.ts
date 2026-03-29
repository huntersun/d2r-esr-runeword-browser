import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import type { RootState } from '@/core/store/store';

interface AscendanciesState {
  readonly searchText: string;
}

const initialState: AscendanciesState = {
  searchText: '',
};

const ascendanciesSlice = createSlice({
  name: 'ascendancies',
  initialState,
  reducers: {
    setSearchText(state, action: PayloadAction<string>) {
      state.searchText = action.payload;
    },
    initializeFromUrl(state, action: PayloadAction<{ searchText: string }>) {
      state.searchText = action.payload.searchText;
    },
  },
});

export const { setSearchText, initializeFromUrl } = ascendanciesSlice.actions;
export default ascendanciesSlice.reducer;

// Selectors
const selectAscendanciesState = (state: RootState) => state.ascendancies;

export const selectSearchText = createSelector([selectAscendanciesState], (s) => s.searchText);
