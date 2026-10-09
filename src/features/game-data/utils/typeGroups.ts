import type { BaseItem, ItemTypeInfo } from '../engine/schema';

export interface TypeGroup {
  readonly label: string;
  readonly types: readonly ItemTypeInfo[];
}

const GROUP_ORDER = ['Weapons', 'Class weapons', 'Armor', 'Class armor', 'Accessories', 'Class accessories'] as const;
type GroupLabel = (typeof GROUP_ORDER)[number];

function groupLabel(kind: BaseItem['kind'], classSpecific: boolean): GroupLabel {
  if (kind === 'weapon') return classSpecific ? 'Class weapons' : 'Weapons';
  if (kind === 'armor') return classSpecific ? 'Class armor' : 'Armor';
  return classSpecific ? 'Class accessories' : 'Accessories';
}

/**
 * Item-type picker groups: every type that is some base's primary `type`, grouped by the base kind and whether the type
 * is class-restricted, sorted by name inside each group.
 */
export function buildTypeGroups(bases: readonly BaseItem[], types: readonly ItemTypeInfo[]): TypeGroup[] {
  const typeByCode = new Map(types.map((type) => [type.code, type]));
  const groups = new Map<GroupLabel, Map<string, ItemTypeInfo>>();
  for (const base of bases) {
    const type = typeByCode.get(base.type);
    if (type === undefined) continue;
    const label = groupLabel(base.kind, type.cls !== null);
    const group = groups.get(label) ?? new Map<string, ItemTypeInfo>();
    group.set(type.code, type);
    groups.set(label, group);
  }
  return GROUP_ORDER.flatMap((label) => {
    const group = groups.get(label);
    if (group === undefined) return [];
    return [{ label, types: [...group.values()].sort((a, b) => a.name.localeCompare(b.name)) }];
  });
}
