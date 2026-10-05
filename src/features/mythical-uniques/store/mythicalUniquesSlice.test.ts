import { describe, expect, it } from 'vitest';
import type { Action } from '@reduxjs/toolkit';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';
import mythicalUniquesReducer, { deselectAllCategories, selectAllCategories, toggleCategory } from './mythicalUniquesSlice';

type MythicalUniquesStateShape = ReturnType<typeof mythicalUniquesReducer>;

const ALL = ['A', 'B', 'C'] as const;

const reduce = (...actions: readonly Action[]): MythicalUniquesStateShape =>
  actions.reduce<MythicalUniquesStateShape>(
    (state, action) => mythicalUniquesReducer(state, action),
    undefined as unknown as MythicalUniquesStateShape
  );

const toggle = (category: string) => toggleCategory({ category, allCategories: ALL });

describe('mythicalUniquesSlice toggleCategory', () => {
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
