import { describe, expect, it } from 'vitest';
import { formatSocketRange, parseSocketRange, socketRangeOverlaps } from './socketRange';

describe('parseSocketRange', () => {
  it('parses an exact count', () => {
    expect(parseSocketRange('4')).toEqual({ min: 4, max: 4 });
    expect(parseSocketRange(' 4 ')).toEqual({ min: 4, max: 4 });
  });

  it('parses a range and the open-ended shorthands', () => {
    expect(parseSocketRange('2-4')).toEqual({ min: 2, max: 4 });
    expect(parseSocketRange('-4')).toEqual({ min: 1, max: 4 });
    expect(parseSocketRange('4-')).toEqual({ min: 4, max: 6 });
    expect(parseSocketRange('4-4')).toEqual({ min: 4, max: 4 });
  });

  it('rejects empty, malformed, reversed and out-of-range input', () => {
    expect(parseSocketRange('')).toBeNull();
    expect(parseSocketRange('-')).toBeNull();
    expect(parseSocketRange('abc')).toBeNull();
    expect(parseSocketRange('2-4-6')).toBeNull();
    expect(parseSocketRange('4-2')).toBeNull();
    expect(parseSocketRange('0')).toBeNull();
    expect(parseSocketRange('7')).toBeNull();
    expect(parseSocketRange('3-7')).toBeNull();
    expect(parseSocketRange('0-3')).toBeNull();
  });
});

describe('formatSocketRange', () => {
  it('formats exact counts, ranges and the empty filter', () => {
    expect(formatSocketRange(null)).toBe('');
    expect(formatSocketRange({ min: 4, max: 4 })).toBe('4');
    expect(formatSocketRange({ min: 2, max: 4 })).toBe('2-4');
    expect(formatSocketRange({ min: 1, max: 4 })).toBe('1-4');
  });

  it('round-trips with parseSocketRange', () => {
    for (const text of ['3', '2-5', '1-4', '4-6']) {
      const parsed = parseSocketRange(text);
      expect(parsed).not.toBeNull();
      expect(formatSocketRange(parsed)).toBe(text);
    }
  });
});

describe('socketRangeOverlaps', () => {
  it('matches everything without a filter', () => {
    expect(socketRangeOverlaps(null, 3)).toBe(true);
  });

  it('matches an exact socket count inside the range', () => {
    expect(socketRangeOverlaps({ min: 2, max: 4 }, 2)).toBe(true);
    expect(socketRangeOverlaps({ min: 2, max: 4 }, 4)).toBe(true);
    expect(socketRangeOverlaps({ min: 2, max: 4 }, 5)).toBe(false);
    expect(socketRangeOverlaps({ min: 2, max: 4 }, 1)).toBe(false);
  });

  it('matches a recipe socket span that overlaps the range', () => {
    expect(socketRangeOverlaps({ min: 1, max: 4 }, 3, 6)).toBe(true);
    expect(socketRangeOverlaps({ min: 5, max: 6 }, 3, 6)).toBe(true);
    expect(socketRangeOverlaps({ min: 1, max: 2 }, 3, 6)).toBe(false);
  });
});
