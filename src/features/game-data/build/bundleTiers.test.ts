import { describe, expect, it } from 'vitest';
import { buildTiersBundle } from './bundleTiers.ts';
import { readItems, type ItemKind } from './model.ts';
import { gearTier } from './tiers.ts';
import { parseTsv } from './tsv.ts';

const COLUMNS = [
  'name',
  'namestr',
  'code',
  'type',
  'type2',
  'spawnable',
  'quest',
  'level',
  'levelreq',
  'gemsockets',
  'normcode',
  'ubercode',
  'ultracode',
];

/** [code, spawnable, level, normcode, ubercode, ultracode] */
type Row = [string, string, string, string, string, string];

function items(kind: ItemKind, rows: Row[]) {
  const lines = [
    COLUMNS,
    ...rows.map(([code, spawnable, level, norm, uber, ultra]) => [
      code,
      code,
      code,
      'x',
      '',
      spawnable,
      '0',
      level,
      '1',
      '0',
      norm,
      uber,
      ultra,
    ]),
  ];
  return readItems(parseTsv(lines.map((line) => line.join('\t')).join('\n'), `${kind}.txt`), kind);
}

describe('gearTier', () => {
  it('places a code in its distinct tier family', () => {
    expect(gearTier('hax', 'hax', '9ha', '7ha', 3)).toBe('normal');
    expect(gearTier('9ha', 'hax', '9ha', '7ha', 30)).toBe('exceptional');
    expect(gearTier('7ha', 'hax', '9ha', '7ha', 60)).toBe('elite');
  });

  it('calls a self-referential family mythical from qlvl 90 and gives no tier below it', () => {
    expect(gearTier('m01', 'm01', 'm01', 'm01', 96)).toBe('mythical');
    expect(gearTier('aq2', 'aq2', 'aq2', 'aq2', 1)).toBeUndefined();
  });

  it('gives no tier to malformed families (quest rows, rows outside their own family)', () => {
    expect(gearTier('hst', 'hst', '', '', 1)).toBeUndefined();
    expect(gearTier('q86', 'skr', '9qr', '7qr', 60)).toBeUndefined();
  });
});

describe('buildTiersBundle', () => {
  it('lists spawnable and non-spawnable weapon and armor rows with a tier, skipping misc rows and repeated codes', () => {
    const rows = [
      ...items('weapon', [
        ['hax', '1', '3', 'hax', '9ha', '7ha'],
        ['p01', '0', '3', 'p01', 'p02', 'p03'],
        ['m01', '1', '96', 'm01', 'm01', 'm01'],
        ['aq2', '1', '1', 'aq2', 'aq2', 'aq2'],
        ['hax', '1', '3', 'xxx', 'hax', 'yyy'],
      ]),
      ...items('armor', [['uap', '1', '60', 'cap', 'xap', 'uap']]),
      ...items('misc', [['rin', '1', '1', '', '', '']]),
    ];
    const { bundle, warnings } = buildTiersBundle(rows);
    expect(bundle.codes).toEqual({ hax: 'normal', p01: 'normal', m01: 'mythical', uap: 'elite' });
    expect(Object.keys(bundle.codes)).toEqual(['hax', 'p01', 'm01', 'uap']);
    expect(warnings).toEqual([]);
  });
});
