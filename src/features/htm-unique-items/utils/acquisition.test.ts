import { describe, expect, it } from 'vitest';
import { ACQUISITION_OPTIONS, isAcquisitionFilter, isGambleable, matchesAcquisition, type AcquisitionFilter } from './acquisition';

const coupon = { isAncientCoupon: true, gambleItem: '' };
const gamble = { isAncientCoupon: false, gambleItem: 'Hand Axe' };
const drop = { isAncientCoupon: false, gambleItem: '' };
const both = { isAncientCoupon: true, gambleItem: 'Ring' };
const ITEMS = [coupon, gamble, drop, both];

const visible = (filter: AcquisitionFilter) => ITEMS.filter((item) => matchesAcquisition(item, filter));

describe('matchesAcquisition', () => {
  it('All shows everything', () => {
    expect(visible('all')).toEqual(ITEMS);
  });

  it('Coupon only shows Ancient Coupon uniques', () => {
    expect(visible('coupon')).toEqual([coupon, both]);
  });

  it('Gambleable shows items with a gamble item', () => {
    expect(visible('gamble')).toEqual([gamble, both]);
  });

  it('Drop only shows items that are neither coupon nor gambleable', () => {
    expect(visible('drop')).toEqual([drop]);
  });

  it('No coupon matches the old "Include Coupon Items" toggle switched off', () => {
    expect(visible('nocoupon')).toEqual([gamble, drop]);
  });

  it('every item is reachable from at least one of Coupon only / Gambleable / Drop only', () => {
    for (const item of ITEMS) {
      expect((['coupon', 'gamble', 'drop'] as const).some((filter) => matchesAcquisition(item, filter))).toBe(true);
    }
  });

  it('treats "Gamble Item: N/A" as not gambleable (drop only)', () => {
    const na = { isAncientCoupon: false, gambleItem: 'N/A' };
    expect(isGambleable(na)).toBe(false);
    expect(matchesAcquisition(na, 'gamble')).toBe(false);
    expect(matchesAcquisition(na, 'drop')).toBe(true);
    expect(isGambleable({ isAncientCoupon: false, gambleItem: 'n/a ' })).toBe(false);
    expect(isGambleable({ isAncientCoupon: false, gambleItem: 'Nagelring' })).toBe(true);
  });

  it('treats a whitespace-only gamble item as not gambleable', () => {
    expect(isGambleable({ isAncientCoupon: false, gambleItem: '  ' })).toBe(false);
    expect(matchesAcquisition({ isAncientCoupon: false, gambleItem: '  ' }, 'drop')).toBe(true);
  });
});

describe('isAcquisitionFilter', () => {
  it('accepts every chip value and rejects others', () => {
    for (const option of ACQUISITION_OPTIONS) expect(isAcquisitionFilter(option.value)).toBe(true);
    expect(isAcquisitionFilter('gambleable')).toBe(false);
    expect(isAcquisitionFilter('')).toBe(false);
  });
});
