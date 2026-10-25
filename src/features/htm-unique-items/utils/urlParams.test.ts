import { describe, expect, it } from 'vitest';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';
import {
  buildHtmShareParams,
  hasHtmFilterParams,
  parseAcquisitionParam,
  parseHtmUrlParams,
  parseTierParam,
  type HtmShareFilters,
} from './urlParams';

const DEFAULTS: HtmShareFilters = {
  searchText: '',
  maxReqLevel: null,
  selectedCategories: [],
  acquisition: 'all',
  exactName: null,
  tiers: [],
};

describe('buildHtmShareParams', () => {
  it('writes nothing for the default state', () => {
    expect(buildHtmShareParams(DEFAULTS).toString()).toBe('');
  });

  it('writes the new acq param and never the legacy coupon param', () => {
    const params = buildHtmShareParams({ ...DEFAULTS, acquisition: 'nocoupon' });
    expect(params.get('acq')).toBe('nocoupon');
    expect(params.has('coupon')).toBe(false);
  });

  it('omits cats for all / none selected', () => {
    expect(buildHtmShareParams({ ...DEFAULTS, selectedCategories: [NO_CATEGORIES_MARKER] }).has('cats')).toBe(false);
  });
});

describe('tier param', () => {
  it('writes the selected tiers comma-separated and omits the param for all tiers', () => {
    expect(buildHtmShareParams({ ...DEFAULTS, tiers: ['normal', 'elite'] }).get('tier')).toBe('normal,elite');
    expect(buildHtmShareParams(DEFAULTS).has('tier')).toBe(false);
  });

  it('decodes known tiers in tier order, dropping unknown values and duplicates', () => {
    expect(parseTierParam('elite,bogus,normal,elite')).toEqual(['normal', 'elite']);
    expect(parseTierParam('bogus')).toBeNull();
    expect(parseTierParam('')).toBeNull();
    expect(parseTierParam(null)).toBeNull();
  });

  it('counts as a filter param', () => {
    expect(hasHtmFilterParams(new URLSearchParams('tier=mythical'))).toBe(true);
  });
});

describe('parseAcquisitionParam', () => {
  it('maps the legacy coupon=0 to "No coupon"', () => {
    expect(parseAcquisitionParam(new URLSearchParams('coupon=0'))).toBe('nocoupon');
  });

  it('ignores other legacy coupon values', () => {
    expect(parseAcquisitionParam(new URLSearchParams('coupon=1'))).toBeNull();
  });

  it('prefers acq over the legacy coupon param', () => {
    expect(parseAcquisitionParam(new URLSearchParams('acq=gamble&coupon=0'))).toBe('gamble');
  });

  it('ignores unknown acq values (falls back to coupon, then null)', () => {
    expect(parseAcquisitionParam(new URLSearchParams('acq=bogus'))).toBeNull();
    expect(parseAcquisitionParam(new URLSearchParams('acq=bogus&coupon=0'))).toBe('nocoupon');
  });
});

describe('hasHtmFilterParams', () => {
  it('treats the legacy coupon and the new acq params as filter params, name alone as not', () => {
    expect(hasHtmFilterParams(new URLSearchParams('coupon=0'))).toBe(true);
    expect(hasHtmFilterParams(new URLSearchParams('acq=drop'))).toBe(true);
    expect(hasHtmFilterParams(new URLSearchParams('name=Foo'))).toBe(false);
  });
});

describe('uniques URL round-trip', () => {
  it.each(['coupon', 'gamble', 'drop', 'nocoupon'] as const)('round-trips acquisition=%s with the other filters', (acquisition) => {
    const filters: HtmShareFilters = {
      searchText: 'life "fire"',
      maxReqLevel: 42,
      selectedCategories: ['Ring', 'Bow'],
      acquisition,
      exactName: null,
      tiers: ['exceptional', 'mythical'],
    };
    const parsed = parseHtmUrlParams(new URLSearchParams(buildHtmShareParams(filters).toString()));
    expect(parsed).toEqual({
      searchText: 'life "fire"',
      maxReqLevel: 42,
      categories: ['Ring', 'Bow'],
      acquisition,
      tiers: ['exceptional', 'mythical'],
    });
  });

  it('decodes an empty URL to "keep everything"', () => {
    expect(parseHtmUrlParams(new URLSearchParams())).toEqual({
      searchText: null,
      maxReqLevel: null,
      categories: null,
      acquisition: null,
      tiers: null,
    });
  });

  it('rewrites a legacy coupon=0 link into the new form', () => {
    const parsed = parseHtmUrlParams(new URLSearchParams('coupon=0&maxlvl=30'));
    const rebuilt = buildHtmShareParams({ ...DEFAULTS, maxReqLevel: parsed.maxReqLevel, acquisition: parsed.acquisition ?? 'all' });
    expect(rebuilt.toString()).toBe('maxlvl=30&acq=nocoupon');
  });
});
