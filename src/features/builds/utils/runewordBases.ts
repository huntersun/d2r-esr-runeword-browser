import type { Runeword } from '@/core/db';
import { fitsItemTypes } from '@/features/game-data/engine/bestBase';
import { htmRunewordId, matchRunewords, rowsForSockets } from '@/features/game-data/engine/matchRunewords';
import { maxSockets } from '@/features/game-data/utils/filterBases';
import type { BaseItem, BasesBundle, TxtRunewordRow, TxtRunewordsBundle, TypesBundle } from '@/features/game-data/engine/schema';

export interface RunewordBaseBundles {
  readonly bases: BasesBundle;
  readonly types: TypesBundle;
  readonly runewords: TxtRunewordsBundle;
}

export interface RunewordBaseCandidates {
  /** The txt rows the runeword matched, narrowed to its socket count/range (empty when unmatched) */
  readonly rows: readonly TxtRunewordRow[];
  /** Bases the runeword can be made in; every weapon/armour base when unmatched */
  readonly candidates: readonly BaseItem[];
  /** True when the recipe could not be matched to the game files (the picker then offers a free search) */
  readonly unmatched: boolean;
}

const TIER_ORDER: Readonly<Record<BaseItem['tier'], number>> = { normal: 0, exceptional: 1, elite: 2, mythical: 3 };

export function typeNameMap(types: TypesBundle): Map<string, string> {
  return new Map(types.types.map((type) => [type.code, type.name]));
}

/** Sorted by type name, then tier (normal → exceptional → elite → mythical), then name. */
function sortBases(bases: readonly BaseItem[], typeNames: ReadonlyMap<string, string>): BaseItem[] {
  const typeName = (base: BaseItem) => typeNames.get(base.type) ?? base.type;
  return [...bases].sort(
    (a, b) => typeName(a).localeCompare(typeName(b)) || TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.name.localeCompare(b.name)
  );
}

/** Every weapon / armour base (no misc items), sorted: the free search when a recipe is not matched. */
export function allGearBases(bundles: Pick<RunewordBaseBundles, 'bases' | 'types'>): BaseItem[] {
  return sortBases(
    bundles.bases.bases.filter((base) => base.kind !== 'misc'),
    typeNameMap(bundles.types)
  );
}

/**
 * The txt rows of an HTM runeword and the bases it can be made in. Matching reuses the
 * Best Base engine (`matchRunewords` with the type-name tie-break, then `rowsForSockets`);
 * `sameName` should hold every local runeword with the runeword's name (the name-only
 * matching pass checks that all of them share one recipe). A base qualifies when it fits a
 * row's item types (`fitsItemTypes`) and can have at least the row's socket count.
 */
export function runewordBaseCandidates(
  runeword: Runeword,
  bundles: RunewordBaseBundles,
  sameName: readonly Runeword[] = [runeword]
): RunewordBaseCandidates {
  const typeNames = typeNameMap(bundles.types);
  const gearBases = bundles.bases.bases.filter((base) => base.kind !== 'misc');
  const htm = sameName.some((other) => htmRunewordId(other) === htmRunewordId(runeword)) ? sameName : [...sameName, runeword];
  const match = matchRunewords(htm, bundles.runewords, { typeNames }).byHtm.get(htmRunewordId(runeword));
  if (match === undefined) return { rows: [], candidates: allGearBases(bundles), unmatched: true };

  const socketRows = rowsForSockets(match.rows, runeword);
  const rows = socketRows.length > 0 ? socketRows : match.rows;
  const candidates = gearBases.filter((base) => rowsForBase(rows, base).length > 0);
  return { rows, candidates: sortBases(candidates, typeNames), unmatched: false };
}

/** The rows a chosen base can hold (item types fit and the base can have the row's socket count). */
export function rowsForBase(rows: readonly TxtRunewordRow[], base: BaseItem): TxtRunewordRow[] {
  return rows.filter((row) => fitsItemTypes(base, row) && maxSockets(base) >= row.sockets);
}

/** "Monarch · Shield · 4 sockets · Req Str 156 · Req Lvl 54" (max sockets of the base; zero requirements left out). */
export function baseSummary(base: BaseItem, typeNames: ReadonlyMap<string, string>): string {
  const sockets = maxSockets(base);
  return [
    base.name,
    typeNames.get(base.type) ?? base.type,
    `${String(sockets)} socket${sockets === 1 ? '' : 's'}`,
    base.reqStr > 0 ? `Req Str ${String(base.reqStr)}` : null,
    base.reqDex > 0 ? `Req Dex ${String(base.reqDex)}` : null,
    base.reqLvl > 0 ? `Req Lvl ${String(base.reqLvl)}` : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');
}
