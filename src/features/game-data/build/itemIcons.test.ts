import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { UniqueOrSetRow } from './itemNames.ts';
import {
  artKey,
  artKeyCandidates,
  assetSlug,
  buildIconsBundle,
  buildSpriteIndex,
  cropRgba,
  fitInside,
  listFilesRecursive,
  opaqueBounds,
  parseItemAssets,
  parseNamedArt,
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
    const plan = planItemIcons({
      codes: ['hax', '9ha', 'ssd', 'zzz', 'r33', 'hax'],
      uniques: [],
      sets: [],
      assets,
      uniqueArt: new Map(),
      setArt: new Map(),
      index,
    });
    expect([...plan.bases]).toEqual([
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

describe('unique and set item art', () => {
  const index = buildSpriteIndex([
    'weapon/axe/hand_axe.sprite',
    'weapon/axe/the_gnasher.sprite',
    'weapon/bow/mythical_buriza.sprite',
    'armor/helmet/cap.sprite',
  ]);
  const assets = new Map([
    ['hax', 'axe/hand_axe'],
    ['cap', 'helmet/cap'],
    ['lbt', 'boot/boots'],
  ]);
  const row = (index: string, name: string, code: string, disabled = false): UniqueOrSetRow => ({
    id: 0,
    index,
    name,
    code,
    disabled,
  });

  it('slugs a txt index or an art key the same way', () => {
    expect(artKey("Civerb's Ward")).toBe('civerbs_ward');
    expect(artKey('Buriza-Do Kyanon')).toBe('buriza_do_kyanon');
    expect(artKey('BlackKnights_Holy_Signet')).toBe(artKey("BlackKnight's Holy Signet"));
    expect(artKey('scourge of_the_twin_seas')).toBe('scourge_of_the_twin_seas');
    expect(artKeyCandidates('Stormshield_lod')).toEqual(['stormshield_lod', 'stormshield']);
    expect(artKeyCandidates('Cutthroat1')).toEqual(['cutthroat1', 'cutthroat_1']);
  });

  it('parses the art maps: normal first, then uber / ultra, first key wins, `_new` aliases', () => {
    const { art, duplicates } = parseNamedArt(
      [
        { The_Gnasher: { normal: 'axe/the_gnasher', uber: 'axe/x', ultra: 'axe/y' } },
        { only_uber: { uber: 'axe/uber_only', ultra: 'axe/ultra_only' } },
        { the_gnasher: { normal: 'axe/other' } },
        { hellfire_torch_new: { normal: 'charm/torch' } },
        { broken: 'nope' },
      ],
      'uniques.json'
    );
    expect([...art]).toEqual([
      ['the_gnasher', 'axe/the_gnasher'],
      ['only_uber', 'axe/uber_only'],
      ['hellfire_torch_new', 'charm/torch'],
      ['hellfire_torch', 'charm/torch'],
    ]);
    expect(duplicates).toEqual(['the_gnasher']);
    expect(() => parseNamedArt({}, 'sets.json')).toThrow(/sets\.json/);
  });

  it('uses own art, else the base art, one icon per display name', () => {
    const uniqueArt = new Map([
      ['the_gnasher', 'axe/the_gnasher'],
      ['plain_axe', 'axe/hand_axe'],
      ['vanilla_own', 'axe/not_in_clone'],
      ['mythical_buriza', 'bow/mythical_buriza'],
      ['never_used', 'axe/the_gnasher'],
    ]);
    const plan = planItemIcons({
      codes: [],
      uniques: [
        row('The Gnasher', 'The Gnasher', 'hax'),
        row('Plain Axe', 'Plain Axe', 'hax'),
        row('Vanilla Own', 'Vanilla Own', 'cap'),
        row('Nothing', 'Nothing', 'lbt'),
        row('Old Buriza', 'Buriza', 'hax'),
        row('Mythical Buriza', 'Buriza', 'hax', true),
        row('Twin', 'Twin', 'cap'),
        row('The Gnasher', 'Twin', 'hax'),
      ],
      sets: [row("Civerb's Ward", "Civerb's Ward", 'cap')],
      assets,
      uniqueArt,
      setArt: new Map(),
      index,
    });
    expect([...plan.uniques]).toEqual([
      ['The Gnasher', 'axe_the_gnasher'],
      ['Plain Axe', 'axe_hand_axe'],
      ['Vanilla Own', 'helmet_cap'],
      // A disabled row never replaces an enabled one; an enabled row with own art replaces base art
      ['Buriza', 'axe_hand_axe'],
      ['Twin', 'axe_the_gnasher'],
    ]);
    expect(plan.uniqueStats).toEqual({
      requested: 6,
      own: 2,
      base: 3,
      none: 1,
      ownArtMissing: 1,
      unusedKeys: ['never_used'],
    });
    expect([...plan.sets]).toEqual([["Civerb's Ward", 'helmet_cap']]);
    expect(plan.sprites.get('axe_the_gnasher')).toBe('weapon/axe/the_gnasher.sprite');
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
  it('lists the entries with an encoded image, sharing the file of a shared asset', () => {
    const bundle = buildIconsBundle({
      esrVersion: '3.2.24',
      esrTag: '3.2.24',
      plan: {
        bases: new Map([
          ['hax', 'axe_hand_axe'],
          ['9ha', 'axe_hand_axe'],
          ['r33', 'rune_moon_rune'],
        ]),
        uniques: new Map([
          ['The Gnasher', 'axe_the_gnasher'],
          ['Axe Unique', 'axe_hand_axe'],
        ]),
        sets: new Map([["Civerb's Ward", 'rune_moon_rune']]),
      },
      images: new Map([
        ['axe_hand_axe', { width: 58, height: 128 }],
        ['axe_the_gnasher', { width: 60, height: 120 }],
      ]),
      extension: 'webp',
    });
    expect(bundle).toEqual({
      esrVersion: '3.2.24',
      esrTag: '3.2.24',
      bases: {
        hax: { file: 'axe_hand_axe.webp', w: 58, h: 128 },
        '9ha': { file: 'axe_hand_axe.webp', w: 58, h: 128 },
      },
      uniques: {
        'The Gnasher': { file: 'axe_the_gnasher.webp', w: 60, h: 120 },
        'Axe Unique': { file: 'axe_hand_axe.webp', w: 58, h: 128 },
      },
      sets: {},
    });
    expect(Object.keys(JSON.parse(serializeBundle(bundle)) as object)).toEqual(['esrVersion', 'esrTag', 'bases', 'uniques', 'sets']);
  });
});
