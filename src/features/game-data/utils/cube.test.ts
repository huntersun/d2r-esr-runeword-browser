import { describe, expect, it } from 'vitest';
import type { CubeBundle, CubeQuality, CubeRecipe } from '../engine/schema';
import {
  buildCubeTree,
  encodeCubeState,
  familyAnchor,
  filterCubeTree,
  focusCubeTree,
  readCubeState,
  sectionDocsUrl,
  shownRowCount,
  type CubeFilters,
} from './cube';

function recipe(
  id: number,
  family: string,
  group: number,
  description: string,
  input: string,
  output: string,
  qualities: CubeQuality[] = []
): CubeRecipe {
  return {
    id,
    family,
    group,
    description,
    inputs: [{ text: input, code: 'x', qty: 1, quals: [], kind: 'item' }],
    outputs: [{ text: output, code: null, bonus: ['+5 to Life'], details: [] }],
    conditions: [],
    qualities,
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
    {
      id: 1,
      family: 'gem-upgrade',
      label: 'B-Sku: # Wildcards',
      rowCount: 2,
      conditions: ['Hell only'],
      inputNames: ['Hacker'],
      outputNames: ['Blade of Ali Baba'],
    },
    { id: 2, family: 'dragon', label: 'Dstone Transformation', rowCount: 2, conditions: [] },
    { id: 3, family: 'other:weapons-crate', label: 'Weapons Crate', rowCount: 1, conditions: [] },
  ],
  rows: [
    { family: 'gem-upgrade', group: 0, inputs: ['3× Flawless gem'], output: 'Perfect gem of the same colour', variants: 3, qualities: [] },
    { family: 'gem-upgrade', group: 0, inputs: ['2× Flawless gem', 'Wild Card'], output: 'Perfect gem', variants: 1, qualities: [] },
    { family: 'gem-upgrade', group: 1, inputs: ['Skull'], output: 'Wild Card', variants: 2, qualities: ['unique'] },
    { family: 'dragon', group: 2, inputs: ['Dragon Stone'], output: 'Holy Symbol / Blackmoor', variants: 2, qualities: ['set', 'magic'] },
    { family: 'other:weapons-crate', group: 3, inputs: ['Weapons Crate'], output: 'Long Bow', variants: 1, qualities: [] },
  ],
  recipes: [
    recipe(10, 'dragon', 2, 'Dstone Transformation', 'Dragon Stone', 'Holy Symbol', ['set']),
    recipe(11, 'dragon', 2, 'Dstone Transformation', 'Holy Symbol', 'Blackmoor', ['magic']),
    recipe(12, 'other:weapons-crate', 3, 'Weapons Crate', 'Weapons Crate', 'Long Bow'),
  ],
  hidden: { enhance: 10, traps: 2, old: 1, stockers: 5, dummy: 0 },
};

const tree = buildCubeTree(BUNDLE);
const familyIds = (sections: ReturnType<typeof buildCubeTree>) =>
  sections.flatMap((section) => section.families.map((view) => view.family.id));

const NO_FILTERS: CubeFilters = { search: '', input: '', output: '', qualities: [] };
const filter = (patch: Partial<CubeFilters>) => filterCubeTree(tree, { ...NO_FILTERS, ...patch });

describe('cube URL state', () => {
  it('reads the searches, qualities and a known family, dropping an unknown family or quality', () => {
    expect(readCubeState(new URLSearchParams('search=dragon+stone&in=gem&out=unique&q=set,nope,unique&family=dragon'), BUNDLE)).toEqual({
      search: 'dragon stone',
      input: 'gem',
      output: 'unique',
      qualities: ['unique', 'set'],
      family: 'dragon',
    });
    expect(readCubeState(new URLSearchParams('family=nope'), BUNDLE)).toEqual({ ...NO_FILTERS, family: null });
  });

  it('encodes only what is set', () => {
    expect(encodeCubeState({ ...NO_FILTERS, search: '  ', family: null }).toString()).toBe('');
    expect(encodeCubeState({ ...NO_FILTERS, search: ' gem ', family: 'other:weapons-crate' }).toString()).toBe(
      'family=other%3Aweapons-crate&search=gem'
    );
    expect(encodeCubeState({ search: '', input: ' key ', output: 'bow', qualities: ['unique', 'set'], family: null }).toString()).toBe(
      'in=key&out=bow&q=unique%2Cset'
    );
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
    const result = filter({ search: 'gem upgrades' });
    expect(familyIds(result)).toEqual(['gem-upgrade']);
    expect(result[0]?.families[0]?.groups).toHaveLength(2);
  });

  it('keeps a whole group when its header (label, names, conditions) matches every term', () => {
    const byName = filter({ search: 'hacker' });
    expect(byName[0]?.families[0]?.groups.map((group) => group.group.id)).toEqual([1]);
    expect(filter({ search: '"hell only"' })[0]?.families[0]?.groups[0]?.rows).toHaveLength(1);
  });

  it('otherwise filters merged rows and raw recipes one by one (AND terms)', () => {
    const result = filter({ search: 'wild perfect' });
    expect(familyIds(result)).toEqual(['gem-upgrade']);
    expect(result[0]?.families[0]?.groups[0]?.rows.map((row) => row.output)).toEqual(['Perfect gem']);
    // "blackmoor" is in a merged row and one raw recipe; "life" only in the raw recipes' bonus lines
    const dragon = filter({ search: 'blackmoor' })[0]?.families[0]?.groups[0];
    expect([dragon?.rows.length, dragon?.recipes.map((entry) => entry.id)]).toEqual([1, [11]]);
    const life = filter({ search: 'life holy' })[0]?.families[0]?.groups[0];
    expect([life?.rows.length, life?.recipes.map((entry) => entry.id)]).toEqual([0, [10, 11]]);
    expect(filter({ search: 'nothing-like-this' })).toEqual([]);
  });

  it('matches the ingredient search against inputs only and the result search against outputs only', () => {
    // "wild" is an input of one gem row and the output of the skull row
    const wildIn = filter({ input: 'wild' });
    expect(wildIn[0]?.families[0]?.groups.flatMap((group) => group.rows.map((row) => row.output))).toEqual(['Perfect gem']);
    const wildOut = filter({ output: 'wild' });
    expect(wildOut[0]?.families[0]?.groups.flatMap((group) => group.rows.map((row) => row.output))).toEqual(['Wild Card']);
    // A family label does not keep the family for in/out; "gem upgrades" is not in any input
    expect(filter({ input: 'upgrades' })).toEqual([]);
    // Raw recipes: inputs vs outputs, bonus lines are results
    const holyIn = filter({ input: 'holy' })[0]?.families[0]?.groups[0];
    expect(holyIn?.recipes.map((entry) => entry.id)).toEqual([11]);
    expect(filter({ output: 'life' })[0]?.families[0]?.groups[0]?.recipes.map((entry) => entry.id)).toEqual([10, 11]);
    // Group names per side keep the group's rows
    expect(filter({ input: 'hacker' })[0]?.families[0]?.groups.map((group) => group.group.id)).toEqual([1]);
    expect(filter({ output: 'hacker' })).toEqual([]);
    expect(filter({ output: 'ali baba' })[0]?.families[0]?.groups.map((group) => group.group.id)).toEqual([1]);
    // Both searches must match
    expect(familyIds(filter({ input: 'skull', output: 'wild' }))).toEqual(['gem-upgrade']);
    expect(filter({ input: 'skull', output: 'perfect' })).toEqual([]);
  });

  it('keeps rows whose output qualities intersect the selection', () => {
    expect(familyIds(filter({ qualities: ['unique'] }))).toEqual(['gem-upgrade']);
    const magic = filter({ qualities: ['magic'] })[0]?.families[0]?.groups[0];
    expect([magic?.rows.length, magic?.recipes.map((entry) => entry.id)]).toEqual([1, [11]]);
    expect(familyIds(filter({ qualities: ['unique', 'set'] }))).toEqual(['gem-upgrade', 'dragon']);
    expect(filter({ qualities: ['crafted'] })).toEqual([]);
  });

  it('focuses one family and counts the rows shown', () => {
    const focused = focusCubeTree(tree, 'dragon');
    expect(familyIds(focused)).toEqual(['dragon']);
    expect(focusCubeTree(tree, null)).toHaveLength(2);
    const gems = tree[0]?.families[0];
    expect(gems === undefined ? 0 : shownRowCount(gems)).toBe(6);
    const life = filter({ search: 'life holy' })[0]?.families[0];
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
