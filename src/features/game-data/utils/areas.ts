/**
 * Areas page (areas.json): URL state, the Act / map tier sections and the filters.
 * See docs/features/GAME-DATA.md "Areas page".
 */
import { FILTER_URL_PARAM_KEYS, parseBoundedIntParam } from '@/core/utils/filterUrlParams';
import { parseSearchTerms } from '@/core/utils/searchTerms';
import { GAME_DATA_URL_PARAM_KEYS } from '../constants/urlParams';
import type { Area } from '../engine/schema';

export interface AreasState {
  readonly search: string;
  readonly minLvl: number | null;
  readonly maxLvl: number | null;
}

/** Monster level filter bounds (the highest map level is 108, Uber Tristram's Hell level 110) */
export const AREA_LEVEL_RANGE = { min: 1, max: 150 } as const;

const KEYS = {
  SEARCH: FILTER_URL_PARAM_KEYS.SEARCH,
  MINLVL: GAME_DATA_URL_PARAM_KEYS.MINLVL,
  MAXLVL: FILTER_URL_PARAM_KEYS.MAXLVL,
} as const;

export function readAreasState(params: URLSearchParams): AreasState {
  return {
    search: params.get(KEYS.SEARCH) ?? '',
    minLvl: parseBoundedIntParam(params.get(KEYS.MINLVL), AREA_LEVEL_RANGE),
    maxLvl: parseBoundedIntParam(params.get(KEYS.MAXLVL), AREA_LEVEL_RANGE),
  };
}

export function encodeAreasState(state: AreasState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search.trim() !== '') params.set(KEYS.SEARCH, state.search.trim());
  if (state.minLvl !== null) params.set(KEYS.MINLVL, String(state.minLvl));
  if (state.maxLvl !== null) params.set(KEYS.MAXLVL, String(state.maxLvl));
  return params;
}

// --- sections -----------------------------------------------------------------------------------------------------

/** A run of areas of one map zone (one block for an act section) */
export interface AreaBlock {
  /** The map zone; null in act sections */
  readonly zone: string | null;
  readonly areas: readonly Area[];
}

export interface AreaSection {
  readonly key: string;
  readonly title: string;
  readonly blocks: readonly AreaBlock[];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const actTitle = (act: number) => `Act ${ROMAN[act] ?? String(act + 1)}`;

/** Areas of one section split into zone blocks, zones in order of first appearance */
function zoneBlocks(areas: readonly Area[]): AreaBlock[] {
  const zones = new Map<string, Area[]>();
  for (const area of areas) {
    const zone = area.group ?? area.name;
    const list = zones.get(zone);
    if (list === undefined) zones.set(zone, [area]);
    else list.push(area);
  }
  return [...zones].map(([zone, list]) => ({ zone, areas: list }));
}

/** "Act I" … "Act V", then "Maps · Tier 1" … "Tier 5" (by zone), then "Unique maps"; empty sections are dropped */
export function buildAreaSections(areas: readonly Area[]): AreaSection[] {
  const actAreas = areas.filter((area) => area.tier === undefined && area.uniqueMap !== true);
  const acts = [...new Set(actAreas.map((area) => area.act))].sort((a, b) => a - b);
  const tiers = [...new Set(areas.flatMap((area) => (area.tier === undefined ? [] : [area.tier])))].sort((a, b) => a - b);
  const uniqueMaps = areas.filter((area) => area.uniqueMap === true);
  const sections: AreaSection[] = [
    ...acts.map((act) => ({
      key: `act-${String(act + 1)}`,
      title: actTitle(act),
      blocks: [{ zone: null, areas: actAreas.filter((area) => area.act === act) }],
    })),
    ...tiers.map((tier) => ({
      key: `tier-${String(tier)}`,
      title: `Maps · Tier ${String(tier)}`,
      blocks: zoneBlocks(areas.filter((area) => area.tier === tier)),
    })),
    { key: 'unique-maps', title: 'Unique maps', blocks: zoneBlocks(uniqueMaps) },
  ];
  return sections.filter((section) => section.blocks.some((block) => block.areas.length > 0));
}

export const sectionAreaCount = (section: AreaSection) => section.blocks.reduce((sum, block) => sum + block.areas.length, 0);

// --- filters ------------------------------------------------------------------------------------------------------

/** What the search reads: the area name, its map zone and boss */
export function areaTexts(area: Area): string[] {
  return [area.name, area.group ?? '', area.boss ?? ''];
}

/** True when any difficulty's monster level is inside the range; areas without a level never match a set bound */
export function matchesLevel(area: Area, minLvl: number | null, maxLvl: number | null): boolean {
  if (minLvl === null && maxLvl === null) return true;
  if (area.level === null) return false;
  return area.level.some((level) => (minLvl === null || level >= minLvl) && (maxLvl === null || level <= maxLvl));
}

/** The areas matching the search (every term in the name, zone or boss) and the monster level range, bundle order */
export function filterAreas(areas: readonly Area[], state: AreasState): Area[] {
  const terms = parseSearchTerms(state.search);
  return areas.filter((area) => {
    if (!matchesLevel(area, state.minLvl, state.maxLvl)) return false;
    if (terms.length === 0) return true;
    const haystack = areaTexts(area).join('\n').toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
