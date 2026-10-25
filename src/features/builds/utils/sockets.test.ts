import { describe, expect, it } from 'vitest';
import { SLOT_SOCKET_CAPS, parseJewelInfo, runewordJewelSockets, slotSocketCap } from './sockets';

describe('slotSocketCap', () => {
  it('caps fillers by slot family', () => {
    expect(SLOT_SOCKET_CAPS).toEqual({
      weapon: 6,
      weapon2: 6,
      shield: 6,
      shield2: 6,
      armor: 6,
      helmet: 4,
      gloves: 2,
      boots: 2,
      belt: 2,
      amulet: 1,
      ring1: 1,
      ring2: 1,
    });
    expect(slotSocketCap('helmet')).toBe(4);
    expect(slotSocketCap('ring2')).toBe(1);
  });
});

describe('parseJewelInfo', () => {
  it('reads required counts and the top of optional ranges', () => {
    expect(parseJewelInfo('(2) Jewels')).toBe(2);
    expect(parseJewelInfo('(1) Jewel')).toBe(1);
    expect(parseJewelInfo('(0-3) Jewels')).toBe(3);
    expect(parseJewelInfo(undefined)).toBe(0);
    expect(parseJewelInfo('Jewels')).toBe(0);
  });
});

describe('runewordJewelSockets', () => {
  it('prefers the largest jewels count of the matched txt rows', () => {
    expect(runewordJewelSockets({ sockets: 3, socketsMax: 6 }, [{ jewels: 0 }, { jewels: 2 }, { jewels: 1 }])).toBe(2);
    expect(runewordJewelSockets({ sockets: 3, jewelInfo: '(2) Jewels' }, [{ jewels: 0 }])).toBe(0);
  });

  it('falls back to the socket range, then the jewel line, then 0', () => {
    expect(runewordJewelSockets({ sockets: 3, socketsMax: 6 })).toBe(3);
    expect(runewordJewelSockets({ sockets: 5, jewelInfo: '(2) Jewels' }, [])).toBe(2);
    expect(runewordJewelSockets({ sockets: 4 })).toBe(0);
  });
});
