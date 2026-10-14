import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseLootFilter } from './parse.ts';
import { serializeLootFilter, toPlainJson } from './serialize.ts';
import type { LootFilter } from './types.ts';

const base: LootFilter = { formatVersion: 1, rules: [], leadingComments: [] };

describe('serializeLootFilter', () => {
  it('writes leading comments, canonical key order and a trailing newline', () => {
    const filter: LootFilter = {
      ...base,
      leadingComments: ['// My filter', '//   second'],
      rules: [{ hide: true, itemTypes: ['pots'], activeInLevels: [2], comment: 'potions' }],
      defaultLevel: 1,
      filterLevels: [{ id: 1, name: 'Leveling' }],
      title: 'T',
      passthrough: { zzz: true },
    };
    expect(serializeLootFilter(filter)).toBe(
      [
        '// My filter',
        '//   second',
        '{',
        '  "formatVersion": 1,',
        '  "title": "T",',
        '  "filterLevels": [',
        '    {"id": 1, "name": "Leveling"}',
        '  ],',
        '  "defaultLevel": 1,',
        '  "rules": [',
        '    {"itemTypes": ["pots"], "activeInLevels": [2], "hide": true, "comment": "potions"}',
        '  ],',
        '  "zzz": true',
        '}',
        '',
      ].join('\n')
    );
  });

  it('writes literal ÿ and escapes line breaks', () => {
    const text = serializeLootFilter({ ...base, rules: [{ chatMessage: 'ÿc4Drop\n{name}' }] });
    expect(text).toContain('{"chatMessage": "ÿc4Drop\\n{name}"}');
    expect(text).not.toContain('\\u00ff');
  });

  it('puts a long rule on one key per line, keeping small objects inline', () => {
    const rule = {
      itemCodes: ['ylg', 'yvg', 'ymg', 'ytg', 'yhg', 'yig', 'ulg', 'uvg', 'umg', 'utg', 'uhg'],
      quality: 'superior' as const,
      itemStats: [{ stat: 93, op: '>=' as const, value: 20 }],
      nameSuffix: 'ÿc1[{stat:93}% IAS]',
    };
    expect(serializeLootFilter({ ...base, rules: [rule] })).toContain(
      [
        '    {',
        '      "itemCodes": ["ylg", "yvg", "ymg", "ytg", "yhg", "yig", "ulg", "uvg", "umg", "utg", "uhg"],',
        '      "quality": "superior",',
        '      "itemStats": [{"stat": 93, "op": ">=", "value": 20}],',
        '      "nameSuffix": "ÿc1[{stat:93}% IAS]"',
        '    }',
      ].join('\n')
    );
  });

  it('wraps a long list of codes several per line', () => {
    const codes = Array.from({ length: 40 }, (_, i) => `m${String(i).padStart(2, '0')}`);
    const text = serializeLootFilter({ ...base, rules: [{ excludeItemCodes: codes, hide: true }] });
    expect(text).toContain('      "excludeItemCodes": [\n        "m00", "m01",');
    for (const line of text.split('\n')) expect(line.length).toBeLessThanOrEqual(150);
    expect(parseLootFilter(text).filter.rules[0]?.excludeItemCodes).toEqual(codes);
  });

  it('writes styles one per line, short ones inline', () => {
    const text = serializeLootFilter({ ...base, styles: { A: { sound: 'x.mp3', notify: true }, B: { droplight: {} } } });
    expect(text).toContain('  "styles": {\n    "A": {"notify": true, "sound": "x.mp3"},\n    "B": {"droplight": {}}\n  },');
  });

  it('writes passthrough keys after the typed ones, and a known one only when the typed field is unset', () => {
    const plain = toPlainJson({
      ...base,
      rules: [{ hide: true, passthrough: { sockets: 'two', hide: 'yes', future: 1 } }],
    });
    expect(plain.rules).toEqual([{ hide: true, sockets: 'two', future: 1 }]);
    expect(Object.keys((plain.rules as Record<string, unknown>[])[0] ?? {})).toEqual(['hide', 'sockets', 'future']);
  });

  it('lays Sully’s filter out like the source, apart from key order and wrapped stat lists', () => {
    const source = readFileSync(resolve(__dirname, '../../../../public/loot-filters/esr-default-filter.json'), 'utf-8');
    const text = serializeLootFilter(parseLootFilter(source).filter);
    const oneLineRules = (s: string) => s.split('\n').filter((line) => line.startsWith('    {"')).length;
    expect(text.startsWith("// Sully's QoL Filter")).toBe(true);
    expect(Math.abs(oneLineRules(text) - oneLineRules(source))).toBeLessThanOrEqual(5);
  });
});
