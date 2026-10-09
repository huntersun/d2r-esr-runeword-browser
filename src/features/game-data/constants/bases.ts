import type { BaseItem } from '../engine/schema';

export type BaseKind = BaseItem['kind'];
export type BaseTier = BaseItem['tier'];

export const BASE_KINDS: readonly BaseKind[] = ['weapon', 'armor', 'misc'];
export const BASE_TIERS: readonly BaseTier[] = ['normal', 'exceptional', 'elite', 'mythical'];

export const BASE_KIND_LABELS: Record<BaseKind, string> = { weapon: 'Weapons', armor: 'Armor', misc: 'Accessories' };
export const BASE_TIER_LABELS: Record<BaseTier, string> = {
  normal: 'Normal',
  exceptional: 'Exceptional',
  elite: 'Elite',
  mythical: 'Mythical',
};

/** Tier badge colours (Badge variant="outline"). */
export const TIER_BADGE_CLASS: Record<BaseTier, string> = {
  normal: 'text-muted-foreground',
  exceptional: 'border-sky-600/50 text-sky-700 dark:text-sky-400',
  elite: 'border-amber-600/50 text-amber-700 dark:text-amber-400',
  mythical: 'border-purple-600/50 text-purple-700 dark:text-purple-400',
};

export const BASE_SORT_KEYS = ['name', 'qlvl', 'reqLvl', 'dmg', 'def', 'speed'] as const;
export type BaseSortKey = (typeof BASE_SORT_KEYS)[number];
export type SortDir = 'asc' | 'desc';

export function isBaseSortKey(value: string): value is BaseSortKey {
  return (BASE_SORT_KEYS as readonly string[]).includes(value);
}

export const BASE_SORT_LABELS: Record<BaseSortKey, string> = {
  name: 'Name',
  qlvl: 'Quality level',
  reqLvl: 'Required level',
  dmg: 'Average damage',
  def: 'Max defense',
  speed: 'Speed',
};

/** Number of bases rendered initially and added per "Show more" click. */
export const BASES_PAGE_SIZE = 100;
