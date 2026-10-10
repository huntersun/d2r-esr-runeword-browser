/**
 * The ESR tables the guide directives read (cube recipes, vendors, difficulty penalties), parsed into small typed
 * shapes. `readEsrGuideSources` does the fs work; `buildEsrGuideTables` is pure so tests can feed inline TSV fixtures.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESR_EXCEL_DIR, readModVersion, readStringFiles } from '../../game-data/build/esrSources.ts';
import { buildStringTable, type StringsFile } from '../../game-data/build/strings.ts';
import { parseTsv, type TsvRow, type TsvTable } from '../../game-data/build/tsv.ts';

const GUIDE_TABLES = ['cubemain', 'misc', 'armor', 'weapons', 'itemtypes', 'difficultylevels'] as const;
export type GuideTableName = (typeof GUIDE_TABLES)[number];

export interface EsrGuideSources {
  esrVersion: string;
  tables: Record<GuideTableName, string>;
  strings: StringsFile[];
}

export interface CubeMod {
  mod: string;
  min: number;
  max: number;
}

export interface CubeOutput {
  /** Raw output cell without quotes, e.g. `usetype,uni` or `Kill Ledger` */
  spec: string;
  mods: CubeMod[];
}

export interface CubeRow {
  description: string;
  cls: string;
  /** Raw input cells without quotes, e.g. `gem5,qty=2` */
  inputs: string[];
  outputs: CubeOutput[];
}

export interface VendorOffer {
  npc: string;
  /** Only sold as a magic item */
  magicOnly: boolean;
}

export interface EsrItem {
  kind: 'misc' | 'armor' | 'weapon';
  code: string;
  /** Display name (string table) */
  name: string;
  /** `name` column; ESR shortens some display names (Thawing Potion → "*Thaw") */
  internalName: string;
  /** `type` column (item type code) */
  type: string;
  vendors: VendorOffer[];
}

export interface DifficultyRow {
  name: string;
  resistPenalty: number;
  deathExpPenalty: number;
  monsterSkillBonus: number;
}

export interface EsrGuideTables {
  /** Enabled cubemain rows */
  cube: CubeRow[];
  items: EsrItem[];
  /** Vendor column prefixes, e.g. `Gheed` */
  npcs: string[];
  difficulties: DifficultyRow[];
  /** Display name of an item code, item type code, unique/set name or string key; falls back to the token */
  nameOf: (token: string) => string;
  /** True when the token is a known item code, item type code or string key */
  isKnown: (token: string) => boolean;
  /** Lower-cased item names (display, internal and the name line of multi-line names) and item type names */
  names: ReadonlySet<string>;
}

export function readEsrGuideSources(esrDir: string): EsrGuideSources {
  const excelDir = join(esrDir, ESR_EXCEL_DIR);
  const tables = {} as Record<GuideTableName, string>;
  for (const name of GUIDE_TABLES) tables[name] = readFileSync(join(excelDir, `${name}.txt`), 'utf8');
  return { esrVersion: readModVersion(esrDir), tables, strings: readStringFiles(esrDir) };
}

/** Anchors (`id="…"` / `name="…"`) per file of the clone's docs/ folder (the official site); null without docs. */
export function readDocsIndex(esrDir: string): Map<string, Set<string>> | null {
  const docsDir = join(esrDir, 'docs');
  if (!existsSync(docsDir)) return null;
  const index = new Map<string, Set<string>>();
  for (const name of readdirSync(docsDir)) {
    index.set(name, /\.html?$/i.test(name) ? anchorsOf(readFileSync(join(docsDir, name), 'utf8')) : new Set());
  }
  return index;
}

function anchorsOf(html: string): Set<string> {
  return new Set([...html.matchAll(/\b(?:id|name)\s*=\s*["']([^"']*)["']/gi)].map((match) => match[1]));
}

/**
 * Display text of a string table entry. Multi-line item names keep the name on the last line and a subtitle above it
 * (e.g. "(Buckler, Pelta Lunata)\nAncient Coupon" → "Ancient Coupon (Buckler, Pelta Lunata)").
 */
function displayString(text: string): string {
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

function numberOf(row: TsvRow, column: string): number {
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
    if (mod !== '') mods.push({ mod, min: numberOf(row, `${column} min`), max: numberOf(row, `${column} max`) });
  }
  return mods;
}

function readCube(table: TsvTable): CubeRow[] {
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
      if (spec !== '') outputs.push({ spec, mods: readMods(row, prefix) });
    }
    rows.push({
      description: row.str('description'),
      cls: row.has('class') ? row.str('class') : '',
      inputs: [1, 2, 3, 4, 5, 6, 7]
        .map((i) => (row.has(`input ${String(i)}`) ? unquote(row.str(`input ${String(i)}`)) : ''))
        .filter((cell) => cell !== ''),
      outputs,
    });
  }
  return rows;
}

function vendorNpcs(table: TsvTable): string[] {
  return table.columns.filter((column) => /^[A-Z][a-z]+Min$/.test(column) && column !== 'TMogMin').map((column) => column.slice(0, -3));
}

function readItems(table: TsvTable, kind: EsrItem['kind'], npcs: readonly string[], strings: ReadonlyMap<string, string>): EsrItem[] {
  return table.rows.map((row) => {
    const namestr = row.has('namestr') ? row.str('namestr') : '';
    const string = strings.get(namestr);
    const vendors: VendorOffer[] = [];
    for (const npc of npcs) {
      const max = numberOf(row, `${npc}Max`);
      const magicMax = numberOf(row, `${npc}MagicMax`);
      if (max > 0 || magicMax > 0) vendors.push({ npc, magicOnly: max <= 0 });
    }
    const internalName = row.str('name');
    return {
      kind,
      code: row.str('code'),
      name: string === undefined ? internalName : displayString(string),
      internalName,
      type: row.has('type') ? row.str('type') : '',
      vendors,
    };
  });
}

export function buildEsrGuideTables(sources: Pick<EsrGuideSources, 'tables' | 'strings'>): EsrGuideTables {
  const { strings } = buildStringTable(sources.strings);
  const misc = parseTsv(sources.tables.misc, 'misc.txt');
  const npcs = vendorNpcs(misc);
  const items = [
    ...readItems(misc, 'misc', npcs, strings),
    ...readItems(parseTsv(sources.tables.armor, 'armor.txt'), 'armor', npcs, strings),
    ...readItems(parseTsv(sources.tables.weapons, 'weapons.txt'), 'weapon', npcs, strings),
  ];
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
  for (const row of parseTsv(sources.tables.itemtypes, 'itemtypes.txt').rows) {
    const code = row.str('Code');
    if (code === '' || typeNames.has(code)) continue;
    const names = [...(typeItemNames.get(code) ?? [])];
    const only = names.length === 1 ? names.at(0) : undefined;
    typeNames.set(code, only ?? row.str('ItemType'));
  }
  const difficulties = parseTsv(sources.tables.difficultylevels, 'difficultylevels.txt').rows.map((row) => ({
    name: row.str('Name'),
    resistPenalty: numberOf(row, 'ResistPenalty'),
    deathExpPenalty: numberOf(row, 'DeathExpPenalty'),
    monsterSkillBonus: numberOf(row, 'MonsterSkillBonus'),
  }));

  const stringOf = (token: string): string | undefined => {
    const text = strings.get(token);
    return text === undefined ? undefined : displayString(text);
  };
  return {
    cube: readCube(parseTsv(sources.tables.cubemain, 'cubemain.txt')),
    items,
    npcs,
    difficulties,
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
