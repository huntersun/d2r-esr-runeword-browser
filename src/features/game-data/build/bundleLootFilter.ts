import type { LootFilterDataBundle, LootFilterItem, LootFilterUniqueOrSet } from '../engine/schema.ts';
import type { BuildResult } from './bundleTypes.ts';
import { resolveName } from './itemNames.ts';
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
}

function readItemRows(tables: LootFilterTables, warnings: string[], strings: ReadonlyMap<string, string>): LootFilterItem[] {
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
      const type2 = row.str('type2');
      items.push({
        code,
        name: resolveName(strings, row.str('namestr'), name),
        kind,
        type: row.str('type'),
        ...(type2 === '' ? {} : { type2 }),
        spawnable: row.num('spawnable') === 1,
      });
    }
  }
  return items;
}

/** Rows with a base code, numbered by their 0-based data-row index (marker rows count but are not listed). */
function readUniqueOrSetRows(table: TsvTable, codeColumn: string, strings: ReadonlyMap<string, string>): LootFilterUniqueOrSet[] {
  const entries: LootFilterUniqueOrSet[] = [];
  table.rows.forEach((row, id) => {
    const code = row.str(codeColumn);
    if (code === '') return;
    const index = row.str('index');
    entries.push({ id, name: resolveName(strings, index, index), code });
  });
  return entries;
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

  const uniques = readUniqueOrSetRows(tables.uniqueitems, 'code', strings);
  const sets = readUniqueOrSetRows(tables.setitems, 'item', strings);
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
