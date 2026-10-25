import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import type { SkillClassTree, SkillsBundle } from '@/features/game-data/engine/schema';
import { CHARACTER_CLASSES, LEVEL_MAX } from '../constants';
import {
  classTree,
  clearSkillPoints,
  hasSkillPoints,
  levelCap,
  parseLevelText,
  prerequisiteNames,
  setSkillPoints,
  skillName,
  skillPointTotals,
  skillsForClass,
  skillsOutsideClass,
} from './skillTree';

const bundle = JSON.parse(readFileSync(resolve(__dirname, '../../../../public/game-data/skills.json'), 'utf-8')) as SkillsBundle;

const skill = (id: string, row: number, col: number, reqSkills: string[] = []) => ({
  id,
  name: `${id} name`,
  row,
  col,
  reqLevel: 1,
  maxLevel: 20,
  reqSkills,
});

// Small hand-made tree so the counting tests do not depend on ESR data.
const tree: SkillClassTree = {
  code: 'pal',
  name: 'Paladin',
  tabs: [
    { page: 1, name: 'Combat', skills: [skill('Sacrifice', 1, 1), skill('Zeal', 2, 1, ['Sacrifice'])] },
    { page: 2, name: 'Offensive', skills: [skill('Might', 1, 1)] },
    { page: 3, name: 'Defensive', skills: [skill('Prayer', 1, 1), skill('Vigor', 3, 2, ['Prayer', 'Gone'])] },
  ],
};

describe('skills.json against the builds model', () => {
  it('has one tree per CHARACTER_CLASSES name', () => {
    expect(bundle.classes.map((entry) => entry.name).sort()).toEqual([...CHARACTER_CLASSES].sort());
    for (const name of CHARACTER_CLASSES) {
      expect(classTree(bundle, name)?.tabs).toHaveLength(3);
    }
  });

  it('carries the level cap the validator uses', () => {
    expect(bundle.maxLevel).toBe(LEVEL_MAX);
    expect(levelCap(bundle)).toBe(LEVEL_MAX);
    expect(levelCap(undefined)).toBe(LEVEL_MAX);
  });

  it('places every skill inside the 3 x 6 grid with unique cells per tab', () => {
    for (const entry of bundle.classes) {
      for (const tab of entry.tabs) {
        const cells = tab.skills.map((s) => `${String(s.row)}:${String(s.col)}`);
        expect(new Set(cells).size).toBe(cells.length);
        for (const s of tab.skills) {
          expect(s.row).toBeGreaterThanOrEqual(1);
          expect(s.row).toBeLessThanOrEqual(6);
          expect(s.col).toBeGreaterThanOrEqual(1);
          expect(s.col).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('finds no tree for an unknown or empty class', () => {
    expect(classTree(bundle, '')).toBeUndefined();
    expect(classTree(bundle, 'Monk')).toBeUndefined();
    expect(classTree(undefined, 'Paladin')).toBeUndefined();
  });
});

describe('skillPointTotals', () => {
  it('counts per tab, in total, and lists ids outside the tree', () => {
    const totals = skillPointTotals({ Zeal: 20, Sacrifice: 1, Vigor: 5, 'Summon Goatman': 3 }, tree);
    expect(totals).toEqual({ total: 29, byTab: [21, 0, 5], unknown: [{ id: 'Summon Goatman', points: 3 }] });
  });

  it('treats every id as unknown without a tree', () => {
    expect(skillPointTotals({ Zeal: 2 }, undefined)).toEqual({ total: 2, byTab: [], unknown: [{ id: 'Zeal', points: 2 }] });
  });

  it('is all zeros for an empty allocation', () => {
    expect(skillPointTotals({}, tree)).toEqual({ total: 0, byTab: [0, 0, 0], unknown: [] });
  });
});

describe('setSkillPoints / clearSkillPoints', () => {
  it('sets, replaces and removes at 0 without mutating', () => {
    const start = { Zeal: 1 };
    expect(setSkillPoints(start, 'Might', 3)).toEqual({ Zeal: 1, Might: 3 });
    expect(setSkillPoints(start, 'Zeal', 2)).toEqual({ Zeal: 2 });
    expect(setSkillPoints(start, 'Zeal', 0)).toEqual({});
    expect(start).toEqual({ Zeal: 1 });
  });

  it('clamps to 0..99 and does not stop at the skill max level', () => {
    expect(setSkillPoints({}, 'Zeal', 25)).toEqual({ Zeal: 25 });
    expect(setSkillPoints({}, 'Zeal', 150)).toEqual({ Zeal: 99 });
    expect(setSkillPoints({ Zeal: 3 }, 'Zeal', -1)).toEqual({});
    expect(setSkillPoints({}, 'Zeal', Number.NaN)).toEqual({});
  });

  it('clears everything or just the given ids', () => {
    expect(clearSkillPoints({ Zeal: 1, Might: 2 })).toEqual({});
    expect(clearSkillPoints({ Zeal: 1, Might: 2, Other: 3 }, ['Zeal', 'Other'])).toEqual({ Might: 2 });
  });
});

describe('skillsForClass / skillsOutsideClass', () => {
  it('splits the stored ids by the tree', () => {
    const points = { Zeal: 1, 'Summon Goatman': 2, Might: 3 };
    expect(skillsForClass(points, tree)).toEqual(['Zeal', 'Might']);
    expect(skillsOutsideClass(points, tree)).toEqual(['Summon Goatman']);
  });

  it('finds the ESR Warlock skills in the Warlock tree only', () => {
    const points = { 'Summon Goatman': 20, 'Demonic Mastery': 1 };
    expect(skillsForClass(points, classTree(bundle, 'Warlock'))).toEqual(['Summon Goatman', 'Demonic Mastery']);
    expect(skillsOutsideClass(points, classTree(bundle, 'Paladin'))).toEqual(['Summon Goatman', 'Demonic Mastery']);
  });
});

describe('names and helpers', () => {
  it('names prerequisites, falling back to the id', () => {
    const vigor = tree.tabs[2]?.skills[1];
    expect(vigor && prerequisiteNames(vigor, tree)).toEqual(['Prayer name', 'Gone']);
  });

  it('names a stored id from any class tree, else the id', () => {
    expect(skillName(bundle, 'Summon Goatman')).toBe('Summon Goatman');
    expect(skillName(bundle, 'No Such Skill')).toBe('No Such Skill');
    expect(skillName(undefined, 'Zeal')).toBe('Zeal');
  });

  it('parses the level text', () => {
    expect(parseLevelText('')).toBeUndefined();
    expect(parseLevelText('  ')).toBeUndefined();
    expect(parseLevelText('95')).toBe(95);
    expect(parseLevelText(' 1 ')).toBe(1);
    expect(parseLevelText('110')).toBe(110);
    expect(parseLevelText('111')).toBeUndefined();
    expect(parseLevelText('0')).toBeUndefined();
    expect(parseLevelText('9.5')).toBeUndefined();
    expect(parseLevelText('abc')).toBeUndefined();
  });

  it('tells whether an allocation has points', () => {
    expect(hasSkillPoints(undefined)).toBe(false);
    expect(hasSkillPoints({})).toBe(false);
    expect(hasSkillPoints({ Zeal: 1 })).toBe(true);
  });
});
