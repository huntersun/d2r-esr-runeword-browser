import type { BaseItem, ItemTypeInfo } from '../engine/schema';
import type { BaseTier } from '../constants/bases';
import { formatRange } from './format';
import { buildTypeGroups } from './typeGroups';

/**
 * Base families (normal / exceptional / elite): type groups → types → family rows plus the type's mythical bases.
 * Shared by the Bases page families view and the loot-filter base browser.
 */

export type FamilyTier = Exclude<BaseTier, 'mythical'>;

export const FAMILY_TIERS: readonly FamilyTier[] = ['normal', 'exceptional', 'elite'];

/** One family: its members by tier (null where it has none). A base outside a proper family gets a row of its own. */
export interface BaseFamilyRow {
  readonly key: string;
  readonly cells: Readonly<Record<FamilyTier, BaseItem | null>>;
}

export interface BaseFamilyType {
  readonly code: string;
  readonly name: string;
  /** Rows by the quality level of their lowest-tier member */
  readonly rows: readonly BaseFamilyRow[];
  /** Mythical bases of the type (their family codes are their own code), by quality level */
  readonly mythical: readonly BaseItem[];
}

export interface BaseFamilyGroup {
  readonly label: string;
  readonly types: readonly BaseFamilyType[];
}

/** The row's lowest-tier member. */
export function familyHead(row: BaseFamilyRow): BaseItem {
  const first = row.cells.normal ?? row.cells.exceptional ?? row.cells.elite;
  if (first === null) throw new Error(`Empty family row ${row.key}`);
  return first;
}

export function familyMembers(row: BaseFamilyRow): BaseItem[] {
  return FAMILY_TIERS.flatMap((tier) => row.cells[tier] ?? []);
}

/** A real family has at least two members; a single-member row is a base without a family. */
export function isFamilyRow(row: BaseFamilyRow): boolean {
  return familyMembers(row).length > 1;
}

/** The stats a player compares between bases: damage or defense, block, speed, requirements, max sockets, qlvl. */
export function baseStatParts(base: BaseItem): string[] {
  const parts: string[] = [];
  if (base.dmg1 !== null) parts.push(`1H ${formatRange(base.dmg1)}`);
  if (base.dmg2 !== null) parts.push(`2H ${formatRange(base.dmg2)}`);
  if (base.throwDmg !== null) parts.push(`Throw ${formatRange(base.throwDmg)}`);
  if (base.def !== null) parts.push(`Def ${formatRange(base.def)}`);
  if (base.block !== null) parts.push(`Block ${String(base.block)}%`);
  if (base.kind === 'weapon') parts.push(`Speed ${String(base.speed)}`);
  if (base.reqLvl > 0) parts.push(`Lvl ${String(base.reqLvl)}`);
  if (base.reqStr > 0) parts.push(`Str ${String(base.reqStr)}`);
  if (base.reqDex > 0) parts.push(`Dex ${String(base.reqDex)}`);
  const maxSockets = Math.max(...base.socketCaps);
  if (maxSockets > 0) parts.push(`${String(maxSockets)} os`);
  parts.push(`qlvl ${String(base.qlvl)}`);
  return parts;
}

export function baseStatLine(base: BaseItem): string {
  return baseStatParts(base).join(' · ');
}

const byQlvl = (a: BaseItem, b: BaseItem) => a.qlvl - b.qlvl || a.name.localeCompare(b.name);

type MutableCells = Record<FamilyTier, BaseItem | null>;

const ownRow = (base: BaseItem, tier: FamilyTier) => {
  const cells: MutableCells = { normal: null, exceptional: null, elite: null };
  cells[tier] = base;
  return { key: `${base.code}:own`, cells };
};

/**
 * Groups and types like the item-type picker (`buildTypeGroups`; a type listed in two groups only shows in the first).
 * A base sits in its family's row when it is the family member of its own tier; any other base (a duplicate of a member
 * such as `q86`, a base missing from its own family such as `qdf`, an accessory) gets a row of its own. A row belongs to
 * the type of its lowest-tier member, so the claw families spanning `h2h1`/`h2h2` stay one row. Empty types are dropped.
 */
export function buildBaseFamilies(bases: readonly BaseItem[], types: readonly ItemTypeInfo[]): BaseFamilyGroup[] {
  const rows = new Map<string, { key: string; cells: MutableCells }>();
  const mythicalByType = new Map<string, BaseItem[]>();
  for (const base of bases) {
    if (base.tier === 'mythical') {
      mythicalByType.set(base.type, [...(mythicalByType.get(base.type) ?? []), base]);
      continue;
    }
    const slot = FAMILY_TIERS.indexOf(base.tier);
    const key = base.family[slot] === base.code ? base.family.join(',') : `${base.code}:own`;
    const row = rows.get(key);
    if (row === undefined) {
      rows.set(key, { key, cells: ownRow(base, base.tier).cells });
    } else if (row.cells[base.tier] === null) {
      row.cells[base.tier] = base;
    } else {
      const own = ownRow(base, base.tier);
      rows.set(own.key, own);
    }
  }

  const rowsByType = new Map<string, BaseFamilyRow[]>();
  for (const row of rows.values()) {
    const type = familyHead(row).type;
    rowsByType.set(type, [...(rowsByType.get(type) ?? []), row]);
  }

  const seen = new Set<string>();
  return buildTypeGroups(bases, types).flatMap((group): BaseFamilyGroup[] => {
    const groupTypes = group.types.flatMap((type): BaseFamilyType[] => {
      if (seen.has(type.code)) return [];
      seen.add(type.code);
      const typeRows = (rowsByType.get(type.code) ?? []).sort((a, b) => byQlvl(familyHead(a), familyHead(b)));
      const mythical = (mythicalByType.get(type.code) ?? []).sort(byQlvl);
      if (typeRows.length === 0 && mythical.length === 0) return [];
      return [{ code: type.code, name: type.name, rows: typeRows, mythical }];
    });
    return groupTypes.length === 0 ? [] : [{ label: group.label, types: groupTypes }];
  });
}
