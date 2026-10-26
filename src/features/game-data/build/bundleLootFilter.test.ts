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
    treasureclassex: table([['Treasure Class', 'Item1']]),
    gems: table([
      ['name', 'code'],
      ['El Rune', 'r01'],
    ]),
  },
  strings
);

describe('buildLootFilterBundle', () => {
  it('lists every item code once (first row wins), spawnable or not, named through the string table, with type2 when set', () => {
    expect(bundle.items).toEqual([
      { code: 'hax', name: 'Hand Axe', kind: 'weapon', type: 'axe', type2: '1hsw', spawnable: true, drops: true },
      { code: 'zax', name: 'Shadow Axe', kind: 'weapon', type: 'axe', spawnable: false, drops: false },
      { code: 'buc', name: 'Buckler', kind: 'armor', type: 'shie', spawnable: true, drops: true },
      { code: 'r01', name: 'El Rune', kind: 'misc', type: 'rune', spawnable: true, drops: true },
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

describe('buildLootFilterBundle tiers', () => {
  const TIER_COLUMNS = [...ITEM_COLUMNS, 'normcode', 'ubercode', 'ultracode'];
  const empty = rowTable([['Stat']]);
  const { bundle: tiered } = buildLootFilterBundle(
    {
      weapons: table([
        TIER_COLUMNS,
        ['Hand Axe', 'hax', 'hax', 'axe', '', '1', 'hax', '9ha', '7ha'],
        ['Hatchet', '9ha', '9ha', 'axe', '', '1', 'hax', '9ha', '7ha'],
        ['Arrows', 'aqv', 'aqv', 'bowq', '', '1', 'aqv', 'aqv', 'aqv'],
        ['Mythical Bow', 'm01', 'm01', 'bow', '', '1', 'm01', 'm01', 'm01'],
      ]),
      armor: table([
        TIER_COLUMNS,
        ['Cap', 'cap', 'cap', 'helm', '', '1', 'cap', 'xap', 'uap'],
        ['Shako', 'uap', 'uap', 'helm', '', '1', 'cap', 'xap', 'uap'],
        ['Odd', 'odd', 'odd', 'helm', '', '1', 'cap', 'xap', 'uap'],
        ['Half', 'hlf', 'hlf', 'helm', '', '1', 'hlf', 'hlf', 'zzz'],
      ]),
      misc: table([TIER_COLUMNS, ['Ring', 'rin', 'rin', 'ring', '', '1', 'rin', 'rin', 'rin']]),
      itemstatcost: empty,
      levels: table([['Name', 'Id', 'Act', 'LevelName']]),
      sounds: rowTable([['Sound']]),
      uniqueitems: rowTable([['index', 'code']]),
      setitems: rowTable([['index', 'item']]),
      treasureclassex: table([['Treasure Class', 'Item1']]),
      gems: table([['name', 'code']]),
    },
    new Map()
  );
  const tierOf = (code: string) => tiered.items.find((item) => item.code === code)?.tier;

  it('sets the tier of weapons and armor from their position in a three-code family', () => {
    expect(tierOf('hax')).toBe('normal');
    expect(tierOf('9ha')).toBe('exceptional');
    expect(tierOf('cap')).toBe('normal');
    expect(tierOf('uap')).toBe('elite');
    expect(tiered.items.find((item) => item.code === 'uap')).toEqual({
      code: 'uap',
      name: 'Shako',
      kind: 'armor',
      type: 'helm',
      tier: 'elite',
      spawnable: true,
      drops: true,
    });
  });

  it('leaves the tier out for self-referential, malformed and misc families', () => {
    expect(tierOf('aqv')).toBeUndefined();
    expect(tierOf('m01')).toBeUndefined();
    expect(tierOf('odd')).toBeUndefined();
    expect(tierOf('hlf')).toBeUndefined();
    expect(tierOf('rin')).toBeUndefined();
    expect(tiered.items.find((item) => item.code === 'rin')).not.toHaveProperty('tier');
  });
});

describe('buildLootFilterBundle drops', () => {
  const { bundle: dropping } = buildLootFilterBundle(
    {
      weapons: table([
        ITEM_COLUMNS,
        ['Shadow Blade', 'sdb', 'sdb', 'swor', '', '0'],
        ['Set Shadow', 'ssh', 'ssh', 'swor', '', '0'],
        ['Vessel Hammer', 'm44', 'm44', 'hamm', '', '0'],
      ]),
      armor: table([ITEM_COLUMNS, ['Cap', 'cap', 'cap', 'helm', '', '1']]),
      misc: table([
        ITEM_COLUMNS,
        ['Ancient Scroll', '01b', '01b', 'scrl', '', '0'],
        ['Ancient Scroll', '02b', '02b', 'scrl', '', '0'],
        ['Ore', 'ore', 'ore', 'rock', '', '0'],
        ['Fu Rune', 'r32', 'r32', 'rune', '', '1'],
        ['Hu Rune', 'r48', 'r32', 'rune', '', '1'],
        ['Elixir', 'hpo', 'hpo', 'hpot', '', '0'],
      ]),
      itemstatcost: rowTable([['Stat']]),
      levels: table([['Name', 'Id', 'Act', 'LevelName']]),
      sounds: rowTable([['Sound']]),
      uniqueitems: rowTable([
        ['index', 'code'],
        ['Uni Ore 0', 'ore'],
        ['Frost Blade', 'sdb'],
        ['Lost Unique', 'hpo'],
      ]),
      setitems: rowTable([
        ['index', 'item'],
        ['Shadow Set Piece', 'ssh'],
      ]),
      treasureclassex: table([
        ['Treasure Class', 'Item1', 'Item2', 'Item3'],
        ['Scrolls 1', '01b', '"02b,qty=3"', ''],
        ['Scrolls 2', 'Scrolls 1', 'weap54', ''],
        ['Unique Ore 0', 'Unique Ore Crystals 0', 'Uni Ore 0', ''],
        ['Boss', 'Frost Blade', 'Shadow Set Piece', 'Scrolls 2'],
        ['', 'hpo', '', ''],
      ]),
      gems: table([
        ['name', 'code'],
        ['Fu Rune', 'r32'],
      ]),
    },
    new Map()
  );
  const dropsOf = (code: string) => dropping.items.find((item) => item.code === code)?.drops;

  it('marks non-spawnable items a treasure class names (quoted, with a quantity suffix) as dropping', () => {
    expect(dropsOf('01b')).toBe(true);
    expect(dropsOf('02b')).toBe(true);
  });

  it('marks the base of a unique or set row a treasure class names by its index as dropping', () => {
    expect(dropsOf('ore')).toBe(true);
    expect(dropsOf('sdb')).toBe(true);
    expect(dropsOf('ssh')).toBe(true);
  });

  it('keeps spawnable items dropping and leaves the rest (no treasure class, unnamed unique, blank TC row) out', () => {
    expect(dropsOf('cap')).toBe(true);
    expect(dropsOf('r32')).toBe(true);
    expect(dropsOf('m44')).toBe(false);
    expect(dropsOf('hpo')).toBe(false);
  });

  it('marks a spawnable rune without a gems.txt row as never dropping (an unused row)', () => {
    expect(dropsOf('r48')).toBe(false);
  });
});
