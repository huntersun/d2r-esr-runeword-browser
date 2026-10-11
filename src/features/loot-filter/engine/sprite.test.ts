import { readFileSync } from 'fs';
import { resolve } from 'path';
import { decodeSprite } from './sprite.ts';

const ICONS = resolve(__dirname, '../../../../public/loot-filters/icons');

function pixel(rgba: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const offset = (y * width + x) * 4;
  return Array.from(rgba.subarray(offset, offset + 4));
}

describe('decodeSprite', () => {
  it.each([
    ['goldstar.sprite', 200],
    ['goldstar.lowend.sprite', 100],
  ])('decodes %s', (file, size) => {
    const bytes = readFileSync(resolve(ICONS, file));
    const sprite = decodeSprite(new Uint8Array(bytes));
    expect(sprite).toMatchObject({ width: size, height: size, frames: 1 });
    expect(sprite.rgba).toHaveLength(size * size * 4);
    for (const [x, y] of [
      [0, 0],
      [size - 1, 0],
      [0, size - 1],
      [size - 1, size - 1],
    ] as const) {
      expect(pixel(sprite.rgba, size, x, y)[3]).toBe(0);
    }
    const [r = 0, g = 0, b = 0, a = 0] = pixel(sprite.rgba, size, size / 2, size / 2);
    expect(a).toBeGreaterThan(200);
    // A gold star: red and green high, blue low, so the bytes are RGBA (not BGRA).
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(150);
    expect(b).toBeLessThan(150);
  });

  it('accepts an ArrayBuffer', () => {
    const bytes = readFileSync(resolve(ICONS, 'goldstar.lowend.sprite'));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    expect(decodeSprite(buffer).width).toBe(100);
  });

  it('rejects a bad magic, a short header and a truncated frame', () => {
    const bytes = new Uint8Array(readFileSync(resolve(ICONS, 'goldstar.lowend.sprite')));
    const bad = bytes.slice();
    bad[0] = 0x58;
    expect(() => decodeSprite(bad)).toThrow(/SpA1/);
    expect(() => decodeSprite(bytes.slice(0, 20))).toThrow(/header/);
    expect(() => decodeSprite(bytes.slice(0, 1000))).toThrow(/truncated/);
  });
});
