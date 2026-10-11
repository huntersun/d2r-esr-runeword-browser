import {
  BASE_TIER_SCALE,
  convertNamedMatch,
  convertNumberMatch,
  formatNamedMatch,
  formatNumberMatch,
  namedListHas,
  namedMatchMode,
  namedValueName,
  numberMatchMode,
  parseNumberList,
  QUALITY_SCALE,
  setNamedRangeBound,
  setRangeBound,
  toggleNamedValue,
} from './matchValues';

describe('number matches', () => {
  it('detects the mode', () => {
    expect(numberMatchMode(undefined)).toBe('any');
    expect(numberMatchMode(3)).toBe('exactly');
    expect(numberMatchMode([1, 2])).toBe('list');
    expect(numberMatchMode({ min: 2 })).toBe('range');
  });

  it('converts between modes keeping the numbers', () => {
    expect(convertNumberMatch(3, 'list', 1)).toEqual([3]);
    expect(convertNumberMatch(3, 'range', 1)).toEqual({ min: 3, max: 3 });
    expect(convertNumberMatch([4, 2, 4], 'range', 1)).toEqual({ min: 2, max: 4 });
    expect(convertNumberMatch([4, 2], 'exactly', 1)).toBe(4);
    expect(convertNumberMatch({ max: 5 }, 'exactly', 1)).toBe(5);
    expect(convertNumberMatch({ min: 2, max: 2 }, 'list', 1)).toEqual([2]);
    expect(convertNumberMatch(3, 'any', 1)).toBeUndefined();
  });

  it('fills an empty match with the fallback', () => {
    expect(convertNumberMatch(undefined, 'exactly', 1)).toBe(1);
    expect(convertNumberMatch(undefined, 'list', 1)).toEqual([1]);
    expect(convertNumberMatch(undefined, 'range', 1)).toEqual({ min: 1 });
    expect(convertNumberMatch({}, 'exactly', 7)).toBe(7);
  });

  it('keeps the value when the mode does not change', () => {
    const value = { max: 3 };
    expect(convertNumberMatch(value, 'range', 1)).toBe(value);
  });

  it('sets and clears range bounds, allowing min only or max only', () => {
    expect(setRangeBound({ min: 1, max: 5 }, 'max', undefined)).toEqual({ min: 1 });
    expect(setRangeBound({ min: 1 }, 'min', undefined)).toBeUndefined();
    expect(setRangeBound({}, 'max', 4)).toEqual({ max: 4 });
  });

  it('parses and formats number lists', () => {
    expect(parseNumberList('1, 2 3,')).toEqual([1, 2, 3]);
    expect(parseNumberList('')).toBeNull();
    expect(parseNumberList('1, x')).toBeNull();
    expect(parseNumberList('1.5')).toBeNull();
  });

  it('formats for summaries', () => {
    expect(formatNumberMatch(3)).toBe('3');
    expect(formatNumberMatch([1, 2])).toBe('1, 2');
    expect(formatNumberMatch({ min: 2, max: 4 })).toBe('2–4');
    expect(formatNumberMatch({ min: 3 })).toBe('≥3');
    expect(formatNumberMatch({ max: 2 })).toBe('≤2');
    expect(formatNumberMatch({ min: 2, max: 2 })).toBe('2');
    expect(formatNumberMatch({})).toBe('any');
  });
});

describe('named matches', () => {
  it('detects the mode and names numbers', () => {
    expect(namedMatchMode(undefined)).toBe('any');
    expect(namedMatchMode('unique')).toBe('one');
    expect(namedMatchMode(7)).toBe('one');
    expect(namedMatchMode(['set', 7])).toBe('several');
    expect(namedMatchMode({ min: 'magic' })).toBe('range');
    expect(namedValueName(7, QUALITY_SCALE)).toBe('unique');
    expect(namedValueName(0, QUALITY_SCALE)).toBeUndefined();
    expect(namedValueName(2, BASE_TIER_SCALE)).toBe('elite');
  });

  it('converts between modes into names', () => {
    expect(convertNamedMatch(7, 'several', QUALITY_SCALE)).toEqual(['unique']);
    expect(convertNamedMatch([7, 'set'], 'range', QUALITY_SCALE)).toEqual({ min: 'set', max: 'unique' });
    expect(convertNamedMatch({ min: 4, max: 6 }, 'one', QUALITY_SCALE)).toBe('magic');
    expect(convertNamedMatch(undefined, 'one', BASE_TIER_SCALE)).toBe('normal');
    expect(convertNamedMatch(undefined, 'several', BASE_TIER_SCALE)).toEqual(['normal']);
    expect(convertNamedMatch(99, 'several', QUALITY_SCALE)).toEqual(['inferior']);
    expect(convertNamedMatch('unique', 'any', QUALITY_SCALE)).toBeUndefined();
    expect(convertNamedMatch(undefined, 'range', BASE_TIER_SCALE)).toEqual({ min: 'normal', max: 'normal' });
    expect(convertNamedMatch(7, 'range', QUALITY_SCALE)).toEqual({ min: 'unique', max: 'unique' });
  });

  it('keeps numbers the user did not touch', () => {
    const value = [5, 7] as const;
    expect(convertNamedMatch(value, 'several', QUALITY_SCALE)).toBe(value);
    expect(setNamedRangeBound({ min: 4, max: 6 }, 'max', 'rare')).toEqual({ min: 4, max: 'rare' });
    expect(setNamedRangeBound({ min: 4, max: 6 }, 'min', undefined)).toEqual({ max: 6 });
    expect(setNamedRangeBound({ max: 6 }, 'max', undefined)).toBeUndefined();
  });

  it('toggles names in a list, normalizing it to names in scale order', () => {
    expect(toggleNamedValue([7], 'set', QUALITY_SCALE)).toEqual(['set', 'unique']);
    expect(toggleNamedValue(['set', 7], 'unique', QUALITY_SCALE)).toEqual(['set']);
    expect(namedListHas([7], 'unique', QUALITY_SCALE)).toBe(true);
    expect(namedListHas(['set'], 'unique', QUALITY_SCALE)).toBe(false);
  });

  it('formats for summaries', () => {
    expect(formatNamedMatch(7, QUALITY_SCALE)).toBe('unique');
    expect(formatNamedMatch(['set', 7], QUALITY_SCALE)).toBe('set/unique');
    expect(formatNamedMatch({ min: 'magic', max: 6 }, QUALITY_SCALE)).toBe('magic–rare');
    expect(formatNamedMatch({ min: 'rare' }, QUALITY_SCALE)).toBe('≥rare');
    expect(formatNamedMatch({ min: 7, max: 'unique' }, QUALITY_SCALE)).toBe('unique');
    expect(formatNamedMatch(42, QUALITY_SCALE)).toBe('42');
  });
});
