import { affixLevel, MAX_LEVEL } from '../engine/affixEligibility.ts';
import { ancestorsOf, resolveClass } from '../engine/itemTypes.ts';
import {
  isClassCode,
  type Affix,
  type BaseAutomod,
  type BaseItem,
  type BasesBundle,
  type ClassCode,
  type ItemTypeInfo,
  type TypesBundle,
} from '../engine/schema.ts';
import type { BuildResult } from './bundleTypes.ts';
import type { ItemRow, ItemTypeRow } from './model.ts';
import { familyPosition } from './tiers.ts';

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
  const position = familyPosition(code, normcode, ubercode, ultracode);
  // Mythical bases point all three family columns at themselves; so do items without a tier family
  // (rings, charms, jewels, arrows), which are told apart by qlvl.
  if (position === 'self') return row.level >= MYTHICAL_MIN_QLVL ? 'mythical' : 'normal';
  if (position !== null) return position;
  warnings.push(`bases: ${code} (${row.name}) is not in its own tier family [${normcode}, ${ubercode}, ${ultracode}]; treated as normal`);
  return 'normal';
}

/** Identity of a base for duplicate detection: every field except `code` and `family`. */
function duplicateKey(base: BaseItem): string {
  const { code: _code, family: _family, ...rest } = base;
  return JSON.stringify(rest);
}

/**
 * itemtypes.txt `StaffMods` per type code. The game reads the column of the item's own `type` row only (no Equiv walk);
 * in ESR no `type2` (1hsw / 2hsw) has one.
 */
export function readStaffMods(typeRows: readonly ItemTypeRow[]): BuildResult<Map<string, ClassCode>> {
  const warnings: string[] = [];
  const staffMods = new Map<string, ClassCode>();
  for (const row of typeRows) {
    if (row.staffMods === '') continue;
    if (isClassCode(row.staffMods)) staffMods.set(row.code, row.staffMods);
    else warnings.push(`itemtypes: "${row.code}" has unknown StaffMods "${row.staffMods}"; ignored`);
  }
  return { bundle: staffMods, warnings };
}

export function buildBasesBundle(
  items: readonly ItemRow[],
  typesBundle: TypesBundle,
  strings: ReadonlyMap<string, string>,
  staffMods: ReadonlyMap<string, ClassCode> = new Map()
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
    const staffModClass = staffMods.get(row.type);
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
      ...(row.rangeadder !== 0 && { range: row.rangeadder }),
      strBonus: row.strBonus,
      dexBonus: row.dexBonus,
      def: pair(row.minac, row.maxac),
      block: ancestors.includes('shld') ? row.block : null,
      durability: row.durability,
      indestructible: row.nodurability === 1,
      magicLvl: row.magicLvl,
      autoGroup: row.autoPrefix === 0 ? null : row.autoPrefix,
      ...(staffModClass !== undefined && { staffMods: staffModClass }),
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

/** Lowest and highest affix level a base can reach over item levels 1–99 (affixLevel is monotonic in ilvl). */
function affixLevelSpan(base: Pick<BaseItem, 'qlvl' | 'magicLvl'>): [number, number] {
  return [affixLevel(1, base.qlvl, base.magicLvl), affixLevel(MAX_LEVEL, base.qlvl, base.magicLvl)];
}

/** Whether an automagic row can roll on a base at some item level (same rules as `eligibleAffixes`, any ilvl). */
export function canRollAutomod(affix: Affix, base: Pick<BaseItem, 'qlvl' | 'magicLvl' | 'autoGroup' | 'cls' | 'ancestors'>): boolean {
  const [minAlvl, maxAlvl] = affixLevelSpan(base);
  return (
    affix.kind === 'a' &&
    affix.group === base.autoGroup &&
    affix.freq > 0 &&
    affix.lvl <= maxAlvl &&
    (affix.maxLvl === 0 || affix.maxLvl >= minAlvl) &&
    affix.itypes.some((code) => base.ancestors.includes(code)) &&
    !affix.etypes.some((code) => base.ancestors.includes(code)) &&
    (base.cls === null || affix.cls === null || affix.cls === base.cls)
  );
}

/**
 * Adds the automagic rows each base can roll (`BaseItem.automods`) and the referenced rows (`BasesBundle.automods`,
 * sorted by id) from the built affixes. Placeholder rows dropped by the affixes bundle (no visible stat) never appear.
 */
export function attachAutomods(bundle: BasesBundle, affixes: readonly Affix[]): BasesBundle {
  const automagic = affixes.filter((affix) => affix.kind === 'a');
  const used = new Map<number, BaseAutomod>();
  const bases = bundle.bases.map((base) => {
    if (base.autoGroup === null) return base;
    const rows = automagic.filter((affix) => canRollAutomod(affix, base));
    if (rows.length === 0) return base;
    for (const { id, name, lvl, maxLvl, reqLvl, text } of rows) used.set(id, { id, name, lvl, maxLvl, reqLvl, text });
    // Keep the key next to autoGroup so the JSON reads naturally
    const { autoGroup, staffMods, cls, inv, ...head } = base;
    return {
      ...head,
      autoGroup,
      automods: rows.map((affix) => affix.id),
      ...(staffMods !== undefined && { staffMods }),
      cls,
      inv,
    };
  });
  return { bases, automods: [...used.values()].sort((a, b) => a.id - b.id) };
}
