/**
 * sources.json: qualitative "where does this item come from" labels for uniques, set items and crafting-relevant misc
 * items. See docs/features/GAME-DATA.md "Sources" for the rules and their limitations.
 */
import type { ItemSource, SourceKind, SourceLabel, SourcesBundle } from '../engine/schema.ts';
import { displayName } from './itemNames.ts';
import { readPluginUniques } from './pluginDrops.ts';
import { createTreasureClassIndex, refOf, type DropMonster } from './treasureClasses.ts';
import type { TsvRow, TsvTable } from './tsv.ts';

export interface SourceTables {
  uniqueitems: TsvTable;
  setitems: TsvTable;
  weapons: TsvTable;
  armor: TsvTable;
  misc: TsvTable;
  cubemain: TsvTable;
  treasureclassex: TsvTable;
  monstats: TsvTable;
  superuniques: TsvTable;
  gamble: TsvTable;
}

const KIND_ORDER: readonly SourceKind[] = ['cube', 'boss', 'maps', 'drop', 'buy', 'gamble', 'plugin', 'unknown'];

/** NPCs with `<Npc>Min` / `<Npc>Max` columns on the item tables */
export const VENDORS = [
  'Charsi',
  'Gheed',
  'Akara',
  'Fara',
  'Lysander',
  'Drognan',
  'Hratli',
  'Alkor',
  'Ormus',
  'Elzix',
  'Asheara',
  'Cain',
  'Halbu',
  'Malah',
  'Larzuk',
  'Anya',
  'Jamella',
] as const;

/** At most this many distinct monsters → "Drops from <monsters>" instead of a generic drop label */
const BOSS_MAX_MONSTERS = 5;
/** Items of this level or higher only roll from monster level ≥ 100, i.e. endgame-map monsters */
const MAP_ITEM_LEVEL = 100;

/** Misc types that are never interesting as a source (potions, scrolls, tomes, keys, gold, ammo) */
const NOISE_TYPES = new Set(['hpot', 'mpot', 'rpot', 'spot', 'apot', 'wpot', 'scro', 'book', 'key', 'gold', 'tpot', 'bowq', 'xboq']);

const CUBE_INPUTS = ['input 1', 'input 2', 'input 3', 'input 4', 'input 5', 'input 6', 'input 7'];
const CUBE_OUTPUTS = ['output', 'output b', 'output c'];

interface BaseRow {
  kind: 'weapon' | 'armor' | 'misc';
  row: TsvRow;
}

const optStr = (row: TsvRow, column: string) => (row.has(column) ? row.str(column) : '');
const optNum = (row: TsvRow, column: string) => (row.has(column) ? row.num(column) : 0);

function label(kind: SourceKind, text: string): SourceLabel {
  return { kind, text };
}

export function buildSourcesBundle(
  tables: SourceTables,
  strings: ReadonlyMap<string, string>,
  pluginToml: string | null
): { bundle: SourcesBundle; warnings: string[] } {
  const warnings: string[] = [];
  const nameOf = (key: string, fallback: string) => {
    const text = displayName(strings.get(key) ?? '');
    return text === '' ? fallback : text;
  };

  const bases = new Map<string, BaseRow>();
  for (const [kind, table] of [
    ['weapon', tables.weapons],
    ['armor', tables.armor],
    ['misc', tables.misc],
  ] as const) {
    for (const row of table.rows) {
      const code = row.str('code');
      if (code !== '' && !bases.has(code)) bases.set(code, { kind, row });
    }
  }

  // Ancient Coupons ("Coupon nor Armor 1", …); the Wild Card is a coupon-shaped joker also used for gem recipes
  const isCoupon = (name: string) => name.startsWith('Coupon ') && !name.includes('Wild Card');
  const couponCodes = new Set(tables.misc.rows.filter((row) => isCoupon(row.str('name'))).map((row) => row.str('code')));
  const gamble = new Set(tables.gamble.rows.map((row) => row.str('code')).filter((code) => code !== ''));
  const pluginUniques = readPluginUniques(pluginToml);
  const drops = createTreasureClassIndex(tables.treasureclassex, tables.monstats, tables.superuniques, strings);

  // Cube: output ref → whether a creating row uses an Ancient Coupon / a creating row does not
  const cubeMade = new Map<string, { coupon: boolean; plain: boolean }>();
  const cubeInputs = new Set<string>();
  for (const row of tables.cubemain.rows) {
    if (row.num('enabled') !== 1) continue;
    const inputs = CUBE_INPUTS.filter((column) => row.has(column)).map((column) => refOf(row.str(column)));
    for (const input of inputs) cubeInputs.add(input);
    const coupon = inputs.some((input) => couponCodes.has(input));
    for (const column of CUBE_OUTPUTS) {
      if (!row.has(column)) continue;
      const output = refOf(row.str(column));
      if (output === '' || inputs.includes(output)) continue; // rerolls do not create the item
      const made = cubeMade.get(output) ?? { coupon: false, plain: false };
      if (coupon) made.coupon = true;
      else made.plain = true;
      cubeMade.set(output, made);
    }
  }

  const cubeLabels = (ref: string): SourceLabel[] => {
    const made = cubeMade.get(ref);
    if (made === undefined) return [];
    return [...(made.coupon ? [label('cube', 'Cube: Ancient Coupon')] : []), ...(made.plain ? [label('cube', 'Cube')] : [])];
  };

  /** Labels from treasure classes naming this ref directly */
  const namedDropLabels = (monsters: DropMonster[]): SourceLabel[] => {
    const names = [...new Set(monsters.map((monster) => monster.name))].sort((a, b) => a.localeCompare(b));
    if (names.length === 0) return [];
    if (names.length <= BOSS_MAX_MONSTERS) return [label('boss', `Drops from ${names.join(', ')}`)];
    return monsters.every((monster) => monster.map) ? [label('maps', 'Drops in Endgame Maps')] : [label('drop', 'Drops (random)')];
  };

  /** Random unique/set roll on a base: endgame maps when the item level needs map monsters (or the base only drops there) */
  const randomDropLabel = (level: number, baseCode: string): SourceLabel => {
    const base = bases.get(baseCode);
    const baseMonsters = base?.kind === 'misc' ? drops.monstersFor(baseCode) : [];
    const mapsOnly = level >= MAP_ITEM_LEVEL || (baseMonsters.length > 0 && baseMonsters.every((monster) => monster.map));
    return mapsOnly ? label('maps', 'Drops in Endgame Maps') : label('drop', 'Drops (random)');
  };

  /** Weapons and armor roll through auto-TCs when spawnable; misc bases only when a treasure class names them */
  const baseCanDrop = (baseCode: string): boolean => {
    const base = bases.get(baseCode);
    if (base === undefined || base.row.num('spawnable') !== 1) return false;
    return base.kind !== 'misc' || drops.monstersFor(baseCode).length > 0;
  };

  const vendorLabels = (code: string): SourceLabel[] => {
    const base = bases.get(code);
    if (base === undefined) return [];
    return VENDORS.filter((npc) => optNum(base.row, `${npc}Min`) > 0 || optNum(base.row, `${npc}Max`) > 0).map((npc) =>
      label('buy', `Buy: ${npc}`)
    );
  };

  const inGamble = (baseCode: string): boolean => {
    const base = bases.get(baseCode);
    if (base === undefined) return false;
    return [baseCode, optStr(base.row, 'normcode'), optStr(base.row, 'ubercode'), optStr(base.row, 'ultracode')].some((code) =>
      gamble.has(code)
    );
  };

  const items: ItemSource[] = [];
  const add = (name: string, code: string, item: ItemSource['item'], found: SourceLabel[]) => {
    const labels: SourceLabel[] = [];
    for (const entry of found) if (!labels.some((known) => known.text === entry.text)) labels.push(entry);
    labels.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    items.push({ name, code, item, labels: labels.length > 0 ? labels : [label('unknown', 'Unknown')] });
  };

  for (const row of tables.uniqueitems.rows) {
    const index = row.str('index');
    if (index === '' || row.num('disabled') === 1) continue;
    const code = row.str('code');
    if (!bases.has(code)) warnings.push(`sources: unique "${index}" has unknown base "${code}"`);
    const rarity = row.num('rarity');
    const random = row.num('spawnable') === 1 && rarity > 0 && baseCanDrop(code);
    add(nameOf(index, index), code, 'unique', [
      ...cubeLabels(index),
      ...namedDropLabels(drops.monstersFor(index)),
      ...(random ? [randomDropLabel(row.num('lvl'), code)] : []),
      ...(rarity > 0 && inGamble(code) ? [label('gamble', 'Gamble')] : []),
      ...(pluginUniques.has(index) ? [label('plugin', 'Boss drop (launcher plugin)')] : []),
    ]);
  }

  for (const row of tables.setitems.rows) {
    const index = row.str('index');
    if (index === '' || row.num('disabled') === 1) continue;
    const code = row.str('item');
    add(nameOf(index, index), code, 'set', [
      ...cubeLabels(index),
      ...namedDropLabels(drops.monstersFor(index)),
      ...(row.num('spawnable') === 1 ? [randomDropLabel(row.num('lvl'), code)] : []),
    ]);
  }

  for (const row of tables.misc.rows) {
    const code = row.str('code');
    if (code === '' || NOISE_TYPES.has(row.str('type'))) continue;
    const monsters = drops.monstersFor(code);
    const vendors = vendorLabels(code);
    if (!cubeInputs.has(code) && !cubeMade.has(code) && vendors.length === 0 && monsters.length === 0) continue;
    add(nameOf(row.str('namestr'), row.str('name')), code, 'misc', [...cubeLabels(code), ...namedDropLabels(monsters), ...vendors]);
  }

  // Misc variants sharing a name and labels (47 "Rune Stocker" rows, …) add nothing for a lookup by name: keep the first
  const seenMisc = new Set<string>();
  const deduped = items.filter((source) => {
    if (source.item !== 'misc') return true;
    const key = JSON.stringify([source.name, source.labels]);
    if (seenMisc.has(key)) return false;
    seenMisc.add(key);
    return true;
  });

  return { bundle: { items: deduped }, warnings };
}
