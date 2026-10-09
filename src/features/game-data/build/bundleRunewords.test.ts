import { describe, it, expect } from 'vitest';
import type { TypesBundle } from '../engine/schema.ts';
import { buildRunewordsBundle, type ModsRenderer } from './bundleRunewords.ts';
import { readItems, readRuneRecipes } from './model.ts';
import { parseTsv } from './tsv.ts';

const tsv = (rows: string[][]) => rows.map((row) => row.join('\t')).join('\n');

const MISC_COLUMNS = ['name', 'level', 'levelreq', 'code', 'namestr', 'type', 'type2', 'spawnable', 'quest', 'gemsockets'];
const miscRow = (name: string, levelreq: number, code: string, namestr: string) => [
  name,
  '1',
  String(levelreq),
  code,
  namestr,
  'misc',
  '',
  '1',
  '',
  '0',
];
const misc = readItems(
  parseTsv(
    tsv([
      MISC_COLUMNS,
      miscRow('I Rune', 2, 'r01', 'r01'),
      miscRow('Ko Rune', 27, 'r19', 'r19'),
      miscRow('Ko Rune', 39, 'r68', 'r68'),
      miscRow('Eth Rune', 15, 'r55', 'r55'),
      miscRow('Perfect Saphire', 35, 'gbb', 'gbb'),
      miscRow('Perfect Ruby', 35, 'grb', 'grb'),
      miscRow('Jewel', 0, 'jew', 'jew'),
      // ESR's Mythical Jewel reuses the plain jewel name string
      miscRow('Mythical Jewel', 0, 'mjw', 'jew'),
    ]),
    'misc.txt'
  ),
  'misc'
);

const strings = new Map([
  ['r01', 'I Rune'],
  ['r19', 'Ko Rune'],
  ['r68', 'Ko Rune'],
  ['r55', 'Eth Rune'],
  ['gbb', 'Perfect Sapphire'],
  ['grb', 'Perfect Ruby'],
  ['jew', 'Jewel'],
  ['Runeword1', 'Boar'],
  ['Runeword2', 'Moonlight'],
  ['Runeword3', 'America'],
]);

const typeCodes = ['weap', 'misl', 'miss', 'helm', 'shld', 'orb'];
const typesBundle = { types: typeCodes.map((code) => ({ code })), classes: [] } as unknown as TypesBundle;

const RUNES_COLUMNS = [
  'Name',
  '*Rune Name',
  'complete',
  'itype1',
  'itype2',
  'itype3',
  'itype4',
  'itype5',
  'itype6',
  'etype1',
  'etype2',
  'etype3',
];
const MOD_COLUMNS = [1, 2, 3, 4, 5, 6, 7].flatMap((i) => ['Code', 'Param', 'Min', 'Max'].map((part) => `T1${part}${String(i)}`));
const runesRow = (key: string, itypes: string[], etypes: string[], codes: string[], mods: string[][] = []) => [
  key,
  'unreliable comment',
  '1',
  ...[0, 1, 2, 3, 4, 5].map((i) => itypes[i] ?? ''),
  ...[0, 1, 2].map((i) => etypes[i] ?? ''),
  ...[0, 1, 2, 3, 4, 5].map((i) => codes[i] ?? ''),
  ...[0, 1, 2, 3, 4, 5, 6].flatMap((i) => mods[i] ?? ['', '', '', '']),
];

function build(rows: string[][], stringTable: ReadonlyMap<string, string> = strings, renderMods?: ModsRenderer) {
  const recipes = readRuneRecipes(
    parseTsv(tsv([[...RUNES_COLUMNS, 'Rune1', 'Rune2', 'Rune3', 'Rune4', 'Rune5', 'Rune6', ...MOD_COLUMNS], ...rows]), 'runes.txt')
  );
  return buildRunewordsBundle(recipes, misc, typesBundle, stringTable, renderMods);
}

describe('buildRunewordsBundle', () => {
  it('resolves runeword and ingredient names through strings, not the *Rune Name comment', () => {
    const { bundle, warnings } = build([runesRow('Runeword1', ['weap', 'misl'], [], ['r01'])]);
    expect(warnings).toEqual([]);
    expect(bundle.runewords).toEqual([
      {
        key: 'Runeword1',
        name: 'Boar',
        rows: [
          { ingredients: ['I Rune'], codes: ['r01'], jewels: 0, sockets: 1, itypes: ['weap', 'misl'], etypes: [], reqLvl: 2, text: [] },
        ],
      },
    ]);
  });

  it('groups socket variants with jew/mjw under one key, counting jewels in sockets but not in ingredients', () => {
    const { bundle } = build([
      runesRow('Runeword2', ['miss'], [], ['r55', 'r19', 'r01']),
      runesRow('Runeword2', ['miss'], [], ['jew', 'r55', 'r19', 'r01']),
      runesRow('Runeword2', ['miss'], [], ['mjw', 'mjw', 'r55', 'r19', 'r01']),
    ]);
    expect(bundle.runewords).toHaveLength(1);
    const rows = bundle.runewords[0]?.rows ?? [];
    expect(rows.map((row) => [row.sockets, row.jewels])).toEqual([
      [3, 0],
      [4, 1],
      [5, 2],
    ]);
    for (const row of rows) expect(row.ingredients).toEqual(['Eth Rune', 'Ko Rune', 'I Rune']);
    expect(rows[2]?.codes).toEqual(['mjw', 'mjw', 'r55', 'r19', 'r01']);
  });

  it('resolves both Ko Rune codes to the same display name and takes the max ingredient levelreq', () => {
    const { bundle } = build([runesRow('Runeword2', ['miss'], [], ['r68', 'r01']), runesRow('Runeword1', ['weap'], [], ['r19'])]);
    expect(bundle.runewords.map((rw) => [rw.rows[0]?.ingredients, rw.rows[0]?.reqLvl])).toEqual([
      [['Ko Rune', 'I Rune'], 39],
      [['Ko Rune'], 27],
    ]);
  });

  it('includes gem-only runewords with string-resolved gem names', () => {
    const { bundle } = build([runesRow('Runeword3', ['helm'], [], ['jew', 'gbb', 'grb'])]);
    expect(bundle.runewords[0]).toMatchObject({
      name: 'America',
      rows: [{ ingredients: ['Perfect Sapphire', 'Perfect Ruby'], jewels: 1, sockets: 3, reqLvl: 35 }],
    });
  });

  it('skips non-runeword keys and keeps itypes/etypes', () => {
    const { bundle } = build([runesRow('Holy', ['char'], [], ['gbb']), runesRow('Runeword1', ['weap'], ['orb'], ['r01'])]);
    expect(bundle.runewords.map((rw) => rw.key)).toEqual(['Runeword1']);
    expect(bundle.runewords[0]?.rows[0]).toMatchObject({ itypes: ['weap'], etypes: ['orb'] });
  });

  it('warns on unknown item types, unknown ingredients and missing name strings', () => {
    const { bundle, warnings } = build([runesRow('Runeword9', ['nope'], [], ['zzz'])]);
    expect(bundle.runewords[0]).toMatchObject({ name: 'Runeword9', rows: [{ ingredients: ['zzz'] }] });
    expect(warnings).toEqual([
      'runewords: Runeword9 references unknown item type "nope"',
      'runewords: Runeword9 references unknown ingredient "zzz"',
      'runewords: name string "Runeword9" not found; using the key',
    ]);
  });

  it('reads T1Code1-7 and renders them with the given renderer (text stays [] without one)', () => {
    const mods = [
      ['str', '', '10', '10'],
      ['hit-skill', 'Nova', '5', '12'],
    ];
    const seen: unknown[] = [];
    const renderMods: ModsRenderer = (input) => {
      seen.push(input);
      return { lines: ['+10 to Strength'], warnings: ['oops'] };
    };
    const { bundle, warnings } = build([runesRow('Runeword1', ['weap'], [], ['r01'], mods)], strings, renderMods);
    expect(seen).toEqual([
      [
        { code: 'str', param: null, min: 10, max: 10 },
        { code: 'hit-skill', param: 'Nova', min: 5, max: 12 },
      ],
    ]);
    expect(bundle.runewords[0]?.rows[0]?.text).toEqual(['+10 to Strength']);
    expect(warnings).toEqual(['runewords: Runeword1: oops']);
    expect(build([runesRow('Runeword1', ['weap'], [], ['r01'], mods)]).bundle.runewords[0]?.rows[0]?.text).toEqual([]);
  });
});
