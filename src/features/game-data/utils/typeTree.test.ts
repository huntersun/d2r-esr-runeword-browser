import { describe, expect, it } from 'vitest';
import type { BaseItem, ItemTypeInfo } from '../engine/schema';
import { buildTypeTree } from './typeTree';
import { buildTypeGroups } from './typeGroups';
import { formatSocketCaps } from './format';

function type(code: string, parents: string[], ancestors: string[], cls: ItemTypeInfo['cls'] = null): ItemTypeInfo {
  return {
    code,
    name: code.toUpperCase(),
    parents,
    ancestors,
    sockets: [0, 0, 0],
    thresholds: [25, 40],
    cls,
    ui: null,
    rwCats: [],
    magic: false,
    rare: false,
    normal: false,
    bodyLoc: null,
  };
}

const TYPES = [
  type('weap', [], ['weap']),
  type('mele', ['weap'], ['mele', 'weap']),
  type('thro', ['weap'], ['thro', 'weap']),
  type('jave', ['mele', 'thro'], ['jave', 'mele', 'thro', 'weap']),
  type('orb', ['weap'], ['orb', 'weap'], 'sor'),
  type('1hsw', [], ['1hsw']),
];

const base = (code: string, kind: BaseItem['kind'], t: string, type2: string | null, ancestors: string[]) =>
  ({ code, name: code, kind, type: t, type2, ancestors }) as BaseItem;

const BASES = [
  base('jav', 'weapon', 'jave', '1hsw', ['jave', '1hsw', 'mele', 'thro', 'weap']),
  base('ob1', 'weapon', 'orb', null, ['orb', 'weap']),
];

describe('buildTypeTree', () => {
  it('lists a type with two parents under both, and counts direct vs total bases', () => {
    const tree = buildTypeTree(TYPES, BASES);
    expect(tree.roots.map((t) => t.code)).toEqual(['1hsw', 'weap']);
    expect(tree.children.get('mele')?.map((t) => t.code)).toEqual(['jave']);
    expect(tree.children.get('thro')?.map((t) => t.code)).toEqual(['jave']);
    expect(tree.directCounts.get('jave')).toBe(1);
    expect(tree.directCounts.get('1hsw')).toBe(1);
    expect(tree.directCounts.get('weap')).toBeUndefined();
    expect(tree.totalCounts.get('weap')).toBe(2);
  });
});

describe('buildTypeGroups', () => {
  it('groups primary base types by kind and class restriction', () => {
    expect(buildTypeGroups(BASES, TYPES).map((g) => [g.label, g.types.map((t) => t.code)])).toEqual([
      ['Weapons', ['jave']],
      ['Class weapons', ['orb']],
    ]);
  });
});

describe('formatSocketCaps', () => {
  it('collapses equal bands and labels thresholds otherwise', () => {
    expect(formatSocketCaps([2, 2, 2], [25, 40])).toBe('2');
    expect(formatSocketCaps([3, 4, 6], [25, 40])).toBe('3 (ilvl ≤ 25) / 4 (≤ 40) / 6');
  });
});
