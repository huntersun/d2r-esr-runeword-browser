import type { ParsedData } from '../interfaces';

/** Parsed datasets that are written to their own Dexie table of the same name. */
export const SANITY_CHECKED_DATASETS = [
  'gems',
  'esrRunes',
  'lodRunes',
  'kanjiRunes',
  'crystals',
  'runewords',
  'gemwords',
  'htmUniqueItems',
  'mythicalUniques',
  'ascendancies',
] as const satisfies readonly (keyof ParsedData)[];

export type SanityCheckedDataset = (typeof SANITY_CHECKED_DATASETS)[number];

/** User-facing names, used in the warning shown when a dataset could not be read. */
const DATASET_LABELS: Readonly<Record<SanityCheckedDataset, string>> = {
  gems: 'Gems',
  esrRunes: 'ESR Runes',
  lodRunes: 'LoD Runes',
  kanjiRunes: 'Kanji Runes',
  crystals: 'Crystals',
  runewords: 'Runewords',
  gemwords: 'Gemwords',
  htmUniqueItems: 'Unique Items',
  mythicalUniques: 'Mythical Uniques',
  ascendancies: 'Ascendancies',
};

/**
 * A freshly parsed dataset smaller than this fraction of the cached one is
 * treated as a parser failure (upstream HTML format drift), not a real change.
 */
const MIN_PARSED_TO_CACHED_RATIO = 0.5;

export type DatasetCounts = Readonly<Record<SanityCheckedDataset, number>>;

export interface BadDataset {
  readonly dataset: SanityCheckedDataset;
  readonly parsed: number;
  readonly cached: number;
}

/**
 * Parsers return [] (or a fraction of the rows) when the upstream HTML format
 * changes, so a dataset is "bad" when it parsed to nothing, or when it shrank
 * below MIN_PARSED_TO_CACHED_RATIO of what is already cached.
 */
export function isDatasetBad(parsed: number, cached: number): boolean {
  if (parsed === 0) return true;
  return cached > 0 && parsed < cached * MIN_PARSED_TO_CACHED_RATIO;
}

/** Returns the datasets that fail the sanity check, in SANITY_CHECKED_DATASETS order. */
export function findBadDatasets(parsed: DatasetCounts, cached: DatasetCounts): BadDataset[] {
  return SANITY_CHECKED_DATASETS.filter((dataset) => isDatasetBad(parsed[dataset], cached[dataset])).map((dataset) => ({
    dataset,
    parsed: parsed[dataset],
    cached: cached[dataset],
  }));
}

/** Warning shown (Settings drawer + toast) when some datasets could not be read. */
export function formatBadDatasetsWarning(bad: readonly BadDataset[], usingCache: boolean): string {
  const labels = bad.map(({ dataset }) => DATASET_LABELS[dataset]).join(', ');
  return usingCache
    ? `Could not read the latest ${labels} data. Showing the previously cached version.`
    : `Could not read the latest ${labels} data. Other data was loaded; this will be retried on the next start.`;
}
