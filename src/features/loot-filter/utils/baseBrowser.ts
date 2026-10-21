import type { BaseItem, BasesBundle, ItemTypeInfo, TypesBundle } from '@/features/game-data/engine/schema';
import { formatRange, formatSocketCaps } from '@/features/game-data/utils/format';
import { buildTypeGroups } from '@/features/game-data/utils/typeGroups';

/** The base browser's model: type groups → types → family rows (normal / exceptional / elite) or a plain list. */

export type BaseTier = BaseItem['tier'];
export type TierColumn = Exclude<BaseTier, 'mythical'>;

export const TIER_COLUMNS: readonly TierColumn[] = ['normal', 'exceptional', 'elite'];

export interface BrowserBase {
  readonly code: string;
  readonly name: string;
  readonly tier: BaseTier;
  /** One line: damage or defense, block, speed, requirements, max sockets, quality level. */
  readonly stats: string;
  /** Socket caps per item level band (`formatSocketCaps`), for a tooltip. */
  readonly sockets: string;
  /** Lowercased name, code and type name + code. */
  readonly search: string;
}

/** One family: the normal, exceptional and elite member (null where the family has none in the bundle). */
export interface BrowserRow {
  readonly key: string;
  readonly cells: Readonly<Record<TierColumn, BrowserBase | null>>;
}

export interface BrowserType {
  readonly code: string;
  readonly name: string;
  /** `tiers`: family rows plus the mythical bases; `list`: types without exceptional or elite bases (accessories, quivers…). */
  readonly layout: 'tiers' | 'list';
  readonly rows: readonly BrowserRow[];
  readonly mythical: readonly BrowserBase[];
  /** The bases of a `list` type, by quality level. */
  readonly items: readonly BrowserBase[];
}

export interface BrowserGroup {
  readonly label: string;
  readonly types: readonly BrowserType[];
}

export interface BaseBrowserModel {
  readonly groups: readonly BrowserGroup[];
  /** Every base code in display order (group, type, family row, tier). */
  readonly codes: readonly string[];
}

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

function toBrowserBase(base: BaseItem, typeByCode: ReadonlyMap<string, ItemTypeInfo>): BrowserBase {
  const type = typeByCode.get(base.type);
  return {
    code: base.code,
    name: base.name,
    tier: base.tier,
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

export function buildBaseBrowserModel(bases: readonly BaseItem[], types: readonly ItemTypeInfo[]): BaseBrowserModel {
  const typeByCode = new Map(types.map((type) => [type.code, type]));
  const toBase = (base: BaseItem) => toBrowserBase(base, typeByCode);

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
        const items = [...typeRows.map(firstCell), ...mythical].sort(byQlvl).map(toBase);
        if (items.length === 0) return [];
        codes.push(...items.map((item) => item.code));
        return [{ code: type.code, name: type.name, layout: 'list', rows: [], mythical: [], items }];
      }
      const browserRows = typeRows.map(
        (row): BrowserRow => ({
          key: row.key,
          cells: {
            normal: row.cells.normal && toBase(row.cells.normal),
            exceptional: row.cells.exceptional && toBase(row.cells.exceptional),
            elite: row.cells.elite && toBase(row.cells.elite),
          },
        })
      );
      const browserMythical = mythical.map(toBase);
      for (const row of browserRows) for (const tier of TIER_COLUMNS) if (row.cells[tier] !== null) codes.push(row.cells[tier].code);
      codes.push(...browserMythical.map((base) => base.code));
      return [{ code: type.code, name: type.name, layout: 'tiers', rows: browserRows, mythical: browserMythical, items: [] }];
    });
    return groupTypes.length === 0 ? [] : [{ label: group.label, types: groupTypes }];
  });
  return { groups, codes };
}

// One model per loaded bundle pair (the bundles are cached for the page's lifetime).
let cached: { bases: BasesBundle; types: TypesBundle; model: BaseBrowserModel } | null = null;

export function getBaseBrowserModel(bases: BasesBundle, types: TypesBundle): BaseBrowserModel {
  if (cached?.bases !== bases || cached.types !== types) {
    cached = { bases, types, model: buildBaseBrowserModel(bases.bases, types.types) };
  }
  return cached.model;
}

// --- Search ---

function searchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

const matchesAll = (text: string, terms: readonly string[]) => terms.every((term) => text.includes(term));

/**
 * The groups with only the rows and bases matching every term of `query` (in a family's names, codes or type name);
 * empty types and groups are dropped. An empty query returns the groups unchanged.
 */
export function filterBaseBrowser(groups: readonly BrowserGroup[], query: string): readonly BrowserGroup[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return groups;
  return groups.flatMap((group): BrowserGroup[] => {
    const types = group.types.flatMap((type): BrowserType[] => {
      const rows = type.rows.filter((row) => matchesAll(TIER_COLUMNS.map((tier) => row.cells[tier]?.search ?? '').join(' '), terms));
      const mythical = type.mythical.filter((base) => matchesAll(base.search, terms));
      const items = type.items.filter((base) => matchesAll(base.search, terms));
      if (rows.length + mythical.length + items.length === 0) return [];
      return [{ ...type, rows, mythical, items }];
    });
    return types.length === 0 ? [] : [{ ...group, types }];
  });
}

// --- Selection ---

/** The codes of a type's (visible) bases, optionally of one tier only. */
export function typeCodes(type: BrowserType, tier?: BaseTier): string[] {
  const codes: string[] = [];
  for (const row of type.rows) {
    for (const column of TIER_COLUMNS) {
      const cell = row.cells[column];
      if (cell !== null && (tier === undefined || tier === column)) codes.push(cell.code);
    }
  }
  for (const base of [...type.mythical, ...type.items]) if (tier === undefined || base.tier === tier) codes.push(base.code);
  return codes;
}

export function groupCodes(group: BrowserGroup, tier?: BaseTier): string[] {
  return group.types.flatMap((type) => typeCodes(type, tier));
}

export function allCodes(groups: readonly BrowserGroup[], tier?: BaseTier): string[] {
  return groups.flatMap((group) => groupCodes(group, tier));
}

export type TriState = 'all' | 'some' | 'none';

/** Whether all, some or none of `codes` are selected (`none` for no codes). */
export function triState(codes: readonly string[], selected: ReadonlySet<string>): TriState {
  const count = codes.filter((code) => selected.has(code)).length;
  if (count === 0) return 'none';
  return count === codes.length ? 'all' : 'some';
}

/** A new set with `codes` added (`on`) or removed. */
export function toggleCodes(selected: ReadonlySet<string>, codes: readonly string[], on: boolean): Set<string> {
  const next = new Set(selected);
  for (const code of codes) {
    if (on) next.add(code);
    else next.delete(code);
  }
  return next;
}

/** The draft for `values`: the codes the browser lists. */
export function initialBrowserSelection(values: readonly string[], knownCodes: readonly string[]): Set<string> {
  const known = new Set(knownCodes);
  return new Set(values.filter((value) => known.has(value)));
}

/**
 * The picker's new values: `values` without the browser's codes the draft dropped (codes the browser does not list
 * are always kept, in place), then the draft's new codes in `knownCodes` order.
 */
export function applyBrowserSelection(values: readonly string[], knownCodes: readonly string[], draft: ReadonlySet<string>): string[] {
  const known = new Set(knownCodes);
  const kept = values.filter((value) => !known.has(value) || draft.has(value));
  const present = new Set(kept);
  return [...kept, ...knownCodes.filter((code) => draft.has(code) && !present.has(code))];
}
