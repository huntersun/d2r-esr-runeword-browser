import { clampByte, colorAlpha, colorToHex, formatColor, hexToRgb, withAlpha, withRgb } from './colorValues';

describe('colour values', () => {
  it('clamps and rounds bytes', () => {
    expect(clampByte(-3)).toBe(0);
    expect(clampByte(300)).toBe(255);
    expect(clampByte(12.6)).toBe(13);
    expect(clampByte(Number.NaN)).toBe(0);
  });

  it('writes #rrggbb and ignores alpha', () => {
    expect(colorToHex([255, 128, 0])).toBe('#ff8000');
    expect(colorToHex([0, 1, 2, 100])).toBe('#000102');
    expect(colorToHex([999, -1, 15])).toBe('#ff000f');
  });

  it('reads #rrggbb, #rgb and bare hex', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
    expect(hexToRgb('FF8000')).toEqual([255, 128, 0]);
    expect(hexToRgb('#f80')).toEqual([255, 136, 0]);
    expect(hexToRgb('#ff80')).toBeUndefined();
    expect(hexToRgb('red')).toBeUndefined();
  });

  it('keeps or sets alpha', () => {
    expect(colorAlpha([1, 2, 3])).toBeUndefined();
    expect(colorAlpha([1, 2, 3, 4])).toBe(4);
    expect(withRgb([1, 2, 3, 200], [9, 9, 9])).toEqual([9, 9, 9, 200]);
    expect(withRgb([1, 2, 3], [9, 9, 9])).toEqual([9, 9, 9]);
    expect(withRgb(undefined, [9, 9, 9])).toEqual([9, 9, 9]);
    expect(withAlpha([1, 2, 3], 128)).toEqual([1, 2, 3, 128]);
    expect(withAlpha([1, 2, 3, 128], undefined)).toEqual([1, 2, 3]);
    expect(withAlpha([1, 2, 3], 400)).toEqual([1, 2, 3, 255]);
  });

  it('formats like the JSON', () => {
    expect(formatColor([255, 0, 0, 230])).toBe('255, 0, 0, 230');
  });
});
