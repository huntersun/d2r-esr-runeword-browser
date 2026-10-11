import { COLOR_CODES, DEFAULT_QUALITY_COLORS, colorCodeRgb, findColorCode } from './colors.ts';
import { QUALITIES } from './types.ts';

describe('colour codes', () => {
  it('lists ÿc0 to ÿcV in ASCII order', () => {
    const codes = COLOR_CODES.map((entry) => entry.code).join('');
    expect(codes).toBe('0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUV');
    expect(COLOR_CODES.filter((entry) => entry.approximate).map((entry) => entry.code)).toEqual([
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
    ]);
  });

  it('looks colours up by code or full prefix', () => {
    expect(colorCodeRgb('4')).toEqual([199, 179, 119]);
    expect(colorCodeRgb('ÿc;')).toEqual([174, 0, 255]);
    expect(colorCodeRgb('W')).toBeUndefined();
    expect(findColorCode('ÿcM')?.usedFor).toMatch(/desecrated/);
  });

  it('has a known label colour for every quality', () => {
    for (const quality of QUALITIES) expect(findColorCode(DEFAULT_QUALITY_COLORS[quality])).toBeDefined();
    expect(DEFAULT_QUALITY_COLORS.unique).toBe('ÿcD');
  });
});
