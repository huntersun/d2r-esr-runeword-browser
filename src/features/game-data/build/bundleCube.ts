/**
 * cube.json: every enabled cubemain.txt recipe a player can do, grouped into families (the guide's `::recipes`
 * families first, then cube/cubeCatalog.ts, then a fallback by description prefix), without the bookkeeping rows
 * (stockers, blockers, dead rows) and without the corruption / anointment / Vessel tier rows enhance.json covers.
 *
 * Per family the merged rows of the guide (cube/cubeFamilies.ts `groupFamily`, uncapped, with the number of rows
 * each stands for); small families also keep every row with its parsed cells (`recipes`).
 */
import type {
  CubeBundle,
  CubeFamilyInfo,
  CubeGroup,
  CubeHiddenCounts,
  CubeInputKind,
  CubeMergedRow,
  CubeRecipe,
  CubeRecipeInput,
  CubeRecipeOutput,
} from '../engine/schema.ts';
import {
  CUBE_SECTIONS,
  EXTRA_FAMILIES,
  GUIDE_FAMILY_SECTIONS,
  descriptionShape,
  fallbackFamily,
  fallbackPrefix,
  guideFamilyOf,
  hiddenReason,
  STOCKER_ITEM,
  secretNumber,
  type ExtraFamily,
} from './cube/cubeCatalog.ts';
import { CUBE_FAMILIES, groupFamily, type CubeFamily } from './cube/cubeFamilies.ts';
import type { CubeRow, CubeTables } from './cube/cubeRows.ts';
import { bonusLines, describeOutput, formatInput, parseCubeCell } from './cube/cubeText.ts';
import type { TsvTable } from './tsv.ts';

/** Families with at most this many rows keep every row (`recipes`); larger ones only their merged rows */
export const RAW_ROW_LIMIT = 40;

export interface CubeContext {
  tables: CubeTables;
  /** Item type codes (itemtypes.txt), to tell item types from items and unique names */
  typeCodes: ReadonlySet<string>;
  /** itemstatcost.txt row (stat id) → `Stat` name, for the readable conditions */
  statNames: ReadonlyMap<number, string>;
}

export interface CubeBuildResult {
  bundle: CubeBundle;
  /** Rows per fallback family (`other:*`), for the build report */
  fallback: { id: string; rows: number }[];
  warnings: string[];
}

const CLASS_NAMES: Readonly<Partial<Record<string, string>>> = {
  ama: 'Amazon',
  ass: 'Assassin',
  bar: 'Barbarian',
  dru: 'Druid',
  nec: 'Necromancer',
  pal: 'Paladin',
  sor: 'Sorceress',
  war: 'Warlock',
};

const SPECIAL_OUTPUTS = new Set(['useitem', 'usetype', 'cloneitem']);

/** The boss each `kill_check` value stands for, from the Kill Ledger boss rows ("Kill Ledger Rathma" → 99) */
function killCheckNames(rows: readonly CubeRow[], killCheck: number | null): Map<number, string> {
  const names = new Map<number, string>();
  if (killCheck === null) return names;
  for (const row of rows) {
    const boss = /^Kill Ledger (?!Tier )(.+)$/.exec(row.description)?.[1];
    if (boss === undefined || row.condition?.param !== killCheck || names.has(row.condition.value)) continue;
    names.set(row.condition.value, boss);
  }
  return names;
}

/**
 * The conditions a player can read: the class, the minimum difficulty, a recorded boss kill (`kill_check`) and "no
 * added level requirement yet" (`item_levelreq` = 0). The other `op` conditions are hidden markers (forging, dummy
 * rolls, soul counters) and are never shown.
 */
function conditionsOf(row: CubeRow, ctx: CubeContext, bosses: ReadonlyMap<number, string>): string[] {
  const conditions: string[] = [];
  const cls = CLASS_NAMES[row.cls];
  if (cls !== undefined) conditions.push(`${cls} only`);
  if (row.minDiff === 2) conditions.push('Hell only');
  else if (row.minDiff === 1) conditions.push('Nightmare or Hell');
  const condition = row.condition;
  if (condition !== null) {
    const stat = ctx.statNames.get(condition.param);
    if (stat === 'kill_check') {
      const boss = bosses.get(condition.value);
      conditions.push(boss === undefined ? `Needs a recorded boss kill (#${String(condition.value)})` : `Needs a recorded ${boss} kill`);
    } else if (stat === 'item_levelreq' && condition.op === 18 && condition.value === 0) {
      conditions.push('Only items without an added level requirement');
    }
  }
  return conditions;
}

function inputKind(token: string, ctx: CubeContext, itemCodes: ReadonlySet<string>): CubeInputKind {
  if (token === 'any') return 'any';
  if (itemCodes.has(token)) return 'item';
  if (ctx.typeCodes.has(token)) return 'type';
  return 'unique';
}

function recipeInput(spec: string, ctx: CubeContext, itemCodes: ReadonlySet<string>): CubeRecipeInput {
  const cell = parseCubeCell(spec);
  return {
    text: formatInput(spec, ctx.tables),
    code: cell.token,
    qty: cell.qty,
    quals: cell.qualifiers.filter((part) => !part.startsWith('qty=')),
    kind: inputKind(cell.token, ctx, itemCodes),
  };
}

function recipeOutput(output: CubeRow['outputs'][number], ctx: CubeContext): CubeRecipeOutput {
  const { token } = parseCubeCell(output.spec);
  const { name, details } = describeOutput(output, ctx.tables, { bonus: false });
  return { text: name, code: SPECIAL_OUTPUTS.has(token) ? null : token, bonus: bonusLines(output.mods, ctx.tables), details };
}

/** Display names of the unique/set name tokens of the rows' inputs and outputs (distinct, file order) */
function namedItems(rows: readonly CubeRow[], ctx: CubeContext, itemCodes: ReadonlySet<string>): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    for (const spec of [...row.inputs, ...row.outputs.map((output) => output.spec)]) {
      const { token } = parseCubeCell(spec);
      if (SPECIAL_OUTPUTS.has(token) || inputKind(token, ctx, itemCodes) !== 'unique') continue;
      names.add(ctx.tables.nameOf(token));
    }
  }
  return [...names];
}

/** Group label: "Secret Recipe N", else the first row's description shape */
function groupLabel(family: CubeFamily, rows: readonly CubeRow[]): string {
  const first = rows[0]?.description ?? '';
  const secret = family.id === 'secret' ? secretNumber(first) : null;
  return secret === null ? descriptionShape(first) : `Secret Recipe ${String(secret)}`;
}

export interface CubeAssignment {
  /** Family id → the family and its rows, in the order families first got a row */
  assigned: Map<string, { family: CubeFamily; rows: CubeRow[] }>;
  /** The fallback families, in first-row order */
  fallbacks: ExtraFamily[];
  hidden: CubeHiddenCounts;
}

const assignments = new WeakMap<object, CubeAssignment>();

/**
 * Every listed row assigned to the first family that matches it (the guide's, then the cube-only ones, then a fallback
 * by description prefix); hidden rows are counted by reason. Cached per table set (the guide asks once per block).
 */
export function assignCubeRows(tables: Pick<CubeTables, 'cube' | 'items' | 'nameOf'>): CubeAssignment {
  const cached = assignments.get(tables);
  if (cached !== undefined) return cached;
  const hidden: CubeHiddenCounts = { enhance: 0, traps: 0, old: 0, stockers: 0, dummy: 0 };
  const assigned = new Map<string, { family: CubeFamily; rows: CubeRow[] }>();
  const fallbacks = new Map<string, ExtraFamily>();
  const internal = new Map(tables.items.map((item) => [item.code, item.internalName]));
  const isStocker = (spec: string) => {
    const { token } = parseCubeCell(spec);
    return STOCKER_ITEM.test(tables.nameOf(token)) || STOCKER_ITEM.test(internal.get(token) ?? '');
  };
  for (const row of tables.cube) {
    const guide = guideFamilyOf(row);
    const reason = hiddenReason(row, guide !== undefined, row.inputs.some(isStocker));
    if (reason !== null) {
      hidden[reason]++;
      continue;
    }
    let family: CubeFamily | undefined = guide ?? EXTRA_FAMILIES.find((extra) => extra.match.test(row.description));
    if (family === undefined) {
      const prefix = fallbackPrefix(row.description);
      const fallback = fallbacks.get(prefix) ?? fallbackFamily(prefix);
      fallbacks.set(prefix, fallback);
      family = fallback;
    }
    const entry = assigned.get(family.id) ?? { family, rows: [] };
    entry.rows.push(row);
    assigned.set(family.id, entry);
  }
  const result = { assigned, fallbacks: [...fallbacks.values()], hidden };
  assignments.set(tables, result);
  return result;
}

export function buildCubeBundle(ctx: CubeContext): CubeBuildResult {
  const warnings: string[] = [];
  const sectionOf = new Map<string, string>();
  for (const family of CUBE_FAMILIES) {
    const section = GUIDE_FAMILY_SECTIONS[family.id];
    if (section === undefined) warnings.push(`cube: guide family "${family.id}" has no section`);
    sectionOf.set(family.id, section ?? 'other');
  }
  for (const family of EXTRA_FAMILIES) sectionOf.set(family.id, family.section);

  const { assigned, fallbacks, hidden } = assignCubeRows(ctx.tables);
  for (const fallback of fallbacks) sectionOf.set(fallback.id, fallback.section);

  // Display order: by section, then guide families, extra families and fallbacks in definition / first-row order
  const definitionOrder = [...CUBE_FAMILIES, ...EXTRA_FAMILIES, ...fallbacks].map((family) => family.id);
  const sectionOrder = new Map(CUBE_SECTIONS.map((section, i) => [section.id, i]));
  const ordered = [...assigned.values()].sort((a, b) => {
    const bySection = (sectionOrder.get(sectionOf.get(a.family.id) ?? '') ?? 0) - (sectionOrder.get(sectionOf.get(b.family.id) ?? '') ?? 0);
    return bySection !== 0 ? bySection : definitionOrder.indexOf(a.family.id) - definitionOrder.indexOf(b.family.id);
  });

  const itemCodes = new Set(ctx.tables.items.map((item) => item.code));
  const killCheck = [...ctx.statNames].find(([, name]) => name === 'kill_check')?.[0] ?? null;
  const bosses = killCheckNames(ctx.tables.cube, killCheck);
  const families: CubeFamilyInfo[] = [];
  const groups: CubeGroup[] = [];
  const rows: CubeMergedRow[] = [];
  const recipes: CubeRecipe[] = [];
  ordered.forEach(({ family, rows: familyRows }, order) => {
    const raw = familyRows.length <= RAW_ROW_LIMIT;
    families.push({
      id: family.id,
      label: family.label,
      section: sectionOf.get(family.id) ?? 'other',
      order,
      rowCount: familyRows.length,
      raw,
    });
    for (const group of groupFamily(family, ctx.tables, familyRows, 'full')) {
      const id = groups.length;
      const conditions = group.rows.map((row) => conditionsOf(row, ctx, bosses));
      const shared = (conditions[0] ?? []).filter((condition) => conditions.every((list) => list.includes(condition)));
      const names = raw ? [] : namedItems(group.rows, ctx, itemCodes);
      groups.push({
        id,
        family: family.id,
        label: groupLabel(family, group.rows),
        rowCount: group.rows.length,
        conditions: shared,
        ...(names.length === 0 ? {} : { names }),
      });
      for (const { variant, count } of group.merged) {
        rows.push({ family: family.id, group: id, inputs: variant.inputs, output: variant.output, variants: count });
      }
      if (!raw) continue;
      group.rows.forEach((row, i) => {
        recipes.push({
          id: row.line,
          family: family.id,
          group: id,
          description: row.description,
          inputs: row.inputs.map((spec) => recipeInput(spec, ctx, itemCodes)),
          outputs: row.outputs.map((output) => recipeOutput(output, ctx)),
          conditions: conditions[i] ?? [],
        });
      });
    }
  });

  const usedSections = new Set(families.map((family) => family.section));
  return {
    bundle: {
      sections: CUBE_SECTIONS.filter((section) => usedSections.has(section.id)).map((section) => ({ ...section })),
      families,
      groups,
      rows,
      recipes,
      hidden: { ...hidden },
    },
    fallback: fallbacks.map((family) => ({ id: family.id, rows: assigned.get(family.id)?.rows.length ?? 0 })),
    warnings,
  };
}

/** Item type codes of itemtypes.txt */
export function itemTypeCodes(itemtypes: TsvTable): Set<string> {
  return new Set(itemtypes.rows.map((row) => row.str('Code')).filter((code) => code !== ''));
}
