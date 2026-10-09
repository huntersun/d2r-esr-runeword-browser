import type { BaseItem, ItemTypeInfo } from '../engine/schema';

export interface TypeTree {
  /** Types without parents, sorted by name */
  readonly roots: readonly ItemTypeInfo[];
  /** Child types per code, sorted by name; a type with two parents is listed under both */
  readonly children: ReadonlyMap<string, readonly ItemTypeInfo[]>;
  /** Bases whose `type` or `type2` is exactly this code */
  readonly directCounts: ReadonlyMap<string, number>;
  /** Bases whose ancestors include this code (what the Bases page `?type=` filter shows) */
  readonly totalCounts: ReadonlyMap<string, number>;
}

const byName = (a: ItemTypeInfo, b: ItemTypeInfo) => a.name.localeCompare(b.name);

export function buildTypeTree(types: readonly ItemTypeInfo[], bases: readonly BaseItem[]): TypeTree {
  const children = new Map<string, ItemTypeInfo[]>();
  for (const type of types) {
    for (const parent of new Set(type.parents)) {
      const list = children.get(parent) ?? [];
      list.push(type);
      children.set(parent, list);
    }
  }
  for (const list of children.values()) list.sort(byName);

  const directCounts = new Map<string, number>();
  const totalCounts = new Map<string, number>();
  for (const base of bases) {
    for (const code of new Set([base.type, base.type2])) {
      if (code !== null) directCounts.set(code, (directCounts.get(code) ?? 0) + 1);
    }
    for (const code of base.ancestors) totalCounts.set(code, (totalCounts.get(code) ?? 0) + 1);
  }

  return {
    roots: types.filter((type) => type.parents.length === 0).sort(byName),
    children,
    directCounts,
    totalCounts,
  };
}
