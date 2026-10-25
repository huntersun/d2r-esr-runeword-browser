/**
 * sets.json: every set of sets.txt with its items from setitems.txt and the rendered bonus lines.
 *
 * - Own lines: setitems.txt prop1..prop9.
 * - Per-item partial bonuses: aprop{N}a/b. With `add func` 2 (every ESR row) group N turns on with N + 1 items of the
 *   set worn; a and b are merged into one group.
 * - Set-wide partial bonuses: sets.txt PCode{N}a/b turn on with N items worn; full-set bonuses: FCode1..8.
 * - Hidden: sets whose index ends in `_old` (retired copies), sets without items, and the items of a hidden or unknown
 *   set (ESR keeps "Malek's Defense" on a "Malek's Charge_old" set sets.txt does not have).
 * See docs/features/GAME-DATA.md "Sets".
 */
import type { BaseItem, ClassInfo, ItemTypeInfo, SetBonusGroup, SetInfo, SetItemInfo, SetsBundle } from '../engine/schema.ts';
import type { ModsRenderer } from './bundleRunewords.ts';
import { resolveName } from './itemNames.ts';
import type { PropertyMod } from './model.ts';
import type { TsvRow, TsvTable } from './tsv.ts';

/** Retired sets kept in the tables under a suffixed index */
const OLD_SUFFIX = '_old';
/** `add func` of the per-item bonuses that count the set's items worn (the only value ESR uses) */
const ADD_FUNC_ITEM_COUNT = 2;

export interface SetsInput {
  sets: TsvTable;
  setitems: TsvTable;
  bases: readonly Pick<BaseItem, 'code' | 'name' | 'type'>[];
  types: readonly Pick<ItemTypeInfo, 'code' | 'name'>[];
  classes: readonly Pick<ClassInfo, 'code' | 'name'>[];
  strings: ReadonlyMap<string, string>;
  renderMods: ModsRenderer;
}

export interface SetsBuildResult {
  bundle: SetsBundle;
  hidden: {
    /** `_old` sets and sets without items */
    sets: number;
    /** Items of a hidden or unknown set, and disabled items */
    items: number;
  };
  warnings: string[];
}

function mod(row: TsvRow, code: string, param: string, min: string, max: string): PropertyMod[] {
  const property = row.str(code);
  if (property === '') return [];
  const value = row.str(param);
  return [{ code: property, param: value === '' ? null : value, min: row.num(min), max: row.num(max) }];
}

export function buildSetsBundle(input: SetsInput): SetsBuildResult {
  const warnings: string[] = [];
  const render = (mods: readonly PropertyMod[], where: string): string[] => {
    if (mods.length === 0) return [];
    const result = input.renderMods(mods);
    for (const warning of result.warnings) warnings.push(`sets: ${where}: ${warning}`);
    return result.lines;
  };
  const groups = (entries: { pieces: number; mods: PropertyMod[] }[], where: string): SetBonusGroup[] =>
    entries.flatMap(({ pieces, mods }) => {
      const lines = render(mods, `${where} (${String(pieces)} items)`);
      return lines.length === 0 ? [] : [{ pieces, lines }];
    });

  const bases = new Map(input.bases.map((base) => [base.code, base]));
  const typeNames = new Map(input.types.map((type) => [type.code, type.name]));
  const classNames = new Map<string, Pick<ClassInfo, 'code' | 'name'>>(input.classes.map((entry) => [entry.code, entry]));

  const setIds = new Set(input.sets.rows.map((row) => row.str('index')).filter((id) => id !== ''));
  const itemsBySet = new Map<string, SetItemInfo[]>();
  let hiddenItems = 0;
  for (const row of input.setitems.rows) {
    const index = row.str('index');
    if (index === '') continue;
    const setId = row.str('set');
    if (row.num('disabled') === 1 || setId.endsWith(OLD_SUFFIX) || !setIds.has(setId)) {
      if (!setId.endsWith(OLD_SUFFIX) && !setIds.has(setId)) warnings.push(`sets: item "${index}" names unknown set "${setId}"`);
      hiddenItems++;
      continue;
    }
    const addFunc = row.num('add func');
    if (addFunc !== ADD_FUNC_ITEM_COUNT && row.str('aprop1a') !== '') {
      warnings.push(`sets: item "${index}" has add func ${String(addFunc)}; its bonuses are shown by item count`);
    }
    const code = row.str('item');
    const base = bases.get(code);
    if (base === undefined) warnings.push(`sets: item "${index}" has unknown base "${code}"`);
    const own = Array.from({ length: 9 }, (_, i) => i + 1).flatMap((n) =>
      mod(row, `prop${String(n)}`, `par${String(n)}`, `min${String(n)}`, `max${String(n)}`)
    );
    const partial = Array.from({ length: 5 }, (_, i) => i + 1).map((n) => ({
      pieces: n + 1,
      mods: ['a', 'b'].flatMap((part) => {
        const suffix = `${String(n)}${part}`;
        return mod(row, `aprop${suffix}`, `apar${suffix}`, `amin${suffix}`, `amax${suffix}`);
      }),
    }));
    const item: SetItemInfo = {
      name: resolveName(input.strings, index, index),
      code,
      baseName: base?.name ?? code,
      category: base === undefined ? '' : (typeNames.get(base.type) ?? base.type),
      level: row.num('lvl'),
      reqLevel: row.num('lvl req'),
      lines: render(own, index),
      partial: groups(partial, index),
    };
    itemsBySet.set(setId, [...(itemsBySet.get(setId) ?? []), item]);
  }

  const sets: SetInfo[] = [];
  let hiddenSets = 0;
  for (const row of input.sets.rows) {
    const id = row.str('index');
    if (id === '') continue;
    const items = itemsBySet.get(id) ?? [];
    if (id.endsWith(OLD_SUFFIX) || items.length === 0) {
      hiddenSets++;
      continue;
    }
    const uiClass = row.str('UIClass');
    const cls = uiClass === '' ? undefined : classNames.get(uiClass);
    if (uiClass !== '' && cls === undefined) warnings.push(`sets: set "${id}" has unknown UIClass "${uiClass}"`);
    const partial = [2, 3, 4, 5].map((n) => ({
      pieces: n,
      mods: ['a', 'b'].flatMap((part) => {
        const suffix = `${String(n)}${part}`;
        return mod(row, `PCode${suffix}`, `PParam${suffix}`, `PMin${suffix}`, `PMax${suffix}`);
      }),
    }));
    const full = Array.from({ length: 8 }, (_, i) => i + 1).flatMap((n) =>
      mod(row, `FCode${String(n)}`, `FParam${String(n)}`, `FMin${String(n)}`, `FMax${String(n)}`)
    );
    const levels = items.map((item) => item.reqLevel);
    sets.push({
      id,
      name: resolveName(input.strings, row.str('name'), id),
      classCode: cls?.code ?? null,
      className: cls?.name ?? null,
      reqLevel: { min: Math.min(...levels), max: Math.max(...levels) },
      items,
      partial: groups(partial, id),
      full: render(full, `${id} (full set)`),
    });
  }

  return { bundle: { sets }, hidden: { sets: hiddenSets, items: hiddenItems }, warnings };
}
