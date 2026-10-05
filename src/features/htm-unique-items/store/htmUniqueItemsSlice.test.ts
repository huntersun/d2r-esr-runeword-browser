import { describe, expect, it } from 'vitest';
import type { Action } from '@reduxjs/toolkit';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';
import htmUniqueItemsReducer, { deselectAllCategories, selectAllCategories, toggleCategory, toggleGroup } from './htmUniqueItemsSlice';

type HtmUniqueItemsStateShape = ReturnType<typeof htmUniqueItemsReducer>;

const ALL = ['A', 'B', 'C'] as const;

const reduce = (...actions: readonly Action[]): HtmUniqueItemsStateShape =>
  actions.reduce<HtmUniqueItemsStateShape>(
    (state, action) => htmUniqueItemsReducer(state, action),
    undefined as unknown as HtmUniqueItemsStateShape
  );

const toggle = (category: string) => toggleCategory({ category, allCategories: ALL });

describe('htmUniqueItemsSlice toggleCategory', () => {
  it('starts with all categories selected', () => {
    expect(reduce({ type: '@@INIT' }).selectedCategories).toEqual([]);
  });

  it('selects only the toggled category after deselect all', () => {
    expect(reduce(deselectAllCategories(), toggle('A')).selectedCategories).toEqual(['A']);
  });

  it('adds further categories after deselect all without jumping to all', () => {
    expect(reduce(deselectAllCategories(), toggle('A'), toggle('B')).selectedCategories).toEqual(['A', 'B']);
  });

  it('collapses to [] (all) when every category is toggled back on', () => {
    expect(reduce(deselectAllCategories(), toggle('A'), toggle('B'), toggle('C')).selectedCategories).toEqual([]);
  });

  it('deselects one category from the all state', () => {
    expect(reduce(selectAllCategories(), toggle('B')).selectedCategories).toEqual(['A', 'C']);
  });

  it('yields the none marker when the last selected category is deselected', () => {
    expect(reduce(deselectAllCategories(), toggle('A'), toggle('A')).selectedCategories).toEqual([NO_CATEGORIES_MARKER]);
    expect(reduce(toggle('A'), toggle('B'), toggle('C')).selectedCategories).toEqual([NO_CATEGORIES_MARKER]);
  });
});

describe('htmUniqueItemsSlice toggleGroup', () => {
  const group = (groupCategories: readonly string[], selected: boolean) => toggleGroup({ groupCategories, selected, allCategories: ALL });

  it('selects a group from none, deselects it back to none, and collapses to all', () => {
    expect(reduce(deselectAllCategories(), group(['A', 'B'], true)).selectedCategories).toEqual(['A', 'B']);
    expect(reduce(deselectAllCategories(), group(['A', 'B'], true), group(['A', 'B'], false)).selectedCategories).toEqual([
      NO_CATEGORIES_MARKER,
    ]);
    expect(reduce(group(['A', 'B'], false), group(['A', 'B'], true)).selectedCategories).toEqual([]);
  });
});
