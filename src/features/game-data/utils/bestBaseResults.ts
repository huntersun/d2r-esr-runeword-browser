import type { ItemTypeInfo, TxtRuneword, TxtRunewordRow } from '../engine/schema';
import {
  findEligibleBases,
  fitsItemTypes,
  groupByType,
  rankBases,
  type EligibleBase,
  type FindEligibleBasesInput,
} from '../engine/bestBase';
import { rowsForSockets, type HtmRunewordLike, type MatchQuality, type RunewordMatch } from '../engine/matchRunewords';
import { minIlvlForSockets } from '../engine/sockets';
import { BASE_KINDS } from '../constants/bases';

const JEWEL_LABELS: Readonly<Record<string, readonly [string, string]>> = {
  jew: ['Jewel', 'Jewels'],
  mjw: ['Mythical Jewel', 'Mythical Jewels'],
};

/** "1 Jewel", "2 Mythical Jewels", "1 Jewel + 1 Mythical Jewel"; '' when the row takes no jewels. */
export function jewelLabel(row: Pick<TxtRunewordRow, 'codes'>): string {
  return Object.entries(JEWEL_LABELS)
    .map(([code, [one, many]]) => {
      const count = row.codes.filter((entry) => entry === code).length;
      return count === 0 ? '' : `${String(count)} ${count === 1 ? one : many}`;
    })
    .filter(Boolean)
    .join(' + ');
}

export interface SocketOption {
  readonly sockets: number;
  /** Distinct jewel requirements of the rows with this socket count ('' = none) */
  readonly jewels: readonly string[];
  readonly reqLvl: number;
}

/**
 * One entry per socket count (ascending): ranged recipes have a row per socket count for Jewel and another for
 * Mythical Jewel, which would otherwise show up as duplicate cards.
 */
export function collapseRowsBySockets(rows: readonly TxtRunewordRow[]): SocketOption[] {
  const bySockets = new Map<number, { jewels: Set<string>; reqLvl: number }>();
  for (const row of rows) {
    const entry = bySockets.get(row.sockets) ?? { jewels: new Set<string>(), reqLvl: row.reqLvl };
    entry.jewels.add(jewelLabel(row));
    entry.reqLvl = Math.min(entry.reqLvl, row.reqLvl);
    bySockets.set(row.sockets, entry);
  }
  return [...bySockets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([sockets, entry]) => ({ sockets, jewels: [...entry.jewels], reqLvl: entry.reqLvl }));
}

/** "4 sockets (1 Jewel or 1 Mythical Jewel)", "2 sockets". */
export function formatSocketOption(option: SocketOption): string {
  const jewels = option.jewels.filter(Boolean);
  const label = `${String(option.sockets)} socket${option.sockets === 1 ? '' : 's'}`;
  return jewels.length === 0 ? label : `${label} (${jewels.join(' or ')})`;
}

export interface RejectionSummary {
  readonly total: number;
  /** Bases whose item type takes the runeword */
  readonly typeFit: number;
  /** …that can also have the socket count */
  readonly socketFit: number;
  /** …that the character's class may use */
  readonly classFit: number;
  /** …whose level/Str/Dex requirements the character meets */
  readonly usable: number;
}

/** Funnel counts explaining why few or no bases qualify. */
export function summariseRejections(input: FindEligibleBasesInput): RejectionSummary {
  const typed = input.bases.filter((base) => input.rows.some((row) => fitsItemTypes(base, row)));
  const socketed = typed.filter((base) => {
    const thresholds = input.types.get(base.type)?.thresholds;
    return (
      thresholds !== undefined &&
      input.rows.some((row) => fitsItemTypes(base, row) && minIlvlForSockets(base, row.sockets, thresholds) !== null)
    );
  });
  const eligible = findEligibleBases({ ...input, options: { ...input.options, includeUnusable: true } });
  return {
    total: input.bases.length,
    typeFit: typed.length,
    socketFit: socketed.length,
    classFit: eligible.length,
    usable: eligible.filter((result) => result.usable).length,
  };
}

export interface BaseGroup {
  readonly type: string;
  readonly name: string;
  readonly results: EligibleBase[];
}

/** Ranked per kind (weapons, armor, accessories), then grouped by type; groups ordered by their best base. */
export function buildBaseGroups(results: readonly EligibleBase[], types: ReadonlyMap<string, ItemTypeInfo>): BaseGroup[] {
  const groups: BaseGroup[] = [];
  for (const kind of BASE_KINDS) {
    const ranked = rankBases(
      results.filter((entry) => entry.base.kind === kind),
      kind
    );
    for (const [type, list] of groupByType(ranked)) groups.push({ type, name: types.get(type)?.name ?? type, results: list });
  }
  return groups;
}

export type TxtSource =
  | { readonly kind: 'override'; readonly runeword: TxtRuneword; readonly rows: TxtRunewordRow[] }
  | { readonly kind: 'match'; readonly match: RunewordMatch; readonly quality: MatchQuality; readonly rows: TxtRunewordRow[] }
  | { readonly kind: 'none'; readonly rows: readonly [] };

/**
 * Txt rows used for the selected HTM runeword: a manual pick wins, else the match. Rows are narrowed to the HTM
 * socket range when any fall into it (otherwise all rows are used).
 */
export function resolveTxtSource(
  htm: Pick<HtmRunewordLike, 'sockets' | 'socketsMax'>,
  match: RunewordMatch | undefined,
  override: TxtRuneword | undefined
): TxtSource {
  const narrow = (rows: readonly TxtRunewordRow[]) => {
    const inRange = rowsForSockets(rows, htm);
    return inRange.length > 0 ? inRange : [...rows];
  };
  if (override !== undefined) return { kind: 'override', runeword: override, rows: narrow(override.rows) };
  if (match !== undefined) return { kind: 'match', match, quality: match.quality, rows: narrow(match.rows) };
  return { kind: 'none', rows: [] };
}

/** "2–6" / "4": distinct socket counts of a txt runeword. */
export function socketRangeLabel(rows: readonly Pick<TxtRunewordRow, 'sockets'>[]): string {
  const counts = rows.map((row) => row.sockets);
  if (counts.length === 0) return '?';
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return min === max ? String(min) : `${String(min)}–${String(max)}`;
}

/** "Ber Jah Ith": ingredient names without the " Rune" suffix. */
export function ingredientSummary(ingredients: readonly string[]): string {
  return ingredients.map((name) => name.replace(/ Rune$/, '')).join(' ');
}

export interface StatBlock {
  /** Socket counts of the rows sharing these lines */
  readonly sockets: number[];
  readonly lines: readonly string[];
}

/** Rendered txt stat lines, one block per distinct line set (usually one: jewel rows share the runeword's stats). */
export function gameFileStats(rows: readonly Pick<TxtRunewordRow, 'sockets' | 'text'>[]): StatBlock[] {
  const blocks = new Map<string, { sockets: number[]; lines: readonly string[] }>();
  for (const row of rows) {
    if (row.text.length === 0) continue;
    const key = row.text.join('\n');
    const block = blocks.get(key) ?? { sockets: [], lines: row.text };
    if (!block.sockets.includes(row.sockets)) block.sockets.push(row.sockets);
    blocks.set(key, block);
  }
  return [...blocks.values()];
}
