import { describe, expect, it } from 'vitest';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';
import {
  FILTER_URL_PARAM_KEYS,
  MAX_REQ_LEVEL_RANGE,
  SOCKET_COUNT_RANGE,
  appendCategoryListParam,
  appendCommonFilterParams,
  appendSelectionParam,
  buildShareUrl,
  decodeCategoryListParam,
  decodeSelectionParam,
  parseBoundedIntParam,
} from './filterUrlParams';

describe('appendSelectionParam', () => {
  it('omits the param when everything is selected (absent param = all selected)', () => {
    const params = new URLSearchParams();
    appendSelectionParam(params, FILTER_URL_PARAM_KEYS.GEMS, { 'Perfect Ruby': true, 'Perfect Topaz': true });

    expect(params.get(FILTER_URL_PARAM_KEYS.GEMS)).toBeNull();
  });

  it('lists only the selected keys when a subset is selected', () => {
    const params = new URLSearchParams();
    appendSelectionParam(params, FILTER_URL_PARAM_KEYS.ITEMS, { Helm: true, Belt: false, Boots: true });

    expect(params.get(FILTER_URL_PARAM_KEYS.ITEMS)).toBe('Helm,Boots');
  });

  it('omits the param when the selection is empty or nothing is selected', () => {
    const params = new URLSearchParams();
    appendSelectionParam(params, FILTER_URL_PARAM_KEYS.ITEMS, {});
    appendSelectionParam(params, FILTER_URL_PARAM_KEYS.GEMS, { Helm: false });

    expect(params.toString()).toBe('');
  });
});

describe('appendCommonFilterParams', () => {
  it('serializes the populated filters and skips defaults', () => {
    const params = new URLSearchParams();
    appendCommonFilterParams(params, {
      searchText: 'fire resist',
      socketCount: 3,
      maxReqLevel: null,
      selectedItemTypes: { Helm: true, Belt: false },
    });

    expect(params.get(FILTER_URL_PARAM_KEYS.SEARCH)).toBe('fire resist');
    expect(params.get(FILTER_URL_PARAM_KEYS.SOCKETS)).toBe('3');
    expect(params.get(FILTER_URL_PARAM_KEYS.MAXLVL)).toBeNull();
    expect(params.get(FILTER_URL_PARAM_KEYS.ITEMS)).toBe('Helm');
  });
});

describe('decodeSelectionParam', () => {
  const allKeys = ['Helm', 'Belt', 'Boots'];

  it('selects only the listed keys when the param is present', () => {
    expect(decodeSelectionParam(allKeys, 'Helm,Boots')).toEqual({ Helm: true, Belt: false, Boots: true });
  });

  it('selects everything when the param is absent', () => {
    expect(decodeSelectionParam(allKeys, null)).toEqual({ Helm: true, Belt: true, Boots: true });
  });

  it('falls back to the stored selection when the param is absent', () => {
    expect(decodeSelectionParam(allKeys, null, { Belt: false })).toEqual({ Helm: true, Belt: false, Boots: true });
  });

  it('ignores the stored selection when the param is present', () => {
    expect(decodeSelectionParam(allKeys, 'Belt', { Belt: false })).toEqual({ Helm: false, Belt: true, Boots: false });
  });

  it('round-trips with appendSelectionParam', () => {
    const selection = { Helm: true, Belt: false, Boots: true };
    const params = new URLSearchParams();
    appendSelectionParam(params, FILTER_URL_PARAM_KEYS.ITEMS, selection);

    expect(decodeSelectionParam(allKeys, params.get(FILTER_URL_PARAM_KEYS.ITEMS))).toEqual(selection);
  });
});

describe('parseBoundedIntParam', () => {
  it('parses values inside the range', () => {
    expect(parseBoundedIntParam('3', SOCKET_COUNT_RANGE)).toBe(3);
    expect(parseBoundedIntParam('999', MAX_REQ_LEVEL_RANGE)).toBe(999);
  });

  it('rejects missing, malformed, and out-of-range values', () => {
    expect(parseBoundedIntParam(null, SOCKET_COUNT_RANGE)).toBeNull();
    expect(parseBoundedIntParam('abc', SOCKET_COUNT_RANGE)).toBeNull();
    expect(parseBoundedIntParam('0', SOCKET_COUNT_RANGE)).toBeNull();
    expect(parseBoundedIntParam('7', SOCKET_COUNT_RANGE)).toBeNull();
  });
});

describe('appendCategoryListParam / decodeCategoryListParam', () => {
  it('lists a partial selection and round-trips it', () => {
    const params = new URLSearchParams();
    appendCategoryListParam(params, 'cats', ['Ring', 'Amulet']);

    expect(params.get('cats')).toBe('Ring,Amulet');
    expect(decodeCategoryListParam(params.get('cats'))).toEqual(['Ring', 'Amulet']);
  });

  it('omits the param for the all and none selections', () => {
    const params = new URLSearchParams();
    appendCategoryListParam(params, 'cats', []);
    appendCategoryListParam(params, 'other', [NO_CATEGORIES_MARKER]);

    expect(params.toString()).toBe('');
  });

  it('decodes absent or empty params to null', () => {
    expect(decodeCategoryListParam(null)).toBeNull();
    expect(decodeCategoryListParam('')).toBeNull();
    expect(decodeCategoryListParam(',,')).toBeNull();
    expect(decodeCategoryListParam('Ring,,Amulet')).toEqual(['Ring', 'Amulet']);
  });
});

describe('buildShareUrl', () => {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;

  it('appends the route path and query to the app base URL', () => {
    expect(buildShareUrl('uniques', new URLSearchParams({ search: 'ring', cats: 'Ring,Amulet' }))).toBe(
      `${base}uniques?search=ring&cats=Ring%2CAmulet`
    );
  });

  it('omits the query string when there are no params, and the route for the index', () => {
    expect(buildShareUrl('mythicals', new URLSearchParams())).toBe(`${base}mythicals`);
    expect(buildShareUrl('', new URLSearchParams())).toBe(base);
  });
});
