import { describe, it, expect } from 'vitest';
import type { TypesBundle } from '../engine/schema.ts';
import { buildAffixesBundle } from './bundleAffixes.ts';
import { readAffixes } from './model.ts';
import { testRenderer } from './stats/testContext.mock.ts';
import { parseTsv } from './tsv.ts';

const COLUMNS = [
  'Name',
  'version',
  'spawnable',
  'rare',
  'level',
  'maxlevel',
  'levelreq',
  'classspecific',
  'class',
  'classlevelreq',
  'frequency',
  'group',
  'mod1code',
  'mod1param',
  'mod1min',
  'mod1max',
  'mod2code',
  'mod2param',
  'mod2min',
  'mod2max',
  'mod3code',
  'mod3param',
  'mod3min',
  'mod3max',
  'transformcolor',
  'itype1',
  'itype2',
  'itype3',
  'itype4',
  'itype5',
  'itype6',
  'itype7',
  'etype1',
  'etype2',
  'etype3',
  'etype4',
  'etype5',
  'multiply',
  'add',
];

interface RowSpec {
  name: string;
  spawnable?: string;
  rare?: string;
  level?: number;
  maxlevel?: number;
  levelreq?: number;
  classspecific?: string;
  cls?: string;
  classlevelreq?: number;
  frequency?: number;
  group?: number;
  mods?: string[][];
  itypes?: string[];
  etypes?: string[];
}

function row(spec: RowSpec): string[] {
  const mods = spec.mods ?? [];
  return [
    spec.name,
    '100',
    spec.spawnable ?? '1',
    spec.rare ?? '1',
    String(spec.level ?? 1),
    String(spec.maxlevel ?? ''),
    String(spec.levelreq ?? 1),
    spec.classspecific ?? '',
    spec.cls ?? '',
    String(spec.classlevelreq ?? ''),
    String(spec.frequency ?? 10),
    String(spec.group ?? 1),
    ...[0, 1, 2].flatMap((i) => mods[i] ?? ['', '', '', '']),
    'blue',
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => spec.itypes?.[i] ?? ''),
    ...[0, 1, 2, 3, 4].map((i) => spec.etypes?.[i] ?? ''),
    '0',
    '0',
  ];
}

const table = (rows: RowSpec[]) => parseTsv([COLUMNS, ...rows.map(row)].map((cells) => cells.join('\t')).join('\n'), 'affix.txt');
const typesBundle = { types: ['armo', 'weap', 'shld', 'amaz'].map((code) => ({ code })), classes: [] } as unknown as TypesBundle;
const strings = new Map([
  ['of the Fox', 'of the Fox'],
  ['Sturdy', 'Sturdy'],
]);
const renderer = testRenderer();
const renderMods = (mods: Parameters<typeof renderer.renderMods>[0]) => renderer.renderMods(mods);

function build(prefixes: RowSpec[], suffixes: RowSpec[] = [], automagic: RowSpec[] = []) {
  const rows = [...readAffixes(table(prefixes), 'p'), ...readAffixes(table(suffixes), 's'), ...readAffixes(table(automagic), 'a')];
  return buildAffixesBundle(rows, typesBundle, strings, renderMods);
}

describe('buildAffixesBundle', () => {
  it('maps the columns, mods and rendered text', () => {
    const { bundle, warnings } = build([
      {
        name: 'Sturdy',
        level: 4,
        maxlevel: 25,
        levelreq: 3,
        frequency: 28,
        group: 101,
        mods: [['ac%', '', '10', '20']],
        itypes: ['armo'],
        etypes: ['shld'],
      },
    ]);
    expect(warnings).toEqual([]);
    expect(bundle.affixes).toEqual([
      {
        id: 0,
        kind: 'p',
        name: 'Sturdy',
        lvl: 4,
        maxLvl: 25,
        reqLvl: 3,
        cls: null,
        reqCls: null,
        clsReqLvl: 0,
        freq: 28,
        group: 101,
        rare: true,
        itypes: ['armo'],
        etypes: ['shld'],
        mods: [{ prop: 'ac%', param: null, min: 10, max: 20 }],
        text: ['Requirements +(10 to 20)%'],
      },
    ]);
  });

  it('numbers ids per kind in file order, counting dropped rows, and drops spawnable != 1', () => {
    const { bundle, dropped } = build(
      [{ name: 'Sturdy', spawnable: '0' }, { name: 'Sturdy' }],
      [{ name: 'of the Fox', rare: '0', mods: [['str', '', '1', '3']] }]
    );
    expect(dropped).toBe(1);
    expect(bundle.affixes.map((affix) => [affix.kind, affix.id, affix.name, affix.rare])).toEqual([
      ['p', 1, 'Sturdy', true],
      ['s', 0, 'of the Fox', false],
    ]);
  });

  it('resolves class columns and warns on unknown classes and item types', () => {
    const { bundle, warnings } = build([
      { name: "Lancer's", classspecific: 'ama', cls: 'ama', classlevelreq: 5, itypes: ['amaz'] },
      { name: 'Odd', classspecific: 'xyz', itypes: ['nope'] },
    ]);
    expect(bundle.affixes.map((affix) => [affix.name, affix.cls, affix.reqCls, affix.clsReqLvl])).toEqual([
      ["Lancer's", 'ama', 'ama', 5],
      ['Odd', null, null, 0],
    ]);
    expect(warnings.sort()).toEqual([
      'affixes: p1 "Odd" has unknown classspecific "xyz"',
      'affixes: p1 "Odd" references unknown item type "nope"',
    ]);
  });

  it('keeps automagic "null" placeholders only when a stat is visible, with an empty name', () => {
    const { bundle, droppedPlaceholders } = build(
      [],
      [],
      [
        { name: 'null', mods: [['tinkerflag2', '', '25', '35']] },
        {
          name: 'null',
          mods: [
            ['tinkerflag2', '', '25', '35'],
            ['str', '', '5', '5'],
          ],
        },
      ]
    );
    expect(droppedPlaceholders).toBe(1);
    expect(bundle.affixes.map((affix) => [affix.kind, affix.id, affix.name, affix.text])).toEqual([['a', 1, '', ['+5 to Strength']]]);
  });
});
