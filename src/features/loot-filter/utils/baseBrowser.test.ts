import type { BaseItem, BasesBundle, ItemTypeInfo, TypesBundle } from '@/features/game-data/engine/schema';
import { buildBaseBrowserModel, getBaseBrowserModel } from './baseBrowser';
import {
  allCodes,
  applyBrowserSelection,
  filterBrowser,
  initialBrowserSelection,
  toggleCodes,
  triState,
  typeCodes,
  type BrowserType,
} from './browserModel';

const type = (code: string, name: string, cls: ItemTypeInfo['cls'] = null): ItemTypeInfo => ({
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

const base = (
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

const TYPES = [
  type('helm', 'Helm'),
  type('axe', 'Axe'),
  type('ring', 'Ring'),
  type('h2h1', 'Claw A', 'ass'),
  type('h2h2', 'Claw B', 'ass'),
];

const capFamily: [string, string, string] = ['cap', 'xap', 'yap'];
const skullFamily: [string, string, string] = ['skp', 'xkp', 'ykp'];
const axeFamily: [string, string, string] = ['hax', '9ha', '7ha'];
const clawFamily: [string, string, string] = ['ktr', '9ar', '7ar'];

const BASES = [
  base('skp', 'Skull Cap', 'helm', 'normal', skullFamily, 5, { reqStr: 15 }),
  base('cap', 'Cap', 'helm', 'normal', capFamily, 1),
  base('xap', 'War Hat', 'helm', 'exceptional', capFamily, 22),
  base('yap', 'Hood', 'helm', 'elite', capFamily, 40),
  base('xkp', 'Sallet', 'helm', 'exceptional', skullFamily, 25),
  base('ykp', 'Hydraskull', 'helm', 'elite', skullFamily, 50),
  base('m01', 'Mythical Hood', 'helm', 'mythical', ['m01', 'm01', 'm01'], 96),
  base('hax', 'Hand Axe', 'axe', 'normal', axeFamily, 3, { kind: 'weapon', def: null, dmg1: [3, 6], speed: 0, reqLvl: 2 }),
  base('9ha', 'Hatchet', 'axe', 'exceptional', axeFamily, 31, { kind: 'weapon', def: null, dmg1: [10, 21] }),
  base('rin', 'Ring', 'ring', 'normal', ['rin', 'rin', 'rin'], 1, { kind: 'misc', def: null, socketCaps: [0, 0, 0] }),
  base('mri', 'Mythical Ring', 'ring', 'mythical', ['mri', 'mri', 'mri'], 100, { kind: 'misc', def: null }),
  base('ktr', 'Katar', 'h2h1', 'normal', clawFamily, 1, { kind: 'weapon', cls: 'ass' }),
  base('9ar', 'Quhab', 'h2h1', 'exceptional', clawFamily, 28, { kind: 'weapon', cls: 'ass' }),
  base('7ar', 'Suwayyah', 'h2h2', 'elite', clawFamily, 55, { kind: 'weapon', cls: 'ass' }),
  // A second normal base in a family it does not head (ESR has such duplicates).
  base('q86', 'Katar Copy', 'h2h2', 'normal', clawFamily, 74, { kind: 'weapon', cls: 'ass' }),
];

const MODEL = buildBaseBrowserModel(BASES, TYPES);

function findType(code: string): BrowserType {
  const found = MODEL.groups.flatMap((group) => group.types).find((candidate) => candidate.code === code);
  if (found === undefined) throw new Error(`no type ${code}`);
  return found;
}

const rowNames = (browserType: BrowserType) => browserType.rows.map((row) => row.cells.map((cell) => cell?.name ?? null));

describe('buildBaseBrowserModel', () => {
  it('groups types like the type picker', () => {
    expect(MODEL.groups.map((group) => [group.label, group.types.map((t) => t.code)])).toEqual([
      ['Weapons', ['axe']],
      ['Class weapons', ['h2h1', 'h2h2']],
      ['Armor', ['helm']],
      ['Accessories', ['ring']],
    ]);
  });

  it('puts each family in one row, by the normal member’s quality level, with the mythical bases apart', () => {
    const helm = findType('helm');
    expect(helm.layout).toBe('grid');
    expect(helm.columns.map((column) => column.label)).toEqual(['Normal', 'Exceptional', 'Elite']);
    expect(rowNames(helm)).toEqual([
      ['Cap', 'War Hat', 'Hood'],
      ['Skull Cap', 'Sallet', 'Hydraskull'],
    ]);
    expect(helm.extras.map((b) => b.code)).toEqual(['m01']);
    expect(helm.extrasColumn?.key).toBe('mythical');
    expect(rowNames(findType('axe'))).toEqual([['Hand Axe', 'Hatchet', null]]);
  });

  it('keeps a family spanning two types under its lowest member’s type', () => {
    expect(rowNames(findType('h2h1'))).toEqual([['Katar', 'Quhab', 'Suwayyah']]);
    // The duplicate gets its own row; without exceptional or elite bases the type is a list.
    expect(findType('h2h2')).toMatchObject({ layout: 'list', items: [{ code: 'q86' }] });
  });

  it('lists types without exceptional or elite bases', () => {
    expect(findType('ring')).toMatchObject({ layout: 'list', rows: [], extras: [] });
    expect(findType('ring').items.map((b) => b.code)).toEqual(['rin', 'mri']);
  });

  it('summarises the stats on one line', () => {
    const [axeRow] = findType('axe').rows;
    expect(axeRow?.cells[0]?.stats).toBe('1H 3–6 · Speed 0 · Lvl 2 · 2 os · qlvl 3');
    expect(findType('helm').rows[1]?.cells[0]?.stats).toBe('Def 3–5 · Str 15 · 2 os · qlvl 5');
    expect(findType('ring').items[0]?.stats).toBe('qlvl 1');
  });

  it('lists every code once in display order', () => {
    expect(MODEL.codes).toEqual(['hax', '9ha', 'ktr', '9ar', '7ar', 'q86', 'cap', 'xap', 'yap', 'skp', 'xkp', 'ykp', 'm01', 'rin', 'mri']);
  });

  it('is cached per bundle pair', () => {
    const bases: BasesBundle = { bases: BASES };
    const types: TypesBundle = { types: TYPES, classes: [] };
    expect(getBaseBrowserModel(bases, types)).toBe(getBaseBrowserModel(bases, types));
    expect(getBaseBrowserModel({ bases: BASES }, types)).not.toBe(getBaseBrowserModel(bases, types));
  });
});

describe('filterBrowser', () => {
  it('returns the groups unchanged for a blank query', () => {
    expect(filterBrowser(MODEL.groups, '  ')).toBe(MODEL.groups);
  });

  it('keeps whole family rows matching every term in names, codes or the type name', () => {
    const groups = filterBrowser(MODEL.groups, 'HELM sallet');
    expect(groups.map((group) => group.label)).toEqual(['Armor']);
    expect(allCodes(groups)).toEqual(['skp', 'xkp', 'ykp']);
    expect(allCodes(filterBrowser(MODEL.groups, 'yap'))).toEqual(['cap', 'xap', 'yap']);
  });

  it('filters mythical and list bases one by one and drops empty types', () => {
    expect(allCodes(filterBrowser(MODEL.groups, 'mythical'))).toEqual(['m01', 'mri']);
    expect(filterBrowser(MODEL.groups, 'nothing')).toEqual([]);
  });
});

describe('selection', () => {
  it('collects a type’s codes, optionally of one tier', () => {
    expect(typeCodes(findType('helm'))).toEqual(['cap', 'xap', 'yap', 'skp', 'xkp', 'ykp', 'm01']);
    expect(typeCodes(findType('helm'), 'elite')).toEqual(['yap', 'ykp']);
    expect(typeCodes(findType('helm'), 'mythical')).toEqual(['m01']);
    expect(allCodes(MODEL.groups, 'mythical')).toEqual(['m01', 'mri']);
  });

  it('computes the tri-state', () => {
    expect(triState(['a', 'b'], new Set(['a', 'b', 'c']))).toBe('all');
    expect(triState(['a', 'b'], new Set(['b']))).toBe('some');
    expect(triState(['a', 'b'], new Set())).toBe('none');
    expect(triState([], new Set(['a']))).toBe('none');
  });

  it('toggles many codes without touching the input', () => {
    const selected = new Set(['a']);
    expect([...toggleCodes(selected, ['b', 'c'], true)]).toEqual(['a', 'b', 'c']);
    expect([...toggleCodes(selected, ['a', 'b'], false)]).toEqual([]);
    expect([...selected]).toEqual(['a']);
  });

  it('starts from the values the browser knows', () => {
    expect([...initialBrowserSelection(['r33', 'cap', 'uap'], MODEL.codes)]).toEqual(['cap']);
  });

  it('applies the draft: unknown codes stay in place, dropped codes go, new codes follow in display order', () => {
    const values = ['r33', 'yap', 'cap', 'uap'];
    const draft = new Set(['cap', 'skp', 'hax', 'xap']);
    expect(applyBrowserSelection(values, MODEL.codes, draft)).toEqual(['r33', 'cap', 'uap', 'hax', 'xap', 'skp']);
    expect(applyBrowserSelection(values, MODEL.codes, new Set())).toEqual(['r33', 'uap']);
    expect(applyBrowserSelection(values, MODEL.codes, initialBrowserSelection(values, MODEL.codes))).toEqual(values);
  });
});
