import { describe, expect, it } from 'vitest';
import type { SetInfo, SetsBundle } from '@/features/game-data/engine/schema';
import type { SetItemRef } from '../buildData';
import { setItemToRef } from './buildSnapshot';
import { hasSetItems, setBonuses, setPieceCounts } from './setBonuses';

function makeSet(id: string, itemNames: readonly string[]): SetInfo {
  return {
    id,
    name: `${id} set`,
    classCode: null,
    className: null,
    reqLevel: { min: 1, max: 1 },
    items: itemNames.map((name) => ({
      name,
      code: 'x',
      baseName: 'Base',
      category: 'Helm',
      level: 1,
      reqLevel: 1,
      lines: [`${name} stat`],
      partial: [
        { pieces: 2, lines: [`${name} 2pc`] },
        { pieces: 3, lines: [`${name} 3pc`] },
      ],
    })),
    partial: [
      { pieces: 2, lines: [`${id} 2 items`] },
      { pieces: 3, lines: [`${id} 3 items`] },
    ],
    full: [`${id} full`],
  };
}

const TARA = makeSet('Tara', ['Tara A', 'Tara B', 'Tara C', 'Tara D']);
const ANGEL = makeSet('Angel', ['Angel A', 'Angel B']);
const BUNDLE: SetsBundle = { sets: [TARA, ANGEL] };

function ref(set: SetInfo, index: number): SetItemRef {
  const item = set.items[index];
  if (item === undefined) throw new Error('fixture');
  return setItemToRef(item, set);
}

describe('setPieceCounts / hasSetItems', () => {
  it('counts distinct equipped pieces per set', () => {
    const items = { helmet: ref(TARA, 0), armor: ref(TARA, 1), ring1: ref(ANGEL, 0), ring2: ref(ANGEL, 0), weapon: null };
    expect(Object.fromEntries(setPieceCounts(items))).toEqual({ Tara: 2, Angel: 1 });
    expect(hasSetItems(items)).toBe(true);
    expect(hasSetItems({ helmet: { type: 'freetext', name: 'Rare' } })).toBe(false);
  });
});

describe('setBonuses', () => {
  it('returns nothing without set items', () => {
    expect(setBonuses({ helmet: { type: 'freetext', name: 'Rare' } }, BUNDLE)).toEqual([]);
  });

  it('activates the set-wide and per-item partial groups up to the equipped count', () => {
    const [tara] = setBonuses({ helmet: ref(TARA, 0), gloves: ref(TARA, 2) }, BUNDLE);
    expect(tara).toMatchObject({ setId: 'Tara', name: 'Tara set', equipped: 2, total: 4, complete: false, full: [] });
    expect(tara?.activePartial).toEqual([{ pieces: 2, lines: ['Tara 2 items'] }]);
    expect(tara?.nextPartial).toEqual({ pieces: 3, lines: ['Tara 3 items'] });
    expect(tara?.items).toEqual([
      { name: 'Tara A', activePartial: [{ pieces: 2, lines: ['Tara A 2pc'] }] },
      { name: 'Tara C', activePartial: [{ pieces: 2, lines: ['Tara C 2pc'] }] },
    ]);
  });

  it('adds the full-set lines when complete', () => {
    const [angel] = setBonuses({ amulet: ref(ANGEL, 0), ring1: ref(ANGEL, 1) }, BUNDLE);
    expect(angel).toMatchObject({ equipped: 2, total: 2, complete: true, full: ['Angel full'], nextPartial: { pieces: 3 } });
  });

  it('counts a duplicated piece once', () => {
    const [angel] = setBonuses({ ring1: ref(ANGEL, 0), ring2: ref(ANGEL, 0) }, BUNDLE);
    expect(angel).toMatchObject({ equipped: 1, activePartial: [], complete: false });
    expect(angel?.items).toEqual([{ name: 'Angel A', activePartial: [] }]);
  });

  it('keeps sets apart and orders them by slot', () => {
    const summaries = setBonuses({ ring1: ref(TARA, 3), helmet: ref(ANGEL, 0), armor: ref(TARA, 1) }, BUNDLE);
    expect(summaries.map((s) => [s.setId, s.equipped])).toEqual([
      ['Angel', 1],
      ['Tara', 2],
    ]);
  });

  it('falls back to the snapshots without the bundle', () => {
    const [tara] = setBonuses({ helmet: ref(TARA, 0), armor: ref(TARA, 1), gloves: ref(TARA, 2) }, null);
    expect(tara).toMatchObject({ name: 'Tara set', equipped: 3, total: null, complete: false, activePartial: [], nextPartial: null });
    expect(tara?.items[0]?.activePartial).toEqual([
      { pieces: 2, lines: ['Tara A 2pc'] },
      { pieces: 3, lines: ['Tara A 3pc'] },
    ]);
  });

  it('handles an item whose set is missing from the bundle', () => {
    const [gone] = setBonuses({ helmet: ref(TARA, 0), armor: ref(TARA, 1) }, { sets: [ANGEL] });
    expect(gone).toMatchObject({ setId: 'Tara', name: 'Tara set', equipped: 2, total: null, activePartial: [], full: [] });
    expect(gone?.items[1]?.activePartial).toEqual([{ pieces: 2, lines: ['Tara B 2pc'] }]);
  });
});
