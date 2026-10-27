// Pure helpers for the structured skill tree allocation (`build_data.skillPoints`, skills.json ids).
// Owner decision: no point budget, no level or prerequisite rules; the UI only counts and shows.

import type { SkillClassTree, SkillsBundle } from '@/features/game-data/engine/schema';
import type { SkillClassView, SkillsView } from '@/features/skills/utils/skills';
import { asLevel } from '../buildData';
import { LEVEL_MAX, SKILL_POINTS_MAX } from '../constants';

export type SkillPoints = Readonly<Record<string, number>>;

export interface SkillPointTotals {
  /** Every stored point, including the unknown ids. */
  readonly total: number;
  /** Points per tab, in the tree's tab order. */
  readonly byTab: readonly number[];
  /** Stored ids not in the tree (another class's skills, renamed skills), in stored order. */
  readonly unknown: readonly { readonly id: string; readonly points: number }[];
}

/** The class tree for a build's class display name ("Paladin"), or undefined (no class, unknown class, no bundle). */
export function classTree(bundle: SkillsBundle | undefined, characterClass: string): SkillClassTree | undefined {
  return bundle?.classes.find((tree) => tree.name === characterClass);
}

/** The Skills page view (icon tiles, details) of a build's class display name, or undefined (no view, unknown class). */
export function classView(view: SkillsView | undefined, characterClass: string): SkillClassView | undefined {
  return view?.classes.find((cls) => cls.name === characterClass);
}

/** The character level cap: the bundle's `maxLevel`, else LEVEL_MAX. */
export function levelCap(bundle: SkillsBundle | undefined): number {
  return bundle?.maxLevel ?? LEVEL_MAX;
}

/** The form's level text as a level (an integer in 1..LEVEL_MAX), or undefined when blank or invalid. */
export function parseLevelText(text: string): number | undefined {
  const trimmed = text.trim();
  return trimmed === '' ? undefined : asLevel(Number(trimmed));
}

/** The skill ids of a tree, as a set. */
function treeIds(tree: SkillClassTree | undefined): ReadonlySet<string> {
  return new Set(tree?.tabs.flatMap((tab) => tab.skills.map((skill) => skill.id)) ?? []);
}

export function skillPointTotals(skillPoints: SkillPoints, tree: SkillClassTree | undefined): SkillPointTotals {
  const ids = treeIds(tree);
  const byTab = tree?.tabs.map((tab) => tab.skills.reduce((sum, skill) => sum + (skillPoints[skill.id] ?? 0), 0)) ?? [];
  const entries = Object.entries(skillPoints);
  const total = entries.reduce((sum, [, points]) => sum + points, 0);
  const unknown = entries.filter(([id]) => !ids.has(id)).map(([id, points]) => ({ id, points }));
  return { total, byTab, unknown };
}

/** A new record with `id` set to `points` clamped to 0..SKILL_POINTS_MAX (and rounded); the key is removed at 0. */
export function setSkillPoints(skillPoints: SkillPoints, id: string, points: number): SkillPoints {
  const clamped = Number.isFinite(points) ? Math.min(SKILL_POINTS_MAX, Math.max(0, Math.round(points))) : 0;
  const rest = Object.fromEntries(Object.entries(skillPoints).filter(([key]) => key !== id));
  return clamped > 0 ? { ...rest, [id]: clamped } : rest;
}

/** A new record without the given ids (all of them when `ids` is omitted). */
export function clearSkillPoints(skillPoints: SkillPoints, ids?: Iterable<string>): SkillPoints {
  if (ids === undefined) return {};
  const drop = new Set(ids);
  return Object.fromEntries(Object.entries(skillPoints).filter(([key]) => !drop.has(key)));
}

/** The stored ids that belong to the tree. */
export function skillsForClass(skillPoints: SkillPoints, tree: SkillClassTree | undefined): string[] {
  const ids = treeIds(tree);
  return Object.keys(skillPoints).filter((id) => ids.has(id));
}

/** The stored ids that do not belong to the tree (what "Clear them" removes after a class change). */
export function skillsOutsideClass(skillPoints: SkillPoints, tree: SkillClassTree | undefined): string[] {
  const ids = treeIds(tree);
  return Object.keys(skillPoints).filter((id) => !ids.has(id));
}

/** Display name of a stored id across every class tree of the bundle (the id itself when not found). */
export function skillName(bundle: SkillsBundle | undefined, id: string): string {
  for (const tree of bundle?.classes ?? []) {
    for (const tab of tree.tabs) {
      const found = tab.skills.find((skill) => skill.id === id);
      if (found !== undefined) return found.name;
    }
  }
  return id;
}

/** True when the record holds at least one point. */
export function hasSkillPoints(skillPoints: SkillPoints | undefined): skillPoints is SkillPoints {
  return skillPoints !== undefined && Object.keys(skillPoints).length > 0;
}
