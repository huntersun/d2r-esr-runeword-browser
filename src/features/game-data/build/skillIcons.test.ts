import { describe, expect, it } from 'vitest';
import { cropCel, parseSkillIconKey, skillSheets } from './skillIcons.ts';

describe('skill icon keys and sheets', () => {
  it('parses class and generic keys', () => {
    expect(parseSkillIconKey('so-36')).toEqual({ prefix: 'so', cel: 36 });
    expect(parseSkillIconKey('gen-90')).toEqual({ prefix: 'gen', cel: 90 });
    expect(parseSkillIconKey('sorceress-1')).toBeNull();
    expect(parseSkillIconKey('so-')).toBeNull();
  });

  it('maps each class prefix to its first sheet and adds the generic sheet', () => {
    const sheets = skillSheets([
      'sorceress/soskillicon.lowend.sprite',
      'sorceress/soskillicon.sprite',
      'sorceress/soskillicon2.sprite',
      'warlock/waskillicon.sprite',
      'skill_trees/soskilltree.sprite',
      'submenu/skillicon.sprite',
    ]);
    expect([...sheets]).toEqual([
      ['so', 'sorceress/soskillicon.sprite'],
      ['wa', 'warlock/waskillicon.sprite'],
      ['gen', 'submenu/skillicon.sprite'],
    ]);
  });
});

describe('cropCel', () => {
  // 3 cels of 2 × 2 pixels; pixel value = cel number in every channel
  const width = 6;
  const height = 2;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) rgba.fill(Math.floor(x / 2), (y * width + x) * 4, (y * width + x + 1) * 4);
  const sheet = { width, height, frames: 3, rgba };

  it('cuts one cel out of the horizontal strip', () => {
    const cel = cropCel(sheet, 2);
    expect(cel?.width).toBe(2);
    expect(cel?.height).toBe(2);
    expect([...(cel?.rgba ?? [])]).toEqual(new Array<number>(16).fill(2));
  });

  it('returns null outside the strip', () => {
    expect(cropCel(sheet, 3)).toBeNull();
    expect(cropCel(sheet, -1)).toBeNull();
  });
});
