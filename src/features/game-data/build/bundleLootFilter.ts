import type { LootFilterDataBundle, LootFilterItem, LootFilterUniqueOrSet } from '../engine/schema.ts';
import type { BuildResult } from './bundleTypes.ts';
import { readUniqueOrSetRows, resolveName } from './itemNames.ts';
import { optStr } from './model.ts';
import { distinctFamilyTier } from './tiers.ts';
import { refOf } from './treasureClasses.ts';
import type { TsvTable } from './tsv.ts';

/**
 * Tables read by the loot-filter bundle. `itemstatcost`, `sounds`, `uniqueitems` and `setitems` are addressed by row
 * number, so they must be parsed with `keepExpansionRows` (the game counts every data row).
 */
export interface LootFilterTables {
  weapons: TsvTable;
  armor: TsvTable;
  misc: TsvTable;
  itemstatcost: TsvTable;
  levels: TsvTable;
  sounds: TsvTable;
  uniqueitems: TsvTable;
  setitems: TsvTable;
  treasureclassex: TsvTable;
  gems: TsvTable;
}

/** treasureclassex.txt has `Item1` … `Item10` */
const TC_ITEM_COLUMNS = 10;

/**
 * Item codes a treasure class can drop although their row is not spawnable: every `Item*` cell of every treasure
 * class row that is an item code, plus the base code of every unique/set row a cell names by its `index`. A cell that
 * names another treasure class needs no expansion: that class's own row is scanned too.
 */
function treasureClassCodes(tables: LootFilterTables): Set<string> {
  const refs = new Set<string>();
  for (const row of tables.treasureclassex.rows) {
    if (row.str('Treasure Class') === '') continue;
    for (let i = 1; i <= TC_ITEM_COLUMNS; i++) {
      const column = `Item${String(i)}`;
      if (!row.has(column)) continue;
      const ref = refOf(row.str(column));
      if (ref !== '') refs.add(ref);
    }
  }
  const codes = new Set(refs);
  for (const [table, codeColumn] of [
    [tables.uniqueitems, 'code'],
    [tables.setitems, 'item'],
  ] as const) {
    for (const row of table.rows) {
      const code = row.str(codeColumn);
      if (code !== '' && refs.has(row.str('index'))) codes.add(code);
    }
  }
  return codes;
}

/**
 * A spawnable rune without a gems.txt row is an unused row: it has no socket stats, and no recipe or treasure class
 * makes it (ESR 3.2.24: only `r48` "Hu Rune", whose namestr makes it a second "Fu Rune"). Misc items only drop through
 * treasure classes, so spawnable alone does not prove a misc item drops; this narrow check catches the one row the data
 * proves dead without hiding engine drops (the essences) that no table names. ESR has no item type below `rune`.
 */
function isUnusedRune(type: string, code: string, gemCodes: ReadonlySet<string>): boolean {
  return type === 'rune' && !gemCodes.has(code);
}

function readItemRows(tables: LootFilterTables, warnings: string[], strings: ReadonlyMap<string, string>): LootFilterItem[] {
  const dropCodes = treasureClassCodes(tables);
  const gemCodes = new Set(tables.gems.rows.map((row) => row.str('code')).filter((code) => code !== ''));
  const items: LootFilterItem[] = [];
  const seen = new Set<string>();
  for (const [kind, table] of [
    ['weapon', tables.weapons],
    ['armor', tables.armor],
    ['misc', tables.misc],
  ] as const) {
    for (const row of table.rows) {
      const code = row.str('code');
      if (code === '') continue;
      if (seen.has(code)) {
        warnings.push(`lootfilter: duplicate item code "${code}" (${row.str('name')}); kept the first row`);
        continue;
      }
      seen.add(code);
      const name = row.str('name');
      const spawnable = row.num('spawnable') === 1;
      const type2 = row.str('type2');
      // misc.txt has no tier families; neither do weapons/armor rows whose family points at themselves
      const tier =
        kind === 'misc' ? undefined : distinctFamilyTier(code, optStr(row, 'normcode'), optStr(row, 'ubercode'), optStr(row, 'ultracode'));
      items.push({
        code,
        name: resolveName(strings, row.str('namestr'), name),
        kind,
        type: row.str('type'),
        ...(type2 === '' ? {} : { type2 }),
        ...(tier === undefined ? {} : { tier }),
        spawnable,
        drops: dropCodes.has(code) || (spawnable && !isUnusedRune(row.str('type'), code, gemCodes)),
      });
    }
  }
  return items;
}

/** Rows with a base code, numbered by their 0-based data-row index (marker rows count but are not listed). */
function lootFilterRows(table: TsvTable, codeColumn: 'code' | 'item', strings: ReadonlyMap<string, string>): LootFilterUniqueOrSet[] {
  return readUniqueOrSetRows(table, codeColumn, strings).map(({ id, name, code }) => ({ id, name, code }));
}

export function buildLootFilterBundle(tables: LootFilterTables, strings: ReadonlyMap<string, string>): BuildResult<LootFilterDataBundle> {
  const warnings: string[] = [];
  const items = readItemRows(tables, warnings, strings);

  const stats = tables.itemstatcost.rows.map((row, id) => ({ id, name: row.str('Stat') }));

  const areas: LootFilterDataBundle['areas'] = [];
  for (const row of tables.levels.rows) {
    if (row.str('Id') === '') continue;
    const levelName = row.str('LevelName');
    areas.push({
      id: row.num('Id'),
      name: resolveName(strings, levelName, levelName === '' ? row.str('Name') : levelName),
      act: row.num('Act'),
    });
  }

  const sounds = tables.sounds.rows.map((row) => row.str('Sound'));

  const uniques = lootFilterRows(tables.uniqueitems, 'code', strings);
  const sets = lootFilterRows(tables.setitems, 'item', strings);
  const codes = new Set(items.map((item) => item.code));
  for (const [label, entries] of [
    ['unique', uniques],
    ['set', sets],
  ] as const) {
    for (const entry of entries) {
      if (!codes.has(entry.code))
        warnings.push(`lootfilter: ${label} ${String(entry.id)} (${entry.name}) has unknown base code "${entry.code}"`);
    }
  }

  return { bundle: { items, stats, areas, sounds, uniques, sets }, warnings };
}
