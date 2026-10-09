import { parseSearchTerms } from '@/core/utils/searchTerms';
import type { BaseItem } from '../engine/schema';
import type { BaseSortKey } from '../constants/bases';
import type { BaseFilters } from '../store/gameDataSlice';

type Range = readonly [number, number];

function average(range: Range | null): number | null {
  return range === null ? null : (range[0] + range[1]) / 2;
}

/** Average damage used for sorting: 2H when present, else 1H, else throw. */
export function averageDamage(base: BaseItem): number | null {
  return average(base.dmg2) ?? average(base.dmg1) ?? average(base.throwDmg);
}

/** Highest socket count the base can ever roll. */
export function maxSockets(base: BaseItem): number {
  return Math.max(...base.socketCaps);
}

/** Lowercased text searched by the free-text filter: name, type name(s) and code. */
export function baseSearchText(base: BaseItem, typeNames: ReadonlyMap<string, string>): string {
  const parts = [base.name, base.code, typeNames.get(base.type) ?? base.type];
  if (base.type2 !== null) parts.push(typeNames.get(base.type2) ?? base.type2);
  return parts.join(' ').toLowerCase();
}

function sortValue(base: BaseItem, sort: Exclude<BaseSortKey, 'name'>): number | null {
  switch (sort) {
    case 'qlvl':
      return base.qlvl;
    case 'reqLvl':
      return base.reqLvl;
    case 'dmg':
      return averageDamage(base);
    case 'def':
      return base.def === null ? null : base.def[1];
    case 'speed':
      return base.speed;
  }
}

function compareBases(a: BaseItem, b: BaseItem, sort: BaseSortKey, dir: 1 | -1): number {
  const byName = a.name.localeCompare(b.name);
  if (sort === 'name') return dir * byName;
  const va = sortValue(a, sort);
  const vb = sortValue(b, sort);
  // Bases without the metric (e.g. damage on armor) always go last
  if (va === null && vb === null) return byName;
  if (va === null) return 1;
  if (vb === null) return -1;
  return va === vb ? byName : dir * (va - vb);
}

/**
 * Filters and sorts bases. All filters combine with AND; empty lists mean "no filter".
 * - search: every term (see parseSearchTerms) must appear in name, type name(s) or code
 * - types: any selected code is among `base.ancestors` (so a parent type such as `mele` matches all its subtypes)
 * - minSockets: `max(socketCaps) ≥ n`; maxReqLvl: `reqLvl ≤ n`
 * - classOnly: 'none' = only unrestricted bases, a class code = only that class's bases
 */
export function filterBases(bases: readonly BaseItem[], filters: BaseFilters, typeNames: ReadonlyMap<string, string>): BaseItem[] {
  const terms = parseSearchTerms(filters.search);
  const { kinds, tiers, types, minSockets, maxReqLvl, classOnly } = filters;

  const result = bases.filter((base) => {
    if (kinds.length > 0 && !kinds.includes(base.kind)) return false;
    if (tiers.length > 0 && !tiers.includes(base.tier)) return false;
    if (types.length > 0 && !types.some((code) => base.ancestors.includes(code))) return false;
    if (minSockets !== null && maxSockets(base) < minSockets) return false;
    if (maxReqLvl !== null && base.reqLvl > maxReqLvl) return false;
    if (classOnly === 'none' && base.cls !== null) return false;
    if (classOnly !== 'any' && classOnly !== 'none' && base.cls !== classOnly) return false;
    if (terms.length > 0) {
      const text = baseSearchText(base, typeNames);
      if (!terms.every((term) => text.includes(term))) return false;
    }
    return true;
  });

  const dir = filters.sortDir === 'desc' ? -1 : 1;
  return result.sort((a, b) => compareBases(a, b, filters.sort, dir));
}
