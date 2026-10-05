import { describe, expect, it } from 'vitest';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';
import {
  ALL_CATEGORIES_MARKER,
  createCategorySelectionSelectors,
  matchesCategory,
  setCategoriesInSelection,
  toSelectedCategorySet,
  toggleCategoryInSelection,
} from './categorySelection';

const ALL = ['A', 'B', 'C'] as const;
const NONE = [NO_CATEGORIES_MARKER];

describe('toggleCategoryInSelection', () => {
  it('deselects one category from the all state', () => {
    expect(toggleCategoryInSelection([], 'B', ALL)).toEqual(['A', 'C']);
  });

  it('selects only the toggled category from the none state', () => {
    expect(toggleCategoryInSelection(NONE, 'A', ALL)).toEqual(['A']);
  });

  it('adds a category to a partial selection', () => {
    expect(toggleCategoryInSelection(['A'], 'B', ALL)).toEqual(['A', 'B']);
  });

  it('collapses to [] when every category ends up selected', () => {
    expect(toggleCategoryInSelection(['A', 'B'], 'C', ALL)).toEqual([]);
  });

  it('yields the none marker when the last category is deselected', () => {
    expect(toggleCategoryInSelection(['A'], 'A', ALL)).toEqual(NONE);
  });
});

describe('setCategoriesInSelection', () => {
  it('selects a group from none', () => {
    expect(setCategoriesInSelection(NONE, ['A', 'B'], true, ALL)).toEqual(['A', 'B']);
  });

  it('deselects a group back to none', () => {
    expect(setCategoriesInSelection(['A', 'B'], ['A', 'B'], false, ALL)).toEqual(NONE);
  });

  it('deselects a group from all and collapses back to all when re-selected', () => {
    expect(setCategoriesInSelection([], ['A', 'B'], false, ALL)).toEqual(['C']);
    expect(setCategoriesInSelection(['C'], ['A', 'B'], true, ALL)).toEqual([]);
  });
});

describe('toSelectedCategorySet / matchesCategory', () => {
  it('matches every category when all are selected', () => {
    const set = toSelectedCategorySet([]);
    expect(set.has(ALL_CATEGORIES_MARKER)).toBe(true);
    expect(matchesCategory('anything', set)).toBe(true);
  });

  it('matches only listed categories for a partial selection', () => {
    const set = toSelectedCategorySet(['A']);
    expect(matchesCategory('A', set)).toBe(true);
    expect(matchesCategory('B', set)).toBe(false);
  });

  it('matches nothing for the none selection', () => {
    const set = toSelectedCategorySet(NONE);
    expect(set.has(NO_CATEGORIES_MARKER)).toBe(true);
    expect(ALL.some((category) => matchesCategory(category, set))).toBe(false);
  });
});

describe('createCategorySelectionSelectors', () => {
  const { selectSelectedCategories, selectIsAllCategoriesSelected } = createCategorySelectionSelectors(
    (state: { readonly selection: readonly string[] }) => state.selection
  );

  it('derives the lookup set and the all-selected flag', () => {
    expect(selectIsAllCategoriesSelected({ selection: [] })).toBe(true);
    expect(selectIsAllCategoriesSelected({ selection: ['A'] })).toBe(false);
    expect([...selectSelectedCategories({ selection: ['A', 'B'] })]).toEqual(['A', 'B']);
  });
});
