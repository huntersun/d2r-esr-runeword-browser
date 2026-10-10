import type { PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

/**
 * Shared search/sockets/level/item-type filter state (plus the `?name=` exact-name focus) used by recipe list slices
 * (runewords, gemwords). Spread `itemTypeFilterInitialState` into the slice's
 * initial state, `itemTypeFilterReducers` into its reducers, and build the
 * matching selectors with `createItemTypeFilterSelectors`.
 */
export interface ItemTypeFilterState {
  searchText: string;
  socketCount: number | null;
  maxReqLevel: number | null;
  selectedItemTypes: Record<string, boolean>;
  /** Exact-name focus from the `name` URL param; set only by URL init, never by the search box */
  exactName: string | null;
}

export const itemTypeFilterInitialState: ItemTypeFilterState = {
  searchText: '',
  socketCount: null,
  maxReqLevel: null,
  selectedItemTypes: {},
  exactName: null,
};

export const itemTypeFilterReducers = {
  setSearchText(state: ItemTypeFilterState, action: PayloadAction<string>) {
    state.searchText = action.payload;
  },
  setExactName(state: ItemTypeFilterState, action: PayloadAction<string | null>) {
    state.exactName = action.payload;
  },
  setSocketCount(state: ItemTypeFilterState, action: PayloadAction<number | null>) {
    state.socketCount = action.payload;
  },
  setMaxReqLevel(state: ItemTypeFilterState, action: PayloadAction<number | null>) {
    state.maxReqLevel = action.payload;
  },
  toggleItemType(state: ItemTypeFilterState, action: PayloadAction<string>) {
    const itemType = action.payload;
    state.selectedItemTypes[itemType] = !state.selectedItemTypes[itemType];
  },
  setAllItemTypes(state: ItemTypeFilterState, action: PayloadAction<Record<string, boolean>>) {
    state.selectedItemTypes = action.payload;
  },
  selectAllItemTypes(state: ItemTypeFilterState) {
    for (const key of Object.keys(state.selectedItemTypes)) {
      state.selectedItemTypes[key] = true;
    }
  },
  deselectAllItemTypes(state: ItemTypeFilterState) {
    for (const key of Object.keys(state.selectedItemTypes)) {
      state.selectedItemTypes[key] = false;
    }
  },
  toggleItemTypeGroup(state: ItemTypeFilterState, action: PayloadAction<{ itemTypes: readonly string[]; selected: boolean }>) {
    const { itemTypes, selected } = action.payload;
    for (const itemType of itemTypes) {
      state.selectedItemTypes[itemType] = selected;
    }
  },
};

interface ItemTypeFilterStateSlice {
  readonly searchText: string;
  readonly socketCount: number | null;
  readonly maxReqLevel: number | null;
  readonly selectedItemTypes: Record<string, boolean>;
  readonly exactName: string | null;
}

export function createItemTypeFilterSelectors<RootStateT>(selectFilterState: (state: RootStateT) => ItemTypeFilterStateSlice) {
  return {
    selectSearchText: createSelector([selectFilterState], (filterState) => filterState.searchText),
    selectSocketCount: createSelector([selectFilterState], (filterState) => filterState.socketCount),
    selectMaxReqLevel: createSelector([selectFilterState], (filterState) => filterState.maxReqLevel),
    selectSelectedItemTypes: createSelector([selectFilterState], (filterState) => filterState.selectedItemTypes),
    selectExactName: createSelector([selectFilterState], (filterState) => filterState.exactName),
  };
}
