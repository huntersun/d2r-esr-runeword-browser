import { tintSprite } from './tintSprite';

describe('tintSprite', () => {
  const pixels = new Uint8ClampedArray([200, 100, 50, 255, 10, 20, 30, 128]);

  it('returns an unchanged copy without a colour', () => {
    const out = tintSprite(pixels, undefined);
    expect([...out]).toEqual([...pixels]);
    expect(out).not.toBe(pixels);
  });

  it('multiplies RGB by colour / 255 and keeps alpha for [r, g, b]', () => {
    expect([...tintSprite(pixels, [255, 0, 128])]).toEqual([200, 0, 25, 255, 10, 0, 15, 128]);
  });

  it('multiplies alpha by the fourth number / 255', () => {
    expect([...tintSprite(pixels, [255, 255, 255, 51])]).toEqual([200, 100, 50, 51, 10, 20, 30, 26]);
  });

  it('does not change the input', () => {
    tintSprite(pixels, [0, 0, 0, 0]);
    expect([...pixels]).toEqual([200, 100, 50, 255, 10, 20, 30, 128]);
  });
});
