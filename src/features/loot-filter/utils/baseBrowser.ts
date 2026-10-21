import { BASE_TIER_LABELS } from '@/features/game-data/constants/bases';
import type { BaseItem, BasesBundle, ItemTypeInfo, TypesBundle } from '@/features/game-data/engine/schema';
import { formatRange, formatSocketCaps } from '@/features/game-data/utils/format';
import { buildTypeGroups } from '@/features/game-data/utils/typeGroups';
import {
  displayCodes,
  type BaseTier,
  type BrowserColumn,
  type BrowserGroup,
  type BrowserItem,
  type BrowserModel,
  type BrowserType,
} from './browserModel';

/** The Bases tab of the item browser: type groups → types → family rows (normal / exceptional / elite) or a plain list. */

export type TierColumn = Exclude<BaseTier, 'mythical'>;

export const TIER_COLUMNS: readonly TierColumn[] = ['normal', 'exceptional', 'elite'];

const tierColumn = (tier: BaseTier): BrowserColumn => ({ key: tier, label: BASE_TIER_LABELS[tier], tier });

/** One column per tier; the column key is the tier (`allCodes(groups, 'elite')`). */
const TIER_COLUMN: Readonly<Record<BaseTier, BrowserColumn>> = {
  normal: tierColumn('normal'),
  exceptional: tierColumn('exceptional'),
  elite: tierColumn('elite'),
  mythical: tierColumn('mythical'),
};

/** The grid columns of a tiered type, in `TIER_COLUMNS` order. */
export const BASE_COLUMNS: readonly BrowserColumn[] = TIER_COLUMNS.map((tier) => TIER_COLUMN[tier]);

const DEFAULT_THRESHOLDS: ItemTypeInfo['thresholds'] = [25, 40];

function statLine(base: BaseItem): string {
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
  return parts.join(' · ');
}

function toBrowserItem(base: BaseItem, typeByCode: ReadonlyMap<string, ItemTypeInfo>): BrowserItem {
  const type = typeByCode.get(base.type);
  return {
    code: base.code,
    name: base.name,
    column: TIER_COLUMN[base.tier],
    stats: statLine(base),
    sockets: formatSocketCaps(base.socketCaps, type?.thresholds ?? DEFAULT_THRESHOLDS),
    search: [base.name, base.code, type?.name ?? '', base.type].join(' ').toLowerCase(),
  };
}

const byQlvl = (a: { qlvl: number; name: string }, b: { qlvl: number; name: string }) => a.qlvl - b.qlvl || a.name.localeCompare(b.name);

interface RowDraft {
  key: string;
  cells: Record<TierColumn, BaseItem | null>;
}

function firstCell(row: RowDraft): BaseItem {
  const first = row.cells.normal ?? row.cells.exceptional ?? row.cells.elite;
  if (first === null) throw new Error(`Empty family row ${row.key}`);
  return first;
}

export function buildBaseBrowserModel(bases: readonly BaseItem[], types: readonly ItemTypeInfo[]): BrowserModel {
  const typeByCode = new Map(types.map((type) => [type.code, type]));
  const toItem = (base: BaseItem) => toBrowserItem(base, typeByCode);

  // Family rows: a base sits in its family's row when it is the family member of its own tier; any other base (a
  // duplicate of a member, a self-referential normal base) gets a row of its own.
  const rows = new Map<string, RowDraft>();
  const mythicalByType = new Map<string, BaseItem[]>();
  for (const base of bases) {
    if (base.tier === 'mythical') {
      mythicalByType.set(base.type, [...(mythicalByType.get(base.type) ?? []), base]);
      continue;
    }
    const slot = TIER_COLUMNS.indexOf(base.tier);
    const key = base.family[slot] === base.code ? base.family.join(',') : `${base.code}:own`;
    const row = rows.get(key) ?? { key, cells: { normal: null, exceptional: null, elite: null } };
    if (row.cells[base.tier] === null) {
      row.cells[base.tier] = base;
      rows.set(key, row);
    } else {
      rows.set(`${base.code}:own`, { key: `${base.code}:own`, cells: { normal: null, exceptional: null, elite: null, [base.tier]: base } });
    }
  }

  // A row belongs to the type of its lowest-tier member (claw families span two types).
  const rowsByType = new Map<string, RowDraft[]>();
  for (const row of rows.values()) {
    const type = firstCell(row).type;
    rowsByType.set(type, [...(rowsByType.get(type) ?? []), row]);
  }

  const seen = new Set<string>();
  const codes: string[] = [];
  const groups = buildTypeGroups(bases, types).flatMap((group): BrowserGroup[] => {
    const groupTypes = group.types.flatMap((type): BrowserType[] => {
      if (seen.has(type.code)) return [];
      seen.add(type.code);
      const typeRows = (rowsByType.get(type.code) ?? []).sort((a, b) => byQlvl(firstCell(a), firstCell(b)));
      const mythical = (mythicalByType.get(type.code) ?? []).sort(byQlvl);
      const tiered = typeRows.some((row) => row.cells.exceptional !== null || row.cells.elite !== null);
      if (!tiered) {
        const items = [...typeRows.map(firstCell), ...mythical].sort(byQlvl).map(toItem);
        if (items.length === 0) return [];
        const listType: BrowserType = { ...emptyType(type.code, type.name), layout: 'list', items };
        codes.push(...displayCodes(listType));
        return [listType];
      }
      const gridType: BrowserType = {
        ...emptyType(type.code, type.name),
        layout: 'grid',
        columns: BASE_COLUMNS,
        rows: typeRows.map((row) => ({ key: row.key, cells: TIER_COLUMNS.map((tier) => row.cells[tier] && toItem(row.cells[tier])) })),
        extras: mythical.map(toItem),
        extrasColumn: TIER_COLUMN.mythical,
      };
      codes.push(...displayCodes(gridType));
      return [gridType];
    });
    return groupTypes.length === 0 ? [] : [{ label: group.label, types: groupTypes }];
  });
  return { groups, codes };
}

function emptyType(code: string, name: string): BrowserType {
  return { code, name, layout: 'list', columns: [], rows: [], extras: [], extrasColumn: null, items: [] };
}

// One model per loaded bundle pair (the bundles are cached for the page's lifetime).
let cached: { bases: BasesBundle; types: TypesBundle; model: BrowserModel } | null = null;

export function getBaseBrowserModel(bases: BasesBundle, types: TypesBundle): BrowserModel {
  if (cached?.bases !== bases || cached.types !== types) {
    cached = { bases, types, model: buildBaseBrowserModel(bases.bases, types.types) };
  }
  return cached.model;
}
