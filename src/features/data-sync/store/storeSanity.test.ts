import { describe, expect, it } from 'vitest';
import { findBadDatasets, formatBadDatasetsWarning, isDatasetBad, SANITY_CHECKED_DATASETS, type DatasetCounts } from './storeSanity';

function counts(value: number, overrides: Partial<DatasetCounts> = {}): DatasetCounts {
  return { ...(Object.fromEntries(SANITY_CHECKED_DATASETS.map((dataset) => [dataset, value])) as DatasetCounts), ...overrides };
}

describe('isDatasetBad', () => {
  it('rejects an empty parse, with or without a cache', () => {
    expect(isDatasetBad(0, 0)).toBe(true);
    expect(isDatasetBad(0, 100)).toBe(true);
  });

  it('accepts any non-empty parse when nothing is cached', () => {
    expect(isDatasetBad(1, 0)).toBe(false);
  });

  it('rejects a parse below 50% of the cached count', () => {
    expect(isDatasetBad(40, 100)).toBe(true);
    expect(isDatasetBad(49, 100)).toBe(true);
  });

  it('accepts a parse at or above 50% of the cached count', () => {
    expect(isDatasetBad(50, 100)).toBe(false);
    expect(isDatasetBad(60, 100)).toBe(false);
    expect(isDatasetBad(150, 100)).toBe(false);
  });
});

describe('findBadDatasets', () => {
  it('returns nothing when all datasets are plausible', () => {
    expect(findBadDatasets(counts(10), counts(10))).toEqual([]);
  });

  it('returns the failing datasets with parsed and cached counts', () => {
    expect(findBadDatasets(counts(10, { runewords: 4, htmUniqueItems: 0 }), counts(10))).toEqual([
      { dataset: 'runewords', parsed: 4, cached: 10 },
      { dataset: 'htmUniqueItems', parsed: 0, cached: 10 },
    ]);
  });
});

describe('formatBadDatasetsWarning', () => {
  const bad = findBadDatasets(counts(10, { runewords: 0, htmUniqueItems: 0 }), counts(10));

  it('names the datasets with user-facing labels when falling back to the cache', () => {
    expect(formatBadDatasetsWarning(bad, true)).toBe(
      'Could not read the latest Runewords, Unique Items data. Showing the previously cached version.'
    );
  });

  it('explains the retry when there is no cache', () => {
    expect(formatBadDatasetsWarning(bad, false)).toBe(
      'Could not read the latest Runewords, Unique Items data. Other data was loaded; this will be retried on the next start.'
    );
  });
});
