import { describe, expect, it } from 'vitest';
import type { BaseAutomod } from '../engine/schema';
import { baseAutomodView, baseDamageLabel } from './baseAutomods';

const automod = (id: number, text: string[], name = `Mod ${String(id)}`): BaseAutomod => ({ id, name, lvl: 1, maxLvl: 0, reqLvl: 1, text });

const TINKER = 'Tinkering Points: (25 to 35)';
const byId = new Map(
  [
    automod(1, ['+(1 to 5) to Life', TINKER], 'of the Jackal'),
    automod(2, ['+(1 to 5) to Mana', TINKER], "Lizard's"),
    automod(3, [TINKER], ''),
  ].map((entry) => [entry.id, entry])
);

describe('baseAutomodView', () => {
  it('returns null without automods', () => {
    expect(baseAutomodView({}, byId)).toBeNull();
    expect(baseAutomodView({ automods: [99] }, byId)).toBeNull();
  });

  it('keeps every line of a single option', () => {
    expect(baseAutomodView({ automods: [3] }, byId)).toEqual({ shared: [], options: [{ automod: byId.get(3), lines: [TINKER] }] });
  });

  it('pulls the lines every option has out of the options', () => {
    const view = baseAutomodView({ automods: [1, 2] }, byId);
    expect(view?.shared).toEqual([TINKER]);
    expect(view?.options.map((option) => option.lines)).toEqual([['+(1 to 5) to Life'], ['+(1 to 5) to Mana']]);
  });

  it('skips unknown ids', () => {
    expect(baseAutomodView({ automods: [1, 99] }, byId)?.options).toHaveLength(1);
  });
});

describe('baseDamageLabel', () => {
  it('labels weapon, shield and boot damage', () => {
    expect(baseDamageLabel({ kind: 'weapon', ancestors: ['axe', 'weap'] })).toBe('1H');
    expect(baseDamageLabel({ kind: 'armor', ancestors: ['shie', 'shld', 'armo'] })).toBe('Smite');
    expect(baseDamageLabel({ kind: 'armor', ancestors: ['boot', 'armo'] })).toBe('Kick');
  });
});
