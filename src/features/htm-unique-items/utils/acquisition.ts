import type { HtmUniqueItem } from '@/core/db';

/**
 * How a unique can be acquired, as far as the HTM pages tell us:
 * - `coupon`: "Ancient Coupon Unique" (cubed from an Ancient Coupon, never drops)
 * - `gamble`: has a real "Gamble Item:" base (can be gambled; it also drops). Every non-coupon unique on the
 *   HTM pages has that line, but some say "N/A" (24 items as of ESR 3.2.24); those are not gambleable.
 * - `drop`: neither (drop only, i.e. the "Gamble Item: N/A" uniques)
 *
 * The filter adds `all` (no filter) and `nocoupon` (coupon items hidden; the old
 * "Include Coupon Items" toggle switched off, still reachable via the legacy `coupon=0` link).
 */
export type AcquisitionFilter = 'all' | 'coupon' | 'gamble' | 'drop' | 'nocoupon';

type AcquisitionFields = Pick<HtmUniqueItem, 'isAncientCoupon' | 'gambleItem'>;

export interface AcquisitionOption {
  readonly value: AcquisitionFilter;
  readonly label: string;
  readonly description: string;
}

/** Chip order in the filter bar */
export const ACQUISITION_OPTIONS: readonly AcquisitionOption[] = [
  { value: 'all', label: 'All', description: 'every unique' },
  { value: 'coupon', label: 'Coupon only', description: 'Ancient Coupon uniques (cubed, they never drop)' },
  { value: 'gamble', label: 'Gambleable', description: 'uniques with a gamble item (they also drop)' },
  { value: 'drop', label: 'Drop only', description: 'neither coupon nor gambleable ("Gamble Item: N/A")' },
  { value: 'nocoupon', label: 'No coupon', description: 'hides Ancient Coupon uniques (gambleable + drop only)' },
];

const ACQUISITION_VALUES: ReadonlySet<string> = new Set(ACQUISITION_OPTIONS.map((option) => option.value));

/** "N/A" (or an empty/missing line) means the unique cannot be gambled */
const NOT_GAMBLEABLE = /^(n\/?a|none|-)?$/i;

export function isGambleable(item: AcquisitionFields): boolean {
  return !NOT_GAMBLEABLE.test(item.gambleItem.trim());
}

/**
 * Coupon and gambleable are checked independently so an item that were both would show
 * under both chips (none is in the current data); "Drop only" is the complement of the two,
 * so every item is reachable from at least one chip.
 */
export function matchesAcquisition(item: AcquisitionFields, filter: AcquisitionFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'coupon':
      return item.isAncientCoupon;
    case 'gamble':
      return isGambleable(item);
    case 'drop':
      return !item.isAncientCoupon && !isGambleable(item);
    case 'nocoupon':
      return !item.isAncientCoupon;
  }
}

export function isAcquisitionFilter(value: string): value is AcquisitionFilter {
  return ACQUISITION_VALUES.has(value);
}
