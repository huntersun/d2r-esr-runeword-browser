import { describe, expect, it } from 'vitest';
import { buildAreasBundle, mapTierLevel, readUniquePacks } from './bundleAreas.ts';

const MONSTER_COLUMNS = ['mon1', 'mon2', 'nmon1', 'umon1'];
const COLUMNS = [
  'Name',
  '*Map Boss',
  'Id',
  'Act',
  ...['Vis0', 'Vis1', 'Vis2', 'Vis3', 'Vis4', 'Vis5', 'Vis6', 'Vis7'],
  'MonLvl',
  'MonLvl(N)',
  'MonLvl(H)',
  'MonLvlEx',
  'MonLvlEx(N)',
  'MonLvlEx(H)',
  'MonDen',
  'MonDen(N)',
  'MonDen(H)',
  'MonUMin',
  'MonUMax',
  'MonUMin(N)',
  'MonUMax(N)',
  'MonUMin(H)',
  'MonUMax(H)',
  ...MONSTER_COLUMNS,
  'Waypoint',
  'LevelName',
  'LevelGroup',
  'PreventTownPortal',
];

interface RowSpec {
  name: string;
  boss?: string;
  id: string;
  act?: string;
  vis?: [string, string];
  /** MonLvl N/NM/H then MonLvlEx N/NM/H */
  lvl?: string[];
  den?: string[];
  uniques?: string[];
  mon?: string;
  waypoint?: string;
  levelName?: string;
  group?: string;
  noTp?: boolean;
}

function row(spec: RowSpec): string[] {
  return [
    spec.name,
    spec.boss ?? '',
    spec.id,
    spec.act ?? '0',
    ...(spec.vis ?? ['0', '0']),
    ...['0', '0', '0', '0', '0', '0'],
    ...(spec.lvl ?? ['', '', '', '', '', '']),
    ...(spec.den ?? ['0', '0', '0']),
    ...(spec.uniques ?? ['', '', '', '', '', '']),
    spec.mon ?? '',
    '',
    '',
    '',
    spec.waypoint ?? '255',
    spec.levelName ?? '',
    spec.group ?? '',
    spec.noTp === true ? '1' : '0',
  ];
}

const text = (rows: string[][]) => [COLUMNS, ...rows].map((cells) => cells.join('\t')).join('\n');
const LEVELS = text([
  row({ name: 'Null', id: '0', vis: ['0', '0'] }),
  row({ name: 'Act 1 - Town', id: '1', waypoint: '0', levelName: 'Rogue Encampment', vis: ['2', '2'], noTp: true }),
  row({
    name: 'Act 1 - Wilderness 1',
    id: '2',
    vis: ['1', '3'],
    lvl: ['1', '26', '51', '2', '38', '68'],
    den: ['520', '1000', '1500'],
    uniques: ['2', '4', '6', '5', '8', '10'],
    mon: 'zombie1',
    levelName: 'Blood Moor',
  }),
  row({ name: 'Act 1 - Tower 1', id: '3', vis: ['2', '0'], lvl: ['7', '32', '57', '8', '40', '72'], levelName: 'Forgotten Tower' }),
  ['Expansion', ...COLUMNS.slice(1).map(() => '')],
  row({
    name: 'Act 5 - Colossal Summit',
    id: '4',
    act: '4',
    lvl: ['39', '64', '89', '45', '68', '91'],
    mon: 'x',
    levelName: 'ColossalSummit',
  }),
  row({
    name: 'Tier 1 Map - Chasm of Horror Prep Zone',
    id: '5',
    act: '4',
    vis: ['0', '6'],
    lvl: ['100', '100', '100', '100', '100', '100'],
    levelName: 'Chasm of Horrors',
    group: 'Tier 1 Map - Chasm of Horrors',
  }),
  row({
    name: 'Tier 1 Map - Chasm of Horror Level 1',
    id: '6',
    act: '4',
    vis: ['5', '7'],
    lvl: ['100', '100', '100', '100', '100', '100'],
    den: ['2000', '2000', '2000'],
    uniques: ['30', '40', '30', '40', '30', '40'],
    mon: 'harbinger',
    levelName: 'Chasm of Horrors Level 1',
    group: 'Tier 1 Map - Chasm of Horrors',
  }),
  row({
    name: 'Tier 1 Map - Chasm of Horror Level 2',
    boss: "Diablo's Hellhound",
    id: '7',
    act: '4',
    vis: ['6', '6'],
    lvl: ['100', '100', '100', '102', '102', '102'],
    levelName: 'Chasm of Horrors Level 2',
    group: 'Tier 2 Map - Chasm of Horrors',
  }),
  row({
    name: 'Unique Map - Goblin Realm',
    id: '8',
    act: '4',
    vis: ['99', '0'],
    lvl: ['106', '106', '106', '106', '106', '106'],
    den: ['1500', '1500', '1500'],
    mon: 'goblin',
    levelName: 'The Hidden Vault',
  }),
]);
const STRINGS = new Map([
  ['Rogue Encampment', 'Rogue Encampment'],
  ['Blood Moor', 'Blood Moor'],
  ['Forgotten Tower', 'Forgotten Tower'],
  ['Chasm of Horrors Level 1', 'Chasm of Horrors Level 1'],
  ['Chasm of Horrors Level 2', 'Chasm of Horrors Level 2'],
  ['The Hidden Vault', 'The Hidden Vault'],
]);

const result = buildAreasBundle({ levelsText: LEVELS, strings: STRINGS });
const byId = new Map(result.bundle.areas.map((area) => [area.id, area]));

describe('buildAreasBundle', () => {
  it('leaves out the null row, the Expansion marker and the map entrances', () => {
    expect(result.bundle.areas.map((area) => area.id)).toEqual([1, 2, 3, 4, 6, 7, 8]);
    expect(result.hidden).toEqual({ prepZones: 1, other: 1 });
    expect(result.uniquesMinsThenMaxes).toBe(1);
  });

  it('reads the expansion monster level, density and unique packs per difficulty', () => {
    expect(byId.get(2)).toEqual({
      id: 2,
      name: 'Blood Moor',
      act: 0,
      waypoint: false,
      level: [2, 38, 68],
      density: [520, 1000, 1500],
      uniques: [
        [2, 5],
        [4, 8],
        [6, 10],
      ],
      connections: [1, 3],
    });
  });

  it('keeps towns with a waypoint and no level, and areas without monsters without a level', () => {
    expect(byId.get(1)).toMatchObject({ name: 'Rogue Encampment', waypoint: true, level: null, density: null, uniques: null });
    expect(byId.get(1)?.preventTownPortal).toBe(true);
    expect(byId.get(1)?.connections).toEqual([2]);
    expect(byId.get(3)?.level).toBeNull();
  });

  it('falls back to the internal name without its act prefix when the string is missing', () => {
    expect(byId.get(4)?.name).toBe('Colossal Summit');
  });

  it('reads map tiers, zone groups and bosses, and drops connections to hidden rows', () => {
    expect(byId.get(6)).toMatchObject({ tier: 1, group: 'Chasm of Horrors', level: [100, 100, 100], connections: [7] });
    expect(byId.get(7)).toMatchObject({ tier: 1, boss: "Diablo's Hellhound", level: [102, 102, 102], density: null, connections: [6] });
    expect(byId.get(8)).toMatchObject({ uniqueMap: true, group: 'Goblin Realm', name: 'The Hidden Vault', connections: [] });
    expect(byId.get(8)?.tier).toBeUndefined();
  });

  it('warns when a map tier disagrees with its level or LevelGroup, or a Vis names an unknown level', () => {
    expect(result.warnings).toEqual([
      'areas: levels.txt 7 (Tier 1 Map - Chasm of Horror Level 2) is tier 1 but its LevelGroup "Tier 2 Map - Chasm of Horrors" says tier 2',
      'areas: levels.txt 7 (Tier 1 Map - Chasm of Horror Level 2) is tier 1 (level 100) but has monster level 102/102/102',
      'areas: levels.txt 8 (Unique Map - Goblin Realm) Vis0 names unknown level 99',
    ]);
  });

  it('numbers the map tier levels 100 to 108', () => {
    expect([1, 2, 3, 4, 5].map(mapTierLevel)).toEqual([100, 102, 104, 106, 108]);
  });
});

describe('readUniquePacks', () => {
  it('re-reads a vanilla row stored mins then maxes', () => {
    expect(readUniquePacks([2, 4, 6, 5, 8, 10])).toEqual({
      packs: [
        [2, 5],
        [4, 8],
        [6, 10],
      ],
      minsThenMaxes: true,
      ok: true,
    });
  });

  it('keeps an ESR row pairwise per the header', () => {
    expect(readUniquePacks([30, 40, 30, 40, 30, 40])).toEqual({
      packs: [
        [30, 40],
        [30, 40],
        [30, 40],
      ],
      minsThenMaxes: false,
      ok: true,
    });
  });

  it('keeps the pairwise values and flags the row when both readings are inverted', () => {
    expect(readUniquePacks([5, 1, 5, 1, 5, 1])).toEqual({
      packs: [
        [5, 1],
        [5, 1],
        [5, 1],
      ],
      minsThenMaxes: false,
      ok: false,
    });
  });
});
