import { describe, expect, it } from 'vitest';
import { buildMythicalShareParams, hasMythicalFilterParams, parseMythicalUrlParams, type MythicalShareFilters } from './urlParams';

const DEFAULTS: MythicalShareFilters = { searchText: '', maxReqLevel: null, selectedCategories: [], exactName: null };

describe('mythicals URL params', () => {
  it('writes maxlvl only when set', () => {
    expect(buildMythicalShareParams(DEFAULTS).toString()).toBe('');
    expect(buildMythicalShareParams({ ...DEFAULTS, maxReqLevel: 85 }).get('maxlvl')).toBe('85');
  });

  it('round-trips search, maxlvl and categories', () => {
    const params = buildMythicalShareParams({
      searchText: 'aura',
      maxReqLevel: 85,
      selectedCategories: ['Mythical Unique Weapons'],
      exactName: 'X',
    });
    expect(params.get('name')).toBe('X');
    expect(parseMythicalUrlParams(new URLSearchParams(params.toString()))).toEqual({
      searchText: 'aura',
      maxReqLevel: 85,
      categories: ['Mythical Unique Weapons'],
    });
  });

  it('treats maxlvl as a filter param and ignores out-of-range values', () => {
    expect(hasMythicalFilterParams(new URLSearchParams('maxlvl=50'))).toBe(true);
    expect(hasMythicalFilterParams(new URLSearchParams('name=X'))).toBe(false);
    expect(parseMythicalUrlParams(new URLSearchParams('maxlvl=0')).maxReqLevel).toBeNull();
    expect(parseMythicalUrlParams(new URLSearchParams('maxlvl=abc')).maxReqLevel).toBeNull();
  });
});
