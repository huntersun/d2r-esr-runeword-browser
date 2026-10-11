import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseJsonc } from './jsonc.ts';
import { parseLootFilter } from './parse.ts';
import { serializeLootFilter, toPlainJson } from './serialize.ts';

const SULLY = readFileSync(resolve(__dirname, '../../../../public/loot-filters/sullys-qol.json'), 'utf-8');

const parse = (value: unknown) => parseLootFilter(JSON.stringify(value));
const errors = (value: unknown) => parse(value).diagnostics.filter((d) => d.severity === 'error');

describe('parseLootFilter on Sully’s filter', () => {
  const { filter, diagnostics } = parseLootFilter(SULLY);

  it('reads it without errors, keeping order', () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(filter.rules).toHaveLength(302);
    expect(Object.keys(filter.styles ?? {})).toEqual([
      'Mythical',
      'Jackpot',
      'PurpleRune',
      'STierMaterial',
      'Valuable',
      'GoldPlate',
      'UniqueLabel',
      'SetLabel',
      'Uber',
      'MapTier1',
      'Map',
      'MapTier5',
    ]);
    expect(filter.leadingComments).toHaveLength(3);
    expect(filter.leadingComments[0]).toMatch(/^\/\/ Sully's QoL Filter/);
    expect(filter.rules.at(-1)).toEqual({ sockets: { min: 1 }, nameSuffix: ' ÿcP[{sockets}]' });
  });

  it('keeps every value: the plain JSON equals the source', () => {
    expect(toPlainJson(filter)).toEqual(parseJsonc(SULLY).value);
  });

  it('round-trips through the serializer', () => {
    const text = serializeLootFilter(filter);
    const again = parseLootFilter(text);
    expect(again.filter).toEqual(filter);
    expect(again.diagnostics).toEqual(diagnostics);
    expect(serializeLootFilter(again.filter)).toBe(text);
  });
});

describe('parseLootFilter', () => {
  it('keeps unknown keys in passthrough with a warning', () => {
    const { filter, diagnostics } = parse({ formatVersion: 1, extra: { a: 1 }, rules: [{ itemCodes: ['r01'], hide: true, future: 3 }] });
    expect(filter.passthrough).toEqual({ extra: { a: 1 } });
    expect(filter.rules[0]).toEqual({ itemCodes: ['r01'], hide: true, passthrough: { future: 3 } });
    expect(diagnostics).toEqual([
      expect.objectContaining({ severity: 'warning', path: 'extra' }),
      expect.objectContaining({ severity: 'warning', path: 'rules/0/future', rule: 0 }),
    ]);
  });

  it('keeps wrong-shaped values in passthrough with an error', () => {
    const { filter, diagnostics } = parse({
      formatVersion: 1,
      title: 5,
      rules: [{}, { sockets: 'two', itemStats: [{ stat: 'x', value: 1, extra: true }], labelBackground: [1, 2], location: ['inTown'] }],
    });
    expect(filter.title).toBeUndefined();
    expect(filter.passthrough).toEqual({ title: 5 });
    expect(filter.rules[1]).toEqual({
      passthrough: { sockets: 'two', itemStats: [{ stat: 'x', value: 1, extra: true }], labelBackground: [1, 2], location: ['inTown'] },
    });
    expect(diagnostics.map((d) => [d.severity, d.path, d.rule])).toEqual([
      ['error', 'title', undefined],
      ['error', 'rules/1/sockets', 1],
      ['error', 'rules/1/itemStats', 1],
      ['error', 'rules/1/location', 1],
      ['error', 'rules/1/labelBackground', 1],
    ]);
  });

  it('reads per-language texts and rejects unknown languages', () => {
    const { filter, diagnostics } = parse({
      formatVersion: 1,
      notifications: { dropFormat: { enUS: 'Drop {name}', deDE: 'Fund {name}' } },
      rules: [{ chatMessage: { enUS: 'a', xxXX: 'b' } }, { replaceName: { frFR: 'c' } }],
    });
    expect(filter.notifications).toEqual({ dropFormat: { enUS: 'Drop {name}', deDE: 'Fund {name}' } });
    expect(filter.rules[0]?.passthrough).toEqual({ chatMessage: { enUS: 'a', xxXX: 'b' } });
    expect(filter.rules[1]).toEqual({ replaceName: { frFR: 'c' } });
    expect(diagnostics).toEqual([expect.objectContaining({ severity: 'error', path: 'rules/0/chatMessage' })]);
  });

  it('reads named values as names, numbers, lists and ranges', () => {
    const { filter, diagnostics } = parse({
      formatVersion: 1,
      rules: [
        { quality: 'unique', baseTier: 2, difficulty: ['nightmare', 2] },
        { quality: { min: 'magic', max: 7 }, baseTier: { max: 'exceptional' } },
        { quality: 'legendary' },
      ],
    });
    expect(filter.rules[0]).toEqual({ quality: 'unique', baseTier: 2, difficulty: ['nightmare', 2] });
    expect(filter.rules[1]).toEqual({ quality: { min: 'magic', max: 7 }, baseTier: { max: 'exceptional' } });
    expect(filter.rules[2]).toEqual({ passthrough: { quality: 'legendary' } });
    expect(diagnostics).toEqual([expect.objectContaining({ severity: 'error', path: 'rules/2/quality', rule: 2 })]);
  });

  it('reads number matches, stat checks, colours, icons and droplights', () => {
    const rule = {
      itemLevel: { min: 30 },
      sockets: [2, 3],
      maxSockets: 4,
      itemStats: [{ stat: 'item_numsockets', param: 0, op: 'between', value: [2, 4] }],
      labelBackground: [1, 2, 3, 4],
      labelBorder: { color: [9, 9, 9], width: 2 },
      icon: { iconName: 'goldstar', iconSize: 16 },
      droplight: {},
    };
    const { filter, diagnostics } = parse({ formatVersion: 1, rules: [rule] });
    expect(filter.rules[0]).toEqual(rule);
    expect(diagnostics).toEqual([]);
  });

  it('puts condition keys in a style aside with a warning', () => {
    const { filter, diagnostics } = parse({ formatVersion: 1, styles: { S: { itemCodes: ['r01'], sound: 3 } }, rules: [] });
    expect(filter.styles?.S).toEqual({ sound: 3, passthrough: { itemCodes: ['r01'] } });
    expect(diagnostics).toEqual([expect.objectContaining({ severity: 'warning', path: 'styles/S/itemCodes', style: 'S' })]);
  });

  it('reports a missing rules list and an unknown formatVersion but keeps going', () => {
    const { filter, diagnostics } = parse({ formatVersion: 2, title: 'T' });
    expect(filter).toEqual({ formatVersion: 2, title: 'T', rules: [], leadingComments: [] });
    expect(diagnostics.map((d) => [d.severity, d.path])).toEqual([
      ['error', 'formatVersion'],
      ['error', 'rules'],
    ]);
  });

  it('keeps a rules list with a non-object entry in passthrough', () => {
    const { filter, diagnostics } = parse({ formatVersion: 1, rules: [{ hide: true }, 'oops'] });
    expect(filter.rules).toEqual([]);
    expect(filter.passthrough).toEqual({ rules: [{ hide: true }, 'oops'] });
    expect(errors({ formatVersion: 1, rules: [{ hide: true }, 'oops'] })).toHaveLength(1);
    expect(diagnostics).toHaveLength(1);
    expect(toPlainJson(filter)).toEqual({ formatVersion: 1, rules: [{ hide: true }, 'oops'] });
  });

  it('reports a top level that is not an object', () => {
    expect(parse([1, 2]).diagnostics).toEqual([expect.objectContaining({ severity: 'error', path: '' })]);
  });
});
