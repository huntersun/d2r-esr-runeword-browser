import { describe, expect, it } from 'vitest';
import { addVisited, isVisitedList, VISITED_CAP } from './visited';

describe('isVisitedList', () => {
  it('accepts string arrays only', () => {
    expect(isVisitedList([])).toBe(true);
    expect(isVisitedList(['a', 'b'])).toBe(true);
    expect(isVisitedList(['a', 1])).toBe(false);
    expect(isVisitedList('a')).toBe(false);
    expect(isVisitedList(null)).toBe(false);
    expect(isVisitedList({ 0: 'a' })).toBe(false);
  });
});

describe('addVisited', () => {
  it('appends a new slug', () => {
    expect(addVisited(['a'], 'b')).toEqual(['a', 'b']);
    expect(addVisited([], 'a')).toEqual(['a']);
  });

  it('moves a known slug to the end instead of duplicating it', () => {
    expect(addVisited(['a', 'b', 'c'], 'a')).toEqual(['b', 'c', 'a']);
  });

  it('returns the same array when the slug is already the latest visit', () => {
    const list = ['a', 'b'];
    expect(addVisited(list, 'b')).toBe(list);
  });

  it('drops the oldest visits beyond the cap', () => {
    expect(addVisited(['a', 'b', 'c'], 'd', 3)).toEqual(['b', 'c', 'd']);
    expect(addVisited(['a', 'b', 'c', 'd'], 'd', 3)).toEqual(['b', 'c', 'd']);
    const full = Array.from({ length: VISITED_CAP }, (_, i) => `n${String(i)}`);
    const next = addVisited(full, 'new');
    expect(next).toHaveLength(VISITED_CAP);
    expect(next.at(0)).toBe('n1');
    expect(next.at(-1)).toBe('new');
  });
});
