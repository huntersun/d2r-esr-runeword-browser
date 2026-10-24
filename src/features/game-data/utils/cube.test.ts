import { describe, expect, it } from 'vitest';
import type { CubeBundle, CubeRecipe } from '../engine/schema';
import {
  buildCubeTree,
  encodeCubeState,
  familyAnchor,
  filterCubeTree,
  focusCubeTree,
  readCubeState,
  sectionDocsUrl,
  shownRowCount,
} from './cube';

function recipe(id: number, family: string, group: number, description: string, input: string, output: string): CubeRecipe {
  return {
    id,
    family,
    group,
    description,
    inputs: [{ text: input, code: 'x', qty: 1, quals: [], kind: 'item' }],
    outputs: [{ text: output, code: null, bonus: ['+5 to Life'], details: [] }],
    conditions: [],
  };
}

const BUNDLE: CubeBundle = {
  sections: [
    { id: 'gem', label: 'Gems / Runes', doc: 'Eastern Sun Resurrected Cube Recipes.html', anchor: 'gem' },
    { id: 'other', label: 'Other recipes', doc: null, anchor: null },
  ],
  families: [
    { id: 'other:weapons-crate', label: 'Weapons Crate', section: 'other', order: 2, rowCount: 1, raw: true },
    { id: 'gem-upgrade', label: 'Gem upgrades', section: 'gem', order: 0, rowCount: 6, raw: false },
    { id: 'dragon', label: 'Dragon Stone cycle', section: 'gem', order: 1, rowCount: 2, raw: true },
  ],
  groups: [
    { id: 0, family: 'gem-upgrade', label: 'P-Ame: # F-Ame', rowCount: 4, conditions: [] },
    { id: 1, family: 'gem-upgrade', label: 'B-Sku: # Wildcards', rowCount: 2, conditions: ['Hell only'], names: ['Hacker'] },
    { id: 2, family: 'dragon', label: 'Dstone Transformation', rowCount: 2, conditions: [] },
    { id: 3, family: 'other:weapons-crate', label: 'Weapons Crate', rowCount: 1, conditions: [] },
  ],
  rows: [
    { family: 'gem-upgrade', group: 0, inputs: ['3× Flawless gem'], output: 'Perfect gem of the same colour', variants: 3 },
    { family: 'gem-upgrade', group: 0, inputs: ['2× Flawless gem', 'Wild Card'], output: 'Perfect gem', variants: 1 },
    { family: 'gem-upgrade', group: 1, inputs: ['Skull'], output: 'Wild Card', variants: 2 },
    { family: 'dragon', group: 2, inputs: ['Dragon Stone'], output: 'Holy Symbol / Blackmoor', variants: 2 },
    { family: 'other:weapons-crate', group: 3, inputs: ['Weapons Crate'], output: 'Long Bow', variants: 1 },
  ],
  recipes: [
    recipe(10, 'dragon', 2, 'Dstone Transformation', 'Dragon Stone', 'Holy Symbol'),
    recipe(11, 'dragon', 2, 'Dstone Transformation', 'Holy Symbol', 'Blackmoor'),
    recipe(12, 'other:weapons-crate', 3, 'Weapons Crate', 'Weapons Crate', 'Long Bow'),
  ],
  hidden: { enhance: 10, traps: 2, old: 1, stockers: 5, dummy: 0 },
};

const tree = buildCubeTree(BUNDLE);
const familyIds = (sections: ReturnType<typeof buildCubeTree>) =>
  sections.flatMap((section) => section.families.map((view) => view.family.id));

describe('cube URL state', () => {
  it('reads the search and a known family, dropping an unknown one', () => {
    expect(readCubeState(new URLSearchParams('search=dragon+stone&family=dragon'), BUNDLE)).toEqual({
      search: 'dragon stone',
      family: 'dragon',
    });
    expect(readCubeState(new URLSearchParams('family=nope'), BUNDLE)).toEqual({ search: '', family: null });
  });

  it('encodes only what is set', () => {
    expect(encodeCubeState({ search: '  ', family: null }).toString()).toBe('');
    expect(encodeCubeState({ search: ' gem ', family: 'other:weapons-crate' }).toString()).toBe('family=other%3Aweapons-crate&search=gem');
  });
});

describe('cube tree', () => {
  it('orders sections, families by order and groups with their rows and recipes', () => {
    expect(tree.map((section) => section.section.id)).toEqual(['gem', 'other']);
    expect(familyIds(tree)).toEqual(['gem-upgrade', 'dragon', 'other:weapons-crate']);
    const dragon = tree[0]?.families[1];
    expect(dragon?.groups[0]?.recipes.map((entry) => entry.id)).toEqual([10, 11]);
    expect(tree[0]?.families[0]?.groups.map((group) => group.rows.length)).toEqual([2, 1]);
  });

  it('keeps a whole family when its label matches every term', () => {
    const result = filterCubeTree(tree, 'gem upgrades');
    expect(familyIds(result)).toEqual(['gem-upgrade']);
    expect(result[0]?.families[0]?.groups).toHaveLength(2);
  });

  it('keeps a whole group when its header (label, names, conditions) matches every term', () => {
    const byName = filterCubeTree(tree, 'hacker');
    expect(byName[0]?.families[0]?.groups.map((group) => group.group.id)).toEqual([1]);
    expect(filterCubeTree(tree, '"hell only"')[0]?.families[0]?.groups[0]?.rows).toHaveLength(1);
  });

  it('otherwise filters merged rows and raw recipes one by one (AND terms)', () => {
    const result = filterCubeTree(tree, 'wild perfect');
    expect(familyIds(result)).toEqual(['gem-upgrade']);
    expect(result[0]?.families[0]?.groups[0]?.rows.map((row) => row.output)).toEqual(['Perfect gem']);
    // "blackmoor" is in a merged row and one raw recipe; "life" only in the raw recipes' bonus lines
    const dragon = filterCubeTree(tree, 'blackmoor')[0]?.families[0]?.groups[0];
    expect([dragon?.rows.length, dragon?.recipes.map((entry) => entry.id)]).toEqual([1, [11]]);
    const life = filterCubeTree(tree, 'life holy')[0]?.families[0]?.groups[0];
    expect([life?.rows.length, life?.recipes.map((entry) => entry.id)]).toEqual([0, [10, 11]]);
    expect(filterCubeTree(tree, 'nothing-like-this')).toEqual([]);
  });

  it('focuses one family and counts the rows shown', () => {
    const focused = focusCubeTree(tree, 'dragon');
    expect(familyIds(focused)).toEqual(['dragon']);
    expect(focusCubeTree(tree, null)).toHaveLength(2);
    const gems = tree[0]?.families[0];
    expect(gems === undefined ? 0 : shownRowCount(gems)).toBe(6);
    const life = filterCubeTree(tree, 'life holy')[0]?.families[0];
    expect(life === undefined ? 0 : shownRowCount(life)).toBe(2);
  });

  it('links sections to the official page and makes DOM-safe anchors', () => {
    expect(sectionDocsUrl(BUNDLE.sections[0] ?? BUNDLE.sections[1])).toBe(
      'https://easternsunresurrected.com/Eastern%20Sun%20Resurrected%20Cube%20Recipes.html#gem'
    );
    expect(sectionDocsUrl({ id: 'other', label: 'Other', doc: null, anchor: null })).toBeNull();
    expect(familyAnchor('other:weapons-crate')).toBe('cube-family-other-weapons-crate');
  });
});
