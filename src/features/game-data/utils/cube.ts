/**
 * Cube Recipes page: URL state, the family / group / row tree built from cube.json and the search over it.
 *
 * Search rule: a family whose label matches every term is kept whole; otherwise a group whose header (its recipe
 * shape, the unique and set names its rows use, its conditions) matches every term is kept whole; otherwise the
 * merged rows and the raw recipes are filtered one by one.
 */
import { FILTER_URL_PARAM_KEYS } from '@/core/utils/filterUrlParams';
import { parseSearchTerms } from '@/core/utils/searchTerms';
import { ESR_DOCS_URL } from '@/core/navigation/navConfig';
import { GAME_DATA_URL_PARAM_KEYS } from '../constants/urlParams';
import type { CubeBundle, CubeFamilyInfo, CubeGroup, CubeMergedRow, CubeRecipe, CubeSection } from '../engine/schema';

export interface CubeState {
  readonly search: string;
  /** Focused family id, null for all families */
  readonly family: string | null;
}

const KEYS = { SEARCH: FILTER_URL_PARAM_KEYS.SEARCH, FAMILY: GAME_DATA_URL_PARAM_KEYS.FAMILY } as const;

/** URL → state; an unknown family id shows every family */
export function readCubeState(params: URLSearchParams, bundle: CubeBundle): CubeState {
  const family = params.get(KEYS.FAMILY);
  return {
    search: params.get(KEYS.SEARCH) ?? '',
    family: family !== null && bundle.families.some((entry) => entry.id === family) ? family : null,
  };
}

export function encodeCubeState(state: CubeState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.family !== null) params.set(KEYS.FAMILY, state.family);
  if (state.search.trim() !== '') params.set(KEYS.SEARCH, state.search.trim());
  return params;
}

// --- tree ---------------------------------------------------------------------------------------------------------

export interface CubeGroupView {
  readonly group: CubeGroup;
  readonly rows: readonly CubeMergedRow[];
  /** Every cubemain row of the group (small families only; empty otherwise) */
  readonly recipes: readonly CubeRecipe[];
}

export interface CubeFamilyView {
  readonly family: CubeFamilyInfo;
  readonly groups: readonly CubeGroupView[];
}

export interface CubeSectionView {
  readonly section: CubeSection;
  readonly families: readonly CubeFamilyView[];
}

/** Sections (official page order) → families (display order) → groups with their merged rows and raw recipes */
export function buildCubeTree(bundle: CubeBundle): CubeSectionView[] {
  const rowsByGroup = groupBy(bundle.rows, (row) => row.group);
  const recipesByGroup = groupBy(bundle.recipes, (recipe) => recipe.group);
  const groupsByFamily = groupBy(bundle.groups, (group) => group.family);
  const families = [...bundle.families].sort((a, b) => a.order - b.order);
  return bundle.sections.flatMap((section) => {
    const views = families
      .filter((family) => family.section === section.id)
      .map((family) => ({
        family,
        groups: (groupsByFamily.get(family.id) ?? []).map((group) => ({
          group,
          rows: rowsByGroup.get(group.id) ?? [],
          recipes: recipesByGroup.get(group.id) ?? [],
        })),
      }));
    return views.length === 0 ? [] : [{ section, families: views }];
  });
}

function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list === undefined) map.set(k, [item]);
    else list.push(item);
  }
  return map;
}

// --- search -------------------------------------------------------------------------------------------------------

function matches(texts: readonly string[], terms: readonly string[]): boolean {
  const haystack = texts.join('\n').toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function groupHeaderTexts(group: CubeGroup): string[] {
  return [group.label, ...(group.names ?? []), ...group.conditions];
}

export function mergedRowTexts(row: CubeMergedRow): string[] {
  return [...row.inputs, row.output];
}

export function recipeTexts(recipe: CubeRecipe): string[] {
  return [
    recipe.description,
    ...recipe.inputs.flatMap((input) => [input.text, input.code]),
    ...recipe.outputs.flatMap((output) => [output.text, output.code ?? '', ...output.bonus, ...output.details]),
    ...recipe.conditions,
  ];
}

/** Filters the tree by the search; sections and families without a match are dropped. */
export function filterCubeTree(tree: readonly CubeSectionView[], search: string): CubeSectionView[] {
  const terms = parseSearchTerms(search);
  if (terms.length === 0) return [...tree];
  return tree.flatMap((section) => {
    const families = section.families.flatMap((view): CubeFamilyView[] => {
      if (matches([view.family.label], terms)) return [view];
      const groups = view.groups.flatMap((groupView): CubeGroupView[] => {
        if (matches(groupHeaderTexts(groupView.group), terms)) return [groupView];
        const rows = groupView.rows.filter((row) => matches([...mergedRowTexts(row), ...groupView.group.conditions], terms));
        const recipes = groupView.recipes.filter((recipe) => matches(recipeTexts(recipe), terms));
        return rows.length === 0 && recipes.length === 0 ? [] : [{ group: groupView.group, rows, recipes }];
      });
      return groups.length === 0 ? [] : [{ family: view.family, groups }];
    });
    return families.length === 0 ? [] : [{ section: section.section, families }];
  });
}

/** Only the focused family (null: every family) */
export function focusCubeTree(tree: readonly CubeSectionView[], family: string | null): CubeSectionView[] {
  if (family === null) return [...tree];
  return tree.flatMap((section) => {
    const families = section.families.filter((view) => view.family.id === family);
    return families.length === 0 ? [] : [{ section: section.section, families }];
  });
}

/** cubemain rows shown in a (filtered) family: the rows its merged rows stand for, or its matching raw recipes */
export function shownRowCount(view: CubeFamilyView): number {
  return view.groups.reduce(
    (sum, group) =>
      sum +
      Math.max(
        group.rows.reduce((rows, row) => rows + row.variants, 0),
        group.recipes.length
      ),
    0
  );
}

// --- texts --------------------------------------------------------------------------------------------------------

export const CUBE_DOCS_PAGE = 'Eastern Sun Resurrected Cube Recipes.html';

/** Official page of a section (with its anchor), null when no page covers it */
export function sectionDocsUrl(section: CubeSection): string | null {
  if (section.doc === null) return null;
  return `${ESR_DOCS_URL}${encodeURIComponent(section.doc)}${section.anchor === null ? '' : `#${encodeURIComponent(section.anchor)}`}`;
}

export const CUBE_DOCS_URL = `${ESR_DOCS_URL}${encodeURIComponent(CUBE_DOCS_PAGE)}`;

/** DOM id of a family's section */
export function familyAnchor(id: string): string {
  return `cube-family-${id.replace(/[^a-z0-9-]/gi, '-')}`;
}

/** 1408 → "1,408" */
export function formatCount(count: number): string {
  return count.toLocaleString('en-US');
}
