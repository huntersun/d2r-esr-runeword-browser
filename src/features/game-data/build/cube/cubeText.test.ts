import { describe, expect, it } from 'vitest';
import { clusterVariantsCounted, describeOutput, formatInput, formatOutput, type OutputTables } from './cubeText.ts';

const NAMES: Readonly<Partial<Record<string, string>>> = { weap: 'Weapon', key: 'Key', 'Red Portal': 'Red Portal', gem5: 'Perfect Gem' };
const tables: OutputTables = { nameOf: (token) => NAMES[token] ?? token, renderMods: () => [] };

describe('cube cell text', () => {
  it('writes `rem` as "socketed items come out"', () => {
    expect(formatOutput({ spec: 'useitem,rem', mods: [] }, tables)).toBe('The same item (socketed items come out)');
    expect(formatOutput({ spec: 'useitem,rem', mods: [{ mod: 'sock', param: '', min: 3, max: 3 }] }, tables)).toBe(
      'The same item (socketed items come out, 3 sockets)'
    );
  });

  it('writes `lvl=N` as the item level, or as the map a Red Portal opens when level names are known', () => {
    expect(describeOutput({ spec: 'weap,lvl=99', mods: [] }, tables)).toEqual({ name: 'Weapon', details: ['item level 99'] });
    expect(describeOutput({ spec: 'Red Portal,lvl=147,qty=1', mods: [] }, tables)).toEqual({
      name: 'Red Portal',
      details: ['item level 147'],
    });
    const withLevels: OutputTables = { ...tables, levelName: (id) => (id === 147 ? 'Cellar of Pain' : null) };
    expect(describeOutput({ spec: 'Red Portal,lvl=147,qty=1', mods: [] }, withLevels)).toEqual({
      name: 'Red Portal',
      details: ['to Cellar of Pain'],
    });
    expect(describeOutput({ spec: 'Red Portal,lvl=999', mods: [] }, withLevels).details).toEqual(['item level 999']);
  });

  it('keeps inputs without qualifiers it does not know', () => {
    expect(formatInput('gem5,qty=2', tables)).toBe('2× Perfect Gem');
  });

  it('counts the variants each merged row stands for', () => {
    const merged = clusterVariantsCounted([
      { inputs: ['a', 'Key'], output: 'x' },
      { inputs: ['b', 'Key'], output: 'x' },
      { inputs: ['c', 'Key'], output: 'y' },
      { inputs: ['c', 'Key'], output: 'y' },
    ]);
    expect(merged).toEqual([
      { variant: { inputs: ['a / b', 'Key'], output: 'x' }, count: 2 },
      { variant: { inputs: ['c', 'Key'], output: 'y' }, count: 2 },
    ]);
  });
});
