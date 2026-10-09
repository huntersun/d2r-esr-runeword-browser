import { describe, it, expect } from 'vitest';
import { minIlvlForSockets, socketBand, socketCapAt } from './sockets.ts';

const thresholds: [number, number] = [25, 40];

describe('socketBand', () => {
  it.each([
    [1, 0],
    [25, 0],
    [26, 1],
    [40, 1],
    [41, 2],
    [99, 2],
  ])('ilvl %i → band %i', (ilvl, band) => {
    expect(socketBand(ilvl, thresholds)).toBe(band);
  });
});

describe('socketCapAt', () => {
  const base = { socketCaps: [3, 5, 6] as [number, number, number] };
  it('uses the cap of the band', () => {
    expect(socketCapAt(base, 25, thresholds)).toBe(3);
    expect(socketCapAt(base, 26, thresholds)).toBe(5);
    expect(socketCapAt(base, 40, thresholds)).toBe(5);
    expect(socketCapAt(base, 41, thresholds)).toBe(6);
  });
});

describe('minIlvlForSockets', () => {
  const base = { socketCaps: [3, 5, 6] as [number, number, number] };
  it('returns the lower bound of the first band that allows n sockets', () => {
    expect(minIlvlForSockets(base, 0, thresholds)).toBe(1);
    expect(minIlvlForSockets(base, 3, thresholds)).toBe(1);
    expect(minIlvlForSockets(base, 4, thresholds)).toBe(26);
    expect(minIlvlForSockets(base, 6, thresholds)).toBe(41);
  });

  it('returns null when the base can never roll n sockets', () => {
    expect(minIlvlForSockets(base, 7, thresholds)).toBeNull();
    expect(minIlvlForSockets({ socketCaps: [0, 0, 0] }, 1, thresholds)).toBeNull();
  });
});
