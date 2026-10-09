import { ancestorsOf, resolveClass } from '../engine/itemTypes.ts';
import type { BaseItem, BasesBundle, ClassCode, ItemTypeInfo, TypesBundle } from '../engine/schema.ts';
import type { BuildResult } from './bundleTypes.ts';
import type { ItemRow } from './model.ts';

/**
 * misc.txt rows are only included when their type ancestors contain one of these itemtypes codes
 * (equippable accessories): Ring, Amulet, Charm, Jewel, Bow Quiver, Crossbow Quiver.
 * Class rings/amulets (zrin, wamu, …) and charm sizes (scha, mcha, lcha, …) reach these through Equiv.
 * ESR's quivers in misc.txt are not spawnable; the spawnable "Magic Arrows/Bolts" live in weapons.txt.
 */
export const ACCESSORY_TYPES: readonly string[] = ['ring', 'amul', 'char', 'jewl', 'bowq', 'xboq'];

/** Bases with a self-referential tier family at or above this qlvl are ESR Mythical bases (qlvl 96 / 100). */
const MYTHICAL_MIN_QLVL = 90;

function isPlayerFacing(row: ItemRow): boolean {
  return row.spawnable === 1 && row.quest === 0;
}

function pair(min: number, max: number): [number, number] | null {
  return min === 0 && max === 0 ? null : [min, max];
}

function tierOf(row: ItemRow, warnings: string[]): BaseItem['tier'] {
  const { code, normcode, ubercode, ultracode } = row;
  if (normcode === code && ubercode === code && ultracode === code) {
    // Mythical bases point all three family columns at themselves; so do items without a tier family
    // (rings, charms, jewels, arrows), which are told apart by qlvl.
    return row.level >= MYTHICAL_MIN_QLVL ? 'mythical' : 'normal';
  }
  if (code === normcode) return 'normal';
  if (code === ubercode) return 'exceptional';
  if (code === ultracode) return 'elite';
  warnings.push(`bases: ${code} (${row.name}) is not in its own tier family [${normcode}, ${ubercode}, ${ultracode}]; treated as normal`);
  return 'normal';
}

/** Identity of a base for duplicate detection: every field except `code` and `family`. */
function duplicateKey(base: BaseItem): string {
  const { code: _code, family: _family, ...rest } = base;
  return JSON.stringify(rest);
}

export function buildBasesBundle(
  items: readonly ItemRow[],
  typesBundle: TypesBundle,
  strings: ReadonlyMap<string, string>
): BuildResult<BasesBundle> & { duplicates: number } {
  const warnings: string[] = [];
  const types = new Map<string, ItemTypeInfo>(typesBundle.types.map((t) => [t.code, t]));
  const parents = new Map(typesBundle.types.map((t) => [t.code, t.parents]));
  const classOf = new Map<string, ClassCode | null>(typesBundle.types.map((t) => [t.code, t.cls]));
  const allCodes = new Set(items.map((row) => row.code));

  const bases: BaseItem[] = [];
  const seen = new Map<string, string>();
  const dropped: string[] = [];
  for (const row of items) {
    if (!isPlayerFacing(row)) continue;

    const ownType = types.get(row.type);
    if (ownType === undefined) {
      warnings.push(`bases: ${row.code} (${row.name}) has unknown type "${row.type}"; skipped`);
      continue;
    }
    if (row.type2 !== '' && !types.has(row.type2)) {
      warnings.push(`bases: ${row.code} (${row.name}) has unknown type2 "${row.type2}"; ignored`);
    }
    const type2 = row.type2 !== '' && types.has(row.type2) ? row.type2 : null;
    const ancestors = ancestorsOf([row.type, type2], parents);
    if (row.kind === 'misc' && !ancestors.some((code) => ACCESSORY_TYPES.includes(code))) continue;

    let name = strings.get(row.namestr);
    if (name === undefined) {
      warnings.push(`bases: ${row.code} name string "${row.namestr}" not found; using "${row.name}"`);
      name = row.name;
    }

    for (const familyCode of [row.normcode, row.ubercode, row.ultracode]) {
      if (familyCode !== '' && !allCodes.has(familyCode)) {
        warnings.push(`bases: ${row.code} (${row.name}) family code "${familyCode}" does not exist`);
      }
    }

    const tier = tierOf(row, warnings);
    // ESR mythical accessories (mam/mrn/mjw) reuse the plain amu/rin/jew name strings
    if (tier === 'mythical' && !name.startsWith('Mythical')) {
      warnings.push(`bases: ${row.code} is mythical but its name string is "${name}"; using "${row.name}"`);
      name = row.name;
    }

    const caps = ownType.sockets;
    const base: BaseItem = {
      code: row.code,
      name,
      kind: row.kind,
      type: row.type,
      type2,
      ancestors,
      tier,
      family: [row.normcode, row.ubercode, row.ultracode],
      qlvl: row.level,
      reqLvl: row.levelreq,
      reqStr: row.reqstr,
      reqDex: row.reqdex,
      gemSockets: row.gemsockets,
      socketCaps: [Math.min(row.gemsockets, caps[0]), Math.min(row.gemsockets, caps[1]), Math.min(row.gemsockets, caps[2])],
      dmg1: pair(row.mindam, row.maxdam),
      dmg2: pair(row.twoHandMindam, row.twoHandMaxdam),
      throwDmg: pair(row.minmisdam, row.maxmisdam),
      speed: row.speed,
      strBonus: row.strBonus,
      dexBonus: row.dexBonus,
      def: pair(row.minac, row.maxac),
      block: ancestors.includes('shld') ? row.block : null,
      durability: row.durability,
      indestructible: row.nodurability === 1,
      magicLvl: row.magicLvl,
      autoGroup: row.autoPrefix === 0 ? null : row.autoPrefix,
      cls: resolveClass(ancestors, classOf),
      inv: [row.invwidth, row.invheight],
    };

    // Exact duplicates (e.g. ESR's cx1-3 copies of the cm1-3 charms) are dropped; the first row in file order wins
    const key = duplicateKey(base);
    const original = seen.get(key);
    if (original !== undefined) {
      dropped.push(`${base.code} (duplicate of ${original})`);
      continue;
    }
    seen.set(key, base.code);
    bases.push(base);
  }

  if (dropped.length > 0) warnings.push(`bases: dropped ${dropped.join(', ')}`);
  return { bundle: { bases }, warnings, duplicates: dropped.length };
}
