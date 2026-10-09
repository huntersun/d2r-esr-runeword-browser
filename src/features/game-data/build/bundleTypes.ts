import { ancestorsOf, disambiguateTypeNames, resolveClass } from '../engine/itemTypes.ts';
import { isClassCode, type ClassCode, type ClassInfo, type ItemTypeInfo, type TypesBundle } from '../engine/schema.ts';
import type { CharStatsRow, ItemTypeRow } from './model.ts';

export interface BuildResult<T> {
  bundle: T;
  warnings: string[];
}

/** "%+d to Bow and Crossbow Skills" → "Bow and Crossbow Skills" */
const SKILL_TAB_PREFIX = /^\s*(?:%\+d|\+%d|%d)\s+to\s+/i;

function buildClasses(charStats: readonly CharStatsRow[], strings: ReadonlyMap<string, string>, warnings: string[]): ClassInfo[] {
  const classes: ClassInfo[] = [];
  for (const row of charStats) {
    // charstats has no code column; class codes are the first three letters of the name (Amazon → ama, Warlock → war)
    const code = row.name.slice(0, 3).toLowerCase();
    if (!isClassCode(code)) {
      warnings.push(`charstats: unknown class "${row.name}"`);
      continue;
    }
    const tabs = row.skillTabKeys.map((key) => {
      const text = strings.get(key);
      if (text === undefined) {
        warnings.push(`charstats: ${row.name} skill tab string "${key}" not found`);
        return key;
      }
      return text.replace(SKILL_TAB_PREFIX, '').trim();
    });
    classes.push({ code, name: row.name, tabs: [tabs[0] ?? '', tabs[1] ?? '', tabs[2] ?? ''] });
  }
  return classes;
}

export function buildTypesBundle(
  rows: readonly ItemTypeRow[],
  charStats: readonly CharStatsRow[],
  strings: ReadonlyMap<string, string>,
  /** Type codes used as `type`/`type2` by a bundled base; decides which colliding type keeps the plain name */
  baseTypes: ReadonlySet<string> = new Set()
): BuildResult<TypesBundle> {
  const warnings: string[] = [];

  const typeRows: ItemTypeRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.code === '') continue; // "Any", "Not Used" placeholder rows
    if (seen.has(row.code)) {
      warnings.push(`itemtypes: duplicate code "${row.code}" ignored`);
      continue;
    }
    seen.add(row.code);
    typeRows.push(row);
  }

  const parents = new Map(typeRows.map((row) => [row.code, row.parents]));
  const classOf = new Map<string, ClassCode | null>();
  for (const row of typeRows) {
    for (const parent of row.parents) {
      if (!parents.has(parent)) warnings.push(`itemtypes: "${row.code}" has unknown parent "${parent}"`);
    }
    if (row.cls !== '' && !isClassCode(row.cls)) warnings.push(`itemtypes: "${row.code}" has unknown Class "${row.cls}"`);
    classOf.set(row.code, isClassCode(row.cls) ? row.cls : null);
  }

  const names = disambiguateTypeNames(typeRows, baseTypes);
  const types = typeRows.map((row): ItemTypeInfo => {
    const ancestors = ancestorsOf([row.code], parents);
    return {
      code: row.code,
      name: names.get(row.code) ?? row.name,
      parents: row.parents.filter((parent) => parents.has(parent)),
      ancestors,
      sockets: row.maxSockets,
      thresholds: row.thresholds,
      cls: resolveClass(ancestors, classOf),
      ui: row.ui === '' ? null : row.ui,
      rwCats: row.rwCats,
      magic: row.magic,
      rare: row.rare,
      normal: row.normal,
      bodyLoc: row.bodyLoc === '' ? null : row.bodyLoc,
    };
  });

  return { bundle: { types, classes: buildClasses(charStats, strings, warnings) }, warnings };
}
