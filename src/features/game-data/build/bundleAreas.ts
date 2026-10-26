/**
 * areas.json: the areas of levels.txt with their expansion monster level, density and unique packs per difficulty,
 * waypoint, endgame map tier and boss, and connections (Vis0–Vis7). See docs/features/GAME-DATA.md "Areas".
 *
 * Left out: the null row (Id 0), the Expansion marker (dropped by the parser) and the map entrances (`Name` contains
 * "Prep Zone"). Towns stay (they have waypoints) with no monster level.
 */
import type { Area, AreasBundle, PerDifficulty } from '../engine/schema.ts';
import type { BuildResult } from './bundleTypes.ts';
import { resolveName } from './itemNames.ts';
import { parseTsv, type TsvRow } from './tsv.ts';

/** "Tier 3 Map - Twisted Maze" → tier 3, rest "Twisted Maze" */
const TIER_PREFIX = /^Tier (\d+) Map - (.*)$/;
const UNIQUE_MAP_PREFIX = /^Unique Map - (.*)$/;
const ACT_PREFIX = /^Act \d+ - /;
const PREP_ZONE = 'Prep Zone';
/** `Waypoint` of an area without one */
const NO_WAYPOINT = 255;
/** The comment column naming the boss of a map boss arena (the parser drops `*` columns, so it is read from the raw text) */
const MAP_BOSS_COLUMN = '*Map Boss';
const DIFFICULTY_SUFFIXES = ['', '(N)', '(H)'] as const;
const MONSTER_COLUMN_COUNT = 25;

/** Fixed monster level of the endgame maps per tier: 100, 102, 104, 106, 108 */
export const mapTierLevel = (tier: number) => 100 + 2 * (tier - 1);

export interface AreasInput {
  /** Raw levels.txt (the `*Map Boss` comment column is read from it too) */
  levelsText: string;
  strings: ReadonlyMap<string, string>;
}

export interface AreasBuildResult extends BuildResult<AreasBundle> {
  /** Rows left out: map entrances (Prep Zone) and the null row */
  hidden: { prepZones: number; other: number };
  /** Rows whose unique packs were re-read mins-then-maxes (rows with an inverted pair) */
  uniquesMinsThenMaxes: number;
}

type UniquePacks = PerDifficulty<[number, number]>;
const inverted = (packs: UniquePacks) => packs.some(([min, max]) => min > max);

/**
 * The six MonUMin / MonUMax values. The header pairs them per difficulty (`MonUMin, MonUMax, MonUMin(N), …`) and the
 * ESR map rows follow it (30 40 30 40 30 40), but 61 older rows have an inverted Nightmare pair (2 4 6 5 8 10); those
 * values are ESR's own, not vanilla, and read as mins 2/4/6, maxes 5/8/10 they become consistent. Read pairwise; when
 * a pair is inverted, re-read the row mins then maxes; when that is inverted too, keep the pairwise values (`ok` false: the caller warns).
 */
export function readUniquePacks(values: readonly [number, number, number, number, number, number]): {
  packs: UniquePacks;
  minsThenMaxes: boolean;
  ok: boolean;
} {
  const [a, b, c, d, e, f] = values;
  const pairwise: UniquePacks = [
    [a, b],
    [c, d],
    [e, f],
  ];
  if (!inverted(pairwise)) return { packs: pairwise, minsThenMaxes: false, ok: true };
  const minsThenMaxes: UniquePacks = [
    [a, d],
    [b, e],
    [c, f],
  ];
  if (!inverted(minsThenMaxes)) return { packs: minsThenMaxes, minsThenMaxes: true, ok: true };
  return { packs: pairwise, minsThenMaxes: false, ok: false };
}

/** Values of a comment column by 1-based line number (TsvRow.line) */
function commentColumn(text: string, column: string): Map<number, string> {
  const lines = text.split(/\r?\n/);
  const index = (lines[0] ?? '').split('\t').findIndex((name) => name.trim() === column);
  const values = new Map<number, string>();
  if (index < 0) return values;
  lines.forEach((line, i) => {
    const value = line.split('\t')[index]?.trim() ?? '';
    if (i > 0 && value !== '') values.set(i + 1, value);
  });
  return values;
}

const perDifficulty = <T>(read: (suffix: string) => T): PerDifficulty<T> => [
  read(DIFFICULTY_SUFFIXES[0]),
  read(DIFFICULTY_SUFFIXES[1]),
  read(DIFFICULTY_SUFFIXES[2]),
];

function hasMonsterColumns(row: TsvRow): boolean {
  return ['mon', 'nmon', 'umon'].some((prefix) =>
    Array.from({ length: MONSTER_COLUMN_COUNT }, (_, i) => `${prefix}${String(i + 1)}`).some(
      (column) => row.has(column) && row.str(column) !== ''
    )
  );
}

export function buildAreasBundle({ levelsText, strings }: AreasInput): AreasBuildResult {
  const warnings: string[] = [];
  const table = parseTsv(levelsText, 'levels.txt');
  const bosses = commentColumn(levelsText, MAP_BOSS_COLUMN);
  const rows = table.rows.filter((row) => row.str('Id') !== '');
  const hidden = { prepZones: 0, other: 0 };
  let uniquesMinsThenMaxes = 0;

  const listed = rows.filter((row) => {
    if (row.str('Name').includes(PREP_ZONE)) {
      hidden.prepZones++;
      return false;
    }
    if (row.num('Id') === 0) {
      hidden.other++;
      return false;
    }
    return true;
  });
  const listedIds = new Set(listed.map((row) => row.num('Id')));
  const allIds = new Set(rows.map((row) => row.num('Id')));

  const areas = listed.map((row): Area => {
    const id = row.num('Id');
    const internal = row.str('Name');
    const label = `levels.txt ${String(id)} (${internal})`;
    const levelName = row.str('LevelName');
    const name = resolveName(strings, levelName, internal.replace(ACT_PREFIX, ''));

    const tierMatch = TIER_PREFIX.exec(internal);
    const uniqueMatch = UNIQUE_MAP_PREFIX.exec(internal);
    const tier = tierMatch === null ? undefined : Number(tierMatch[1]);
    let group: string | undefined;
    if (tier !== undefined) {
      const groupMatch = TIER_PREFIX.exec(row.str('LevelGroup'));
      group = groupMatch?.[2] ?? tierMatch?.[2];
      if (groupMatch !== null && Number(groupMatch[1]) !== tier)
        warnings.push(`areas: ${label} is tier ${String(tier)} but its LevelGroup "${row.str('LevelGroup')}" says tier ${groupMatch[1]}`);
    } else if (uniqueMatch !== null) {
      group = uniqueMatch[1];
    }

    const boss = bosses.get(row.line);
    const rawLevel = perDifficulty((suffix) => row.num(`MonLvlEx${suffix}`));
    const density = perDifficulty((suffix) => row.num(`MonDen${suffix}`));
    const read = readUniquePacks(
      // In header order: MonUMin, MonUMax, MonUMin(N), MonUMax(N), MonUMin(H), MonUMax(H)
      [row.num('MonUMin'), row.num('MonUMax'), row.num('MonUMin(N)'), row.num('MonUMax(N)'), row.num('MonUMin(H)'), row.num('MonUMax(H)')]
    );
    const uniques = read.packs;
    if (read.minsThenMaxes) uniquesMinsThenMaxes++;
    if (!read.ok) warnings.push(`areas: ${label} unique packs have min > max read pairwise and mins then maxes; kept pairwise`);
    const hasDensity = density.some((value) => value > 0);
    const hasUniques = uniques.some(([min, max]) => min > 0 || max > 0);
    // A row with no monster columns, density, unique packs or boss (towns, Dimensional Gate, map entrances) has no level
    const hasMonsters = hasMonsterColumns(row) || hasDensity || hasUniques || boss !== undefined;
    const level = rawLevel.some((value) => value > 0) && hasMonsters ? rawLevel : null;

    if (tier !== undefined && level !== null && level.some((value) => value !== mapTierLevel(tier)))
      warnings.push(
        `areas: ${label} is tier ${String(tier)} (level ${String(mapTierLevel(tier))}) but has monster level ${level.join('/')}`
      );

    const connections: number[] = [];
    for (let i = 0; i < 8; i++) {
      const target = row.num(`Vis${String(i)}`);
      if (target === 0 || target === id || connections.includes(target)) continue;
      if (!allIds.has(target)) warnings.push(`areas: ${label} Vis${String(i)} names unknown level ${String(target)}`);
      if (listedIds.has(target)) connections.push(target);
    }

    const waypoint = row.str('Waypoint');
    return {
      id,
      name,
      act: row.num('Act'),
      ...(group === undefined ? {} : { group }),
      ...(tier === undefined ? {} : { tier }),
      ...(uniqueMatch === null ? {} : { uniqueMap: true as const }),
      ...(boss === undefined ? {} : { boss }),
      waypoint: waypoint !== '' && Number(waypoint) !== NO_WAYPOINT,
      level,
      density: hasDensity ? density : null,
      uniques: hasUniques ? uniques : null,
      connections,
      ...(row.num('PreventTownPortal') === 0 ? {} : { preventTownPortal: true as const }),
    };
  });

  return { bundle: { areas }, warnings, hidden, uniquesMinsThenMaxes };
}
