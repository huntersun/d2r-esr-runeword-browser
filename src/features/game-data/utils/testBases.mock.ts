import type { BaseItem, ItemTypeInfo } from '../engine/schema';

/** Small base / type fixtures for the family model and families view tests. */

export const type = (code: string, name: string, cls: ItemTypeInfo['cls'] = null): ItemTypeInfo => ({
  code,
  name,
  parents: [],
  ancestors: [code],
  sockets: [3, 3, 3],
  thresholds: [25, 40],
  cls,
  ui: null,
  rwCats: [],
  magic: true,
  rare: true,
  normal: true,
  bodyLoc: null,
});

export const base = (
  code: string,
  name: string,
  typeCode: string,
  tier: BaseItem['tier'],
  family: [string, string, string],
  qlvl: number,
  extra: Partial<BaseItem> = {}
): BaseItem => ({
  code,
  name,
  kind: 'armor',
  type: typeCode,
  type2: null,
  ancestors: [typeCode],
  tier,
  family,
  qlvl,
  reqLvl: 0,
  reqStr: 0,
  reqDex: 0,
  gemSockets: 2,
  socketCaps: [2, 2, 2],
  dmg1: null,
  dmg2: null,
  throwDmg: null,
  speed: 0,
  strBonus: 0,
  dexBonus: 0,
  def: [3, 5],
  block: null,
  durability: 12,
  indestructible: false,
  magicLvl: 0,
  autoGroup: null,
  cls: null,
  inv: [2, 2],
  ...extra,
});

export const TYPES = [type('helm', 'Helm'), type('ring', 'Ring'), type('h2h1', 'Claw A', 'ass'), type('h2h2', 'Claw B', 'ass')];

const capFamily: [string, string, string] = ['cap', 'xap', 'yap'];
const clawFamily: [string, string, string] = ['ktr', '9ar', '7ar'];

export const BASES = [
  base('cap', 'Cap', 'helm', 'normal', capFamily, 1),
  base('xap', 'War Hat', 'helm', 'exceptional', capFamily, 22, { reqStr: 20 }),
  base('yap', 'Hood', 'helm', 'elite', capFamily, 40, { reqLvl: 40 }),
  base('m01', 'Mythical Hood', 'helm', 'mythical', ['m01', 'm01', 'm01'], 96),
  base('rin', 'Ring', 'ring', 'normal', ['rin', 'rin', 'rin'], 1, { kind: 'misc', def: null, socketCaps: [0, 0, 0] }),
  base('ktr', 'Katar', 'h2h1', 'normal', clawFamily, 1, { kind: 'weapon', cls: 'ass', def: null, dmg1: [4, 7] }),
  base('9ar', 'Quhab', 'h2h1', 'exceptional', clawFamily, 28, { kind: 'weapon', cls: 'ass', def: null }),
  base('7ar', 'Suwayyah', 'h2h2', 'elite', clawFamily, 55, { kind: 'weapon', cls: 'ass', def: null }),
  base('q86', 'Katar Copy', 'h2h2', 'normal', clawFamily, 74, { kind: 'weapon', cls: 'ass', def: null }),
];
