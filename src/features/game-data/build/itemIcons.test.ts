import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assetSlug,
  buildIconsBundle,
  buildSpriteIndex,
  cropRgba,
  fitInside,
  listFilesRecursive,
  opaqueBounds,
  parseItemAssets,
  planItemIcons,
  resolveSprite,
} from './itemIcons.ts';
import { serializeBundle } from './writeBundle.ts';

describe('parseItemAssets', () => {
  it('maps codes to assets, keeps the first of a repeated code and skips malformed entries', () => {
    const { assets, duplicates } = parseItemAssets([
      { hax: { asset: 'axe/hand_axe' } },
      { r33: { asset: 'rune/Moon_rune' } },
      { hax: { asset: 'axe/other' } },
      { bad: { nope: 1 } },
      { empty: { asset: '' } },
      'junk',
    ]);
    expect([...assets]).toEqual([
      ['hax', 'axe/hand_axe'],
      ['r33', 'rune/Moon_rune'],
    ]);
    expect(duplicates).toEqual(['hax']);
  });

  it('rejects a non-array', () => {
    expect(() => parseItemAssets({})).toThrow(/array/);
  });
});

describe('sprite resolution', () => {
  const index = buildSpriteIndex([
    'weapon/axe/hand_axe.sprite',
    'misc/rune/moon_rune.sprite',
    'armor/helmet/Cap.sprite',
    'armor/helmet/cap.lowend.sprite.txt',
    'misc/readme.txt',
  ]);

  it('indexes only .sprite files by lowercased path', () => {
    expect([...index.keys()].sort()).toEqual(['armor/helmet/cap', 'misc/rune/moon_rune', 'weapon/axe/hand_axe']);
  });

  it('resolves an asset in whichever folder holds it, ignoring letter case', () => {
    expect(resolveSprite('axe/hand_axe', index)).toBe('weapon/axe/hand_axe.sprite');
    expect(resolveSprite('rune/Moon_rune', index)).toBe('misc/rune/moon_rune.sprite');
    expect(resolveSprite('helmet/cap', index)).toBe('armor/helmet/Cap.sprite');
    expect(resolveSprite('sword/short_sword', index)).toBeNull();
  });

  it('plans one sprite per distinct asset and reports missing entries and vanilla art', () => {
    const assets = new Map([
      ['hax', 'axe/hand_axe'],
      ['9ha', 'axe/hand_axe'],
      ['ssd', 'sword/short_sword'],
      ['r33', 'rune/Moon_rune'],
    ]);
    const plan = planItemIcons(['hax', '9ha', 'ssd', 'zzz', 'r33', 'hax'], assets, index);
    expect([...plan.codes]).toEqual([
      ['hax', 'axe_hand_axe'],
      ['9ha', 'axe_hand_axe'],
      ['r33', 'rune_moon_rune'],
    ]);
    expect([...plan.sprites]).toEqual([
      ['axe_hand_axe', 'weapon/axe/hand_axe.sprite'],
      ['rune_moon_rune', 'misc/rune/moon_rune.sprite'],
    ]);
    expect(plan.missingEntry).toEqual(['zzz']);
    expect(plan.missingArt).toEqual(['ssd']);
  });

  it('slugs asset paths into flat lowercase file names', () => {
    expect(assetSlug('axe/Hand_Axe')).toBe('axe_hand_axe');
    expect(assetSlug('ring/ring 1')).toBe('ring_ring-1');
  });

  it('lists a real directory tree with / separators (case kept)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'item-icons-'));
    try {
      mkdirSync(join(dir, 'misc', 'rune'), { recursive: true });
      writeFileSync(join(dir, 'misc', 'rune', 'Moon_Rune.sprite'), '');
      writeFileSync(join(dir, 'top.sprite'), '');
      const files = listFilesRecursive(dir);
      expect(files).toEqual(['misc/rune/Moon_Rune.sprite', 'top.sprite']);
      expect(resolveSprite('rune/moon_rune', buildSpriteIndex(files))).toBe('misc/rune/Moon_Rune.sprite');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('cropping and sizing', () => {
  // 4×3 image with two opaque pixels at (1,0) and (2,2)
  const rgba = new Uint8Array(4 * 3 * 4);
  rgba.set([10, 20, 30, 255], (0 * 4 + 1) * 4);
  rgba.set([40, 50, 60, 1], (2 * 4 + 2) * 4);

  it('finds the box of the pixels with any alpha', () => {
    expect(opaqueBounds(4, 3, rgba)).toEqual({ x: 1, y: 0, width: 2, height: 3 });
    expect(opaqueBounds(2, 2, new Uint8Array(16))).toBeNull();
  });

  it('copies the box row by row', () => {
    const cropped = cropRgba(4, rgba, { x: 1, y: 0, width: 2, height: 3 });
    expect(cropped).toHaveLength(2 * 3 * 4);
    expect(Array.from(cropped.subarray(0, 4))).toEqual([10, 20, 30, 255]);
    expect(Array.from(cropped.subarray((2 * 2 + 1) * 4, (2 * 2 + 2) * 4))).toEqual([40, 50, 60, 1]);
  });

  it('fits inside the square keeping the aspect ratio and never enlarges', () => {
    expect(fitInside(196, 294)).toEqual({ width: 85, height: 128 });
    expect(fitInside(98, 294)).toEqual({ width: 43, height: 128 });
    expect(fitInside(300, 100)).toEqual({ width: 128, height: 43 });
    expect(fitInside(60, 90)).toEqual({ width: 60, height: 90 });
    expect(fitInside(1000, 1)).toEqual({ width: 128, height: 1 });
  });
});

describe('buildIconsBundle', () => {
  it('lists the codes with an encoded image, sharing the file of a shared asset', () => {
    const bundle = buildIconsBundle({
      esrVersion: '3.2.24',
      esrTag: '3.2.24',
      codes: new Map([
        ['hax', 'axe_hand_axe'],
        ['9ha', 'axe_hand_axe'],
        ['r33', 'rune_moon_rune'],
      ]),
      images: new Map([['axe_hand_axe', { width: 58, height: 128 }]]),
      extension: 'webp',
    });
    expect(bundle).toEqual({
      esrVersion: '3.2.24',
      esrTag: '3.2.24',
      icons: {
        hax: { file: 'axe_hand_axe.webp', w: 58, h: 128 },
        '9ha': { file: 'axe_hand_axe.webp', w: 58, h: 128 },
      },
    });
    expect(Object.keys(JSON.parse(serializeBundle(bundle)) as object)).toEqual(['esrVersion', 'esrTag', 'icons']);
  });
});
