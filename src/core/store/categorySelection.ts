import { createSelector } from 'reselect';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';

/**
 * Shared "selected categories" list logic used by the unique item slices
 * (HTM uniques, mythical uniques). The stored list encodes:
 * - `[]` → all categories selected
 * - `[NO_CATEGORIES_MARKER]` → no categories selected
 * - otherwise → exactly the listed categories
 */
export type CategorySelection = readonly string[];

/** Member of the derived selection set meaning "every category is selected". */
export const ALL_CATEGORIES_MARKER = '__all__';

function toExplicitSet(selection: CategorySelection, allCategories: readonly string[]): Set<string> {
  if (selection.length === 0) return new Set(allCategories);
  if (selection.length === 1 && selection[0] === NO_CATEGORIES_MARKER) return new Set();
  return new Set(selection);
}

function fromExplicitSet(selected: ReadonlySet<string>, allCategories: readonly string[]): string[] {
  if (selected.size === allCategories.length) return [];
  if (selected.size === 0) return [NO_CATEGORIES_MARKER];
  return Array.from(selected);
}

/** Flips a single category, collapsing to the all/none encodings when appropriate. */
export function toggleCategoryInSelection(selection: CategorySelection, category: string, allCategories: readonly string[]): string[] {
  const selected = toExplicitSet(selection, allCategories);
  if (selected.has(category)) {
    selected.delete(category);
  } else {
    selected.add(category);
  }
  return fromExplicitSet(selected, allCategories);
}

/** Selects or deselects a group of categories, collapsing to the all/none encodings when appropriate. */
export function setCategoriesInSelection(
  selection: CategorySelection,
  categories: readonly string[],
  selected: boolean,
  allCategories: readonly string[]
): string[] {
  const current = toExplicitSet(selection, allCategories);
  for (const category of categories) {
    if (selected) {
      current.add(category);
    } else {
      current.delete(category);
    }
  }
  return fromExplicitSet(current, allCategories);
}

/** Lookup set for filtering: contains ALL_CATEGORIES_MARKER when everything is selected. */
export function toSelectedCategorySet(selection: CategorySelection): ReadonlySet<string> {
  return selection.length === 0 ? new Set([ALL_CATEGORIES_MARKER]) : new Set(selection);
}

export function matchesCategory(category: string, selectedCategories: ReadonlySet<string>): boolean {
  return selectedCategories.has(ALL_CATEGORIES_MARKER) || selectedCategories.has(category);
}

export function createCategorySelectionSelectors<RootStateT>(selectSelection: (state: RootStateT) => CategorySelection) {
  return {
    selectSelectedCategories: createSelector([selectSelection], toSelectedCategorySet),
    selectIsAllCategoriesSelected: createSelector([selectSelection], (selection) => selection.length === 0),
  };
}
