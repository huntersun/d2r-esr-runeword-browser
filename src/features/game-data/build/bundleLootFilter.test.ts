import { describe, it, expect } from 'vitest';
import { buildLootFilterBundle } from './bundleLootFilter.ts';
import { parseTsv } from './tsv.ts';

const table = (rows: string[][]) => parseTsv(rows.map((row) => row.join('\t')).join('\n'));
const rowTable = (rows: string[][]) => parseTsv(rows.map((row) => row.join('\t')).join('\n'), 'table', { keepExpansionRows: true });

const ITEM_COLUMNS = ['name', 'code', 'namestr', 'type', 'type2', 'spawnable'];
const strings = new Map([
  ['hax', 'Hand Axe'],
  ['r01', 'El Rune'],
  ['Pelta', 'Pelta Lunata'],
  ['Act1Town', 'Rogue Encampment'],
]);

const { bundle, warnings } = buildLootFilterBundle(
  {
    weapons: table([
      ITEM_COLUMNS,
      ['Hand Axe', 'hax', 'hax', 'axe', '1hsw', '1'],
      ['Shadow Axe', 'zax', 'zax', 'axe', '', '0'],
      ['Expansion'],
    ]),
    armor: table([
      ITEM_COLUMNS,
      ['Buckler', 'buc', 'buc', 'shie', '', '1'],
      ['Dup Axe', 'hax', 'hax', 'axe', '', '1'],
      ['Blank', '', '', 'shie', '', '1'],
    ]),
    misc: table([ITEM_COLUMNS, ['El Rune', 'r01', 'r01', 'rune', '', '1']]),
    itemstatcost: rowTable([
      ['Stat', '*ID'],
      ['strength', '0'],
      ['energy', '1'],
    ]),
    levels: table([
      ['Name', 'Id', 'Act', 'LevelName'],
      ['Null', '0', '0', ''],
      ['Act 1 - Town', '1', '0', 'Act1Town'],
      ['Expansion'],
      ['Act 5 - Town', '109', '4', 'Harrogath'],
    ]),
    sounds: rowTable([
      ['Sound', '*Index'],
      ['', '0'],
      ['cursor_pass', '1'],
      ['item_rune', '1'],
    ]),
    uniqueitems: rowTable([['index', 'code'], ['Pelta', 'buc'], ['Expansion'], ['Lost', 'xxx'], ['Basher', 'hax']]),
    setitems: rowTable([
      ['index', 'item'],
      ['Set Axe', 'hax'],
    ]),
  },
  strings
);

describe('buildLootFilterBundle', () => {
  it('lists every item code once (first row wins), spawnable or not, named through the string table, with type2 when set', () => {
    expect(bundle.items).toEqual([
      { code: 'hax', name: 'Hand Axe', kind: 'weapon', type: 'axe', type2: '1hsw', spawnable: true },
      { code: 'zax', name: 'Shadow Axe', kind: 'weapon', type: 'axe', spawnable: false },
      { code: 'buc', name: 'Buckler', kind: 'armor', type: 'shie', spawnable: true },
      { code: 'r01', name: 'El Rune', kind: 'misc', type: 'rune', spawnable: true },
    ]);
    expect(warnings).toContain('lootfilter: duplicate item code "hax" (Dup Axe); kept the first row');
  });

  it('numbers stats and sounds by row and names areas through the string table', () => {
    expect(bundle.stats).toEqual([
      { id: 0, name: 'strength' },
      { id: 1, name: 'energy' },
    ]);
    expect(bundle.sounds).toEqual(['', 'cursor_pass', 'item_rune']);
    expect(bundle.areas).toEqual([
      { id: 0, name: 'Null', act: 0 },
      { id: 1, name: 'Rogue Encampment', act: 0 },
      { id: 109, name: 'Harrogath', act: 4 },
    ]);
  });

  it('numbers uniques and sets by data row, counting Expansion rows without listing them', () => {
    expect(bundle.uniques).toEqual([
      { id: 0, name: 'Pelta Lunata', code: 'buc' },
      { id: 2, name: 'Lost', code: 'xxx' },
      { id: 3, name: 'Basher', code: 'hax' },
    ]);
    expect(bundle.sets).toEqual([{ id: 0, name: 'Set Axe', code: 'hax' }]);
    expect(warnings).toContain('lootfilter: unique 2 (Lost) has unknown base code "xxx"');
  });
});
