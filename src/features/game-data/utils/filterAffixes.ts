import { parseSearchTerms } from '@/core/utils/searchTerms';
import type { Affix } from '../engine/schema';
import type { WeightedAffix } from '../engine/affixEligibility';
import { AFFIX_LEVEL_RANGE, type AffixSortKey } from '../constants/affixes';
import type { AffixFilters } from '../store/gameDataSlice';

/** "Sturdy …", "… of the Fox", automods by name or "(automod)" when nameless. */
export function affixDisplayName(affix: Affix): string {
  if (affix.kind === 'p') return `${affix.name} …`;
  if (affix.kind === 's') return `… ${affix.name}`;
  return affix.name === '' ? '(automod)' : affix.name;
}

/** "lvl 10–40", or "lvl 10+" when there is no max level. */
export function formatAffixLevel(affix: Pick<Affix, 'lvl' | 'maxLvl'>): string {
  return affix.maxLvl === 0 ? `lvl ${String(affix.lvl)}+` : `lvl ${String(affix.lvl)}–${String(affix.maxLvl)}`;
}

/** Lowercased text searched by the free-text filter: name and rendered stat lines. */
export function affixSearchText(affix: Affix): string {
  return [affix.name, ...affix.text].join('\n').toLowerCase();
}

/** Kind, rare-only, class and search filters: shared by browse and what-can-roll mode. */
function matchesCommon(affix: Affix, filters: AffixFilters, terms: readonly string[]): boolean {
  const { kinds, rareOnly, cls } = filters;
  if (kinds.length > 0 && !kinds.includes(affix.kind)) return false;
  if (rareOnly && !affix.rare) return false;
  if (cls === 'none' && affix.cls !== null) return false;
  if (cls !== 'any' && cls !== 'none' && affix.cls !== cls) return false;
  if (terms.length > 0) {
    const text = affixSearchText(affix);
    if (!terms.every((term) => text.includes(term))) return false;
  }
  return true;
}

/** The affix's level span [lvl, maxLvl] (maxLvl 0 = up to 99) overlaps [minLvl, maxLvl] of the filter. */
function overlapsLevelRange(affix: Affix, minLvl: number | null, maxLvl: number | null): boolean {
  const top = affix.maxLvl === 0 ? AFFIX_LEVEL_RANGE.max : affix.maxLvl;
  return affix.lvl <= (maxLvl ?? AFFIX_LEVEL_RANGE.max) && top >= (minLvl ?? AFFIX_LEVEL_RANGE.min);
}

/** Any selected type is in `itypes` and none is in `etypes` (codes only, no ancestor walk). */
function matchesTypes(affix: Affix, types: readonly string[]): boolean {
  if (types.length === 0) return true;
  return types.some((code) => affix.itypes.includes(code)) && !types.some((code) => affix.etypes.includes(code));
}

function sortValue(affix: Affix, sort: Exclude<AffixSortKey, 'name'>): number {
  switch (sort) {
    case 'lvl':
      return affix.lvl;
    case 'group':
      return affix.group;
    case 'freq':
      return affix.freq;
  }
}

function compareAffixes(a: Affix, b: Affix, sort: AffixSortKey, dir: 1 | -1): number {
  const byName = a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind) || a.id - b.id;
  if (sort === 'name') return dir * byName;
  const diff = sortValue(a, sort) - sortValue(b, sort);
  return diff === 0 ? byName : dir * diff;
}

/**
 * Browse mode: filters and sorts affixes. All filters combine with AND; empty lists / null mean "no filter".
 * - search: every term (see parseSearchTerms) appears in the name or a rendered stat line
 * - kinds, rareOnly, cls ('none' = no `classspecific`, a class code = only that class)
 * - minLvl/maxLvl: the affix level span overlaps the range; types: see `matchesTypes`
 */
export function filterAffixes(affixes: readonly Affix[], filters: AffixFilters): Affix[] {
  const terms = parseSearchTerms(filters.search);
  const result = affixes.filter(
    (affix) =>
      matchesCommon(affix, filters, terms) &&
      overlapsLevelRange(affix, filters.minLvl, filters.maxLvl) &&
      matchesTypes(affix, filters.types)
  );
  const dir = filters.sortDir === 'desc' ? -1 : 1;
  return result.sort((a, b) => compareAffixes(a, b, filters.sort, dir));
}

/**
 * What-can-roll mode: applies search/kind/rare/class on top of the eligible affixes (weights stay relative to every
 * eligible affix of the kind) and sorts by group, then affix level, then name.
 */
export function filterRollable(rollable: readonly WeightedAffix[], filters: AffixFilters): WeightedAffix[] {
  const terms = parseSearchTerms(filters.search);
  return rollable
    .filter(({ affix }) => matchesCommon(affix, filters, terms))
    .sort((a, b) => a.affix.group - b.affix.group || a.affix.lvl - b.affix.lvl || a.affix.name.localeCompare(b.affix.name));
}

export interface AffixGroup {
  readonly group: number;
  readonly affixes: readonly WeightedAffix[];
  /** Summed weight of the listed affixes */
  readonly weight: number;
}

/** Consecutive runs of the same `group` (input sorted by group). */
export function groupRollable(rollable: readonly WeightedAffix[]): AffixGroup[] {
  const groups: { group: number; affixes: WeightedAffix[]; weight: number }[] = [];
  for (const entry of rollable) {
    const last = groups.at(-1);
    if (last?.group === entry.affix.group) {
      last.affixes.push(entry);
      last.weight += entry.weight;
    } else {
      groups.push({ group: entry.affix.group, affixes: [entry], weight: entry.weight });
    }
  }
  return groups;
}

/** Item types an affix can appear on (itypes) and is excluded from (etypes), as display names. */
export function affixTypeNames(affix: Affix, typeNames: ReadonlyMap<string, string>): { on: string[]; except: string[] } {
  const name = (code: string) => typeNames.get(code) ?? code;
  return { on: affix.itypes.map(name), except: affix.etypes.map(name) };
}

/** Codes used in any affix's itypes, for the type picker. */
export function affixTypeCodes(affixes: readonly Affix[]): string[] {
  return [...new Set(affixes.flatMap((affix) => affix.itypes))];
}

/** "12.5%" with one decimal, "<0.1%" for tiny weights. */
export function formatWeight(weight: number): string {
  if (weight > 0 && weight < 0.001) return '<0.1%';
  return `${(weight * 100).toFixed(1)}%`;
}
