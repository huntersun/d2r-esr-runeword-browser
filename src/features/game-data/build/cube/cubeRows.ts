/**
 * cubemain.txt rows and the item / item type / string names their cells use, parsed into small typed shapes. Shared by
 * the cube bundle (`bundleCube.ts`) and the guide's cube directives (`src/features/guide/build`), which import from
 * here; nothing in this folder imports the guide. `buildCubeTables` is pure so tests can feed inline TSV fixtures.
 */
import { createStatRenderer, readStatTables, type StatRenderer, type StatTableName } from '../stats/statRenderer.ts';
import { buildStringTable, type StringsFile } from '../strings.ts';
import { parseTsv, type TsvRow, type TsvTable } from '../tsv.ts';

export interface CubeMod {
  mod: string;
  /** `mod N param` (a skill, aura or tab for skill mods; a stat layer); empty when unset */
  param: string;
  min: number;
  max: number;
}

/**
 * Display lines of cube output mods, rendered like the affix text of the game-data bundles ("+5 to Life"); a mod the
 * renderer cannot read (unknown property or stat) is left out instead of showing its raw code.
 */
export type ModRenderer = (mods: readonly CubeMod[]) => string[];

export interface CubeOutput {
  /** Raw output cell without quotes, e.g. `usetype,uni` or `Kill Ledger` */
  spec: string;
  mods: CubeMod[];
  /** `lvl` column: a fixed item level; omitted when unset */
  lvl?: number;
  /** `plvl` column: the item level as a % of the character level; omitted when unset */
  plvl?: number;
  /** `ilvl` column: the item level as a % of the input item's level (adds to plvl); omitted when unset */
  ilvl?: number;
}

/** The row's `op` / `param` / `value` condition, e.g. the Kill Ledger's kill count (stat 163 at least 500) */
export interface CubeCondition {
  op: number;
  /** Stat id */
  param: number;
  value: number;
}

export interface CubeRow {
  /** Line number in cubemain.txt (the header is line 1) */
  line: number;
  description: string;
  cls: string;
  /** `min diff` column: 0 any difficulty, 1 Nightmare and Hell, 2 Hell only */
  minDiff: number;
  /** Raw input cells without quotes, e.g. `gem5,qty=2` */
  inputs: string[];
  outputs: CubeOutput[];
  /** Null when the row has no `op` */
  condition: CubeCondition | null;
}

/** An item of misc/armor/weapons.txt as the cube texts read it */
export interface CubeItem {
  kind: 'misc' | 'armor' | 'weapon';
  code: string;
  /** Display name (string table) */
  name: string;
  /** `name` column; ESR shortens some display names (Thawing Potion → "*Thaw") */
  internalName: string;
  /** `type` column (item type code) */
  type: string;
}

export interface CubeNames {
  /** Display name of an item code, item type code, unique/set name or string key; falls back to the token */
  nameOf: (token: string) => string;
  /** True when the token is a known item code, item type code or string key */
  isKnown: (token: string) => boolean;
  /** Lower-cased item names (display, internal and the name line of multi-line names) and item type names */
  names: ReadonlySet<string>;
}

export interface CubeTables extends CubeNames {
  /** Enabled cubemain rows */
  cube: CubeRow[];
  items: readonly CubeItem[];
  /** Bonus text of cube output mods (the game-data stat renderer) */
  renderMods: ModRenderer;
  /** levels.txt name of a level id (the map a Red Portal opens); without it the `lvl=` reads "item level N" */
  levelName?: (id: number) => string | null;
}

export const CUBE_TABLES = ['cubemain', 'misc', 'armor', 'weapons', 'itemtypes'] as const;
export type CubeTableName = (typeof CUBE_TABLES)[number];

export interface CubeSources {
  tables: Record<CubeTableName, string>;
  strings: StringsFile[];
  /** The game-data stat renderer's tables (properties, itemstatcost, …), for the bonuses of cube outputs */
  statTables?: Record<StatTableName, string>;
}

/**
 * Display text of a string table entry. Multi-line item names keep the name on the last line and a subtitle above it
 * (e.g. "(Buckler, Pelta Lunata)\nAncient Coupon" → "Ancient Coupon (Buckler, Pelta Lunata)").
 */
export function displayString(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const name = lines.pop() ?? '';
  return lines.length === 0 ? name : `${name} ${lines.join(' ')}`;
}

function unquote(cell: string): string {
  return cell.replace(/^"|"$/g, '').trim();
}

export function numberOf(row: TsvRow, column: string): number {
  if (!row.has(column)) return 0;
  const value = Number(row.str(column));
  return Number.isNaN(value) ? 0 : value;
}

function readMods(row: TsvRow, prefix: string): CubeMod[] {
  const mods: CubeMod[] = [];
  for (let i = 1; i <= 5; i++) {
    const column = `${prefix}mod ${String(i)}`;
    if (!row.has(column)) continue;
    const mod = row.str(column);
    if (mod === '') continue;
    const param = row.has(`${column} param`) ? row.str(`${column} param`) : '';
    mods.push({ mod, param, min: numberOf(row, `${column} min`), max: numberOf(row, `${column} max`) });
  }
  return mods;
}

function readCondition(row: TsvRow): CubeCondition | null {
  const op = numberOf(row, 'op');
  if (op === 0) return null;
  return { op, param: numberOf(row, 'param'), value: numberOf(row, 'value') };
}

/** The enabled rows of cubemain.txt, quotes stripped from the cells */
export function readCube(table: TsvTable): CubeRow[] {
  const rows: CubeRow[] = [];
  for (const row of table.rows) {
    if (numberOf(row, 'enabled') !== 1) continue;
    const outputs: CubeOutput[] = [];
    for (const [column, prefix] of [
      ['output', ''],
      ['output b', 'b '],
      ['output c', 'c '],
    ] as const) {
      const spec = row.has(column) ? unquote(row.str(column)) : '';
      if (spec === '') continue;
      const output: CubeOutput = { spec, mods: readMods(row, prefix) };
      for (const key of ['lvl', 'plvl', 'ilvl'] as const) {
        const level = numberOf(row, `${prefix}${key}`);
        if (level !== 0) output[key] = level;
      }
      outputs.push(output);
    }
    rows.push({
      line: row.line,
      description: row.str('description'),
      cls: row.has('class') ? row.str('class') : '',
      minDiff: numberOf(row, 'min diff'),
      inputs: [1, 2, 3, 4, 5, 6, 7]
        .map((i) => (row.has(`input ${String(i)}`) ? unquote(row.str(`input ${String(i)}`)) : ''))
        .filter((cell) => cell !== ''),
      outputs,
      condition: readCondition(row),
    });
  }
  return rows;
}

/** One misc/armor/weapons row's names and type */
export function readCubeItem(row: TsvRow, kind: CubeItem['kind'], strings: ReadonlyMap<string, string>): CubeItem {
  const namestr = row.has('namestr') ? row.str('namestr') : '';
  const string = strings.get(namestr);
  const internalName = row.str('name');
  return {
    kind,
    code: row.str('code'),
    name: string === undefined ? internalName : displayString(string),
    internalName,
    type: row.has('type') ? row.str('type') : '',
  };
}

/** Item, item type and string-key names for the cube cells */
export function buildCubeNames(items: readonly CubeItem[], itemtypes: TsvTable, strings: ReadonlyMap<string, string>): CubeNames {
  const itemNames = new Map<string, string>();
  // ESR abbreviates potion and scroll display names for the belt ("*Thaw", "+TP"); recipes read better with the full name.
  for (const item of items)
    if (!itemNames.has(item.code)) itemNames.set(item.code, /^[*+]/.test(item.name) ? item.internalName : item.name);
  // An item type whose items all share one display name reads as that name: itemtypes.txt calls the Multi Stocker's
  // type "Gem Can 8". Otherwise the itemtypes.txt name ("Perfect Gem", "Any Armor").
  const typeItemNames = new Map<string, Set<string>>();
  for (const item of items) {
    if (item.type === '') continue;
    const names = typeItemNames.get(item.type) ?? new Set<string>();
    names.add(itemNames.get(item.code) ?? item.name);
    typeItemNames.set(item.type, names);
  }
  const typeNames = new Map<string, string>();
  for (const row of itemtypes.rows) {
    const code = row.str('Code');
    if (code === '' || typeNames.has(code)) continue;
    const names = [...(typeItemNames.get(code) ?? [])];
    const only = names.length === 1 ? names.at(0) : undefined;
    typeNames.set(code, only ?? row.str('ItemType'));
  }

  const stringOf = (token: string): string | undefined => {
    const text = strings.get(token);
    return text === undefined ? undefined : displayString(text);
  };
  return {
    nameOf: (token) => itemNames.get(token) ?? typeNames.get(token) ?? stringOf(token) ?? token,
    isKnown: (token) => itemNames.has(token) || typeNames.has(token) || strings.has(token),
    names: new Set(
      [
        ...items.flatMap((item) => [item.name, item.internalName, (strings.get(item.code) ?? '').split('\n').pop() ?? '']),
        ...typeNames.values(),
      ]
        .map((name) => name.trim().toLowerCase())
        .filter((name) => name !== '')
    ),
  };
}

/** Cube output mods through a stat renderer: rendered together, without the mods it warns about */
export function modRendererFor(renderer: () => StatRenderer): ModRenderer {
  return (mods) => {
    const current = renderer();
    const inputs = mods.map((mod) => ({ code: mod.mod, param: mod.param === '' ? null : mod.param, min: mod.min, max: mod.max }));
    // Rendered together (the renderer merges damage pairs and stat groups), without the mods it warns about
    const readable = inputs.filter((input) => current.renderMods([input]).warnings.length === 0);
    return readable.length === 0 ? [] : current.renderMods(readable).lines;
  };
}

/** The stat renderer, built on first use (the guide only renders a few hundred cube rows) */
export function statModRenderer(statTables: Record<StatTableName, string>, strings: ReadonlyMap<string, string>): ModRenderer {
  let renderer: StatRenderer | null = null;
  return modRendererFor(() => (renderer ??= createStatRenderer(readStatTables(statTables), strings)));
}

/** The mod renderer: `renderMods` overrides it (tests pass a stub); without it and without stat tables, no bonus. */
export function cubeModRenderer(
  statTables: Record<StatTableName, string> | undefined,
  strings: ReadonlyMap<string, string>,
  renderMods?: ModRenderer
): ModRenderer {
  return renderMods ?? (statTables === undefined ? () => [] : statModRenderer(statTables, strings));
}

/** Cube rows, items and names from the raw table texts */
export function buildCubeTables(sources: CubeSources, renderMods?: ModRenderer): CubeTables {
  const { strings } = buildStringTable(sources.strings);
  const items = [
    ...parseTsv(sources.tables.misc, 'misc.txt').rows.map((row) => readCubeItem(row, 'misc', strings)),
    ...parseTsv(sources.tables.armor, 'armor.txt').rows.map((row) => readCubeItem(row, 'armor', strings)),
    ...parseTsv(sources.tables.weapons, 'weapons.txt').rows.map((row) => readCubeItem(row, 'weapon', strings)),
  ];
  return {
    cube: readCube(parseTsv(sources.tables.cubemain, 'cubemain.txt')),
    items,
    ...buildCubeNames(items, parseTsv(sources.tables.itemtypes, 'itemtypes.txt'), strings),
    renderMods: cubeModRenderer(sources.statTables, strings, renderMods),
  };
}
