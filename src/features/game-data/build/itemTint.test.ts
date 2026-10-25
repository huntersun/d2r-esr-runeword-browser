import { parseTsv } from './tsv.ts';
import {
  buildTint,
  colormapBlock,
  invTransMapFile,
  meanChroma,
  parsePalette,
  planTints,
  readInvTrans,
  TINT_COLORS,
  tintColorIndex,
  tintedSlug,
  untintedFile,
} from './itemTint.ts';

/** A palette (RGB): 0 black, 1–3 greys, 4–6 reds, 7 pure blue, the rest a far-off filler colour */
function testPalette(): Uint8Array {
  const rgb = new Uint8Array(768).fill(0);
  const set = (i: number, r: number, g: number, b: number) => rgb.set([r, g, b], i * 3);
  set(1, 60, 60, 60);
  set(2, 120, 120, 120);
  set(3, 180, 180, 180);
  set(4, 90, 10, 10);
  set(5, 170, 20, 20);
  set(6, 240, 40, 40);
  set(7, 0, 0, 255);
  for (let i = 8; i < 256; i++) set(i, 255, 255, 0);
  return rgb;
}
/** Greys → reds of the same rank, everything else unchanged */
function greyToRedBlock(): Uint8Array {
  const block = Uint8Array.from({ length: 256 }, (_, i) => i);
  block[1] = 4;
  block[2] = 5;
  block[3] = 6;
  return block;
}

describe('palette and colour-map files', () => {
  it('reads pal.dat as BGR', () => {
    const bgr = new Uint8Array(768);
    bgr.set([10, 20, 30], 3);
    bgr.set([255, 255, 255], 255 * 3);
    const rgb = parsePalette(bgr);
    expect([...rgb.subarray(0, 3)]).toEqual([0, 0, 0]);
    expect([...rgb.subarray(3, 6)]).toEqual([30, 20, 10]);
    expect([...rgb.subarray(765, 768)]).toEqual([255, 255, 255]);
    expect(() => parsePalette(new Uint8Array(767))).toThrow(/768/);
  });

  it('selects the 256-byte block of a colour', () => {
    const map = Uint8Array.from({ length: 21 * 256 }, (_, i) => Math.floor(i / 256) * 10 + (i % 2));
    expect([...colormapBlock(map, 9).subarray(0, 3)]).toEqual([90, 91, 90]);
    expect(colormapBlock(map, 20)).toHaveLength(256);
    expect(() => colormapBlock(map, 21)).toThrow(/block/);
    expect(() => colormapBlock(new Uint8Array(5375), 0)).toThrow(/5376/);
  });

  it('maps colors.txt codes to block indices in file order', () => {
    expect(TINT_COLORS).toHaveLength(21);
    expect(tintColorIndex('whit')).toBe(0);
    expect(tintColorIndex('blac')).toBe(3);
    expect(tintColorIndex('cred')).toBe(9);
    expect(tintColorIndex('CRED')).toBe(9);
    expect(tintColorIndex('bwht')).toBe(20);
    expect(tintColorIndex('')).toBeNull();
    expect(tintColorIndex('pink')).toBeNull();
  });

  it('maps InvTrans to the colour-map file; 0, 3, 4 and unknown values never recolour', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(invTransMapFile)).toEqual([
      null,
      'grey',
      'grey2',
      null,
      null,
      'greybrown',
      'invgrey',
      'invgrey2',
      'invgreybrown',
      null,
    ]);
  });

  it('reads InvTrans by code over the item tables, the first row of a code winning', () => {
    const weapons = parseTsv('name\tcode\tInvTrans\nAxe\thax\t8\nDup\thax\t1\nBlank\t\t8\n', 'weapons.txt');
    const misc = parseTsv('name\tcode\tInvTrans\nRing\trin\t\n', 'misc.txt');
    expect([...readInvTrans([weapons, misc])]).toEqual([
      ['hax', 8],
      ['rin', 0],
    ]);
  });

  it('names variant files and recovers the untinted file', () => {
    expect(tintedSlug('glove_bracers_m', 'invgreybrown', 'cred')).toBe('glove_bracers_m__invgreybrown-cred');
    expect(untintedFile('glove_bracers_m__invgreybrown-cred.webp')).toBe('glove_bracers_m.webp');
    expect(untintedFile('axe_hand_axe.webp')).toBe('axe_hand_axe.webp');
  });
});

describe('buildTint', () => {
  const palette = testPalette();

  it('leaves colours the block maps to themselves unchanged', () => {
    const tint = buildTint(palette, greyToRedBlock());
    expect(tint.identity).toBe(false);
    expect(tint.recolor(0, 0, 255)).toEqual([0, 0, 255]);
    expect(tint.recolor(170, 20, 20)).toEqual([170, 20, 20]);
    // Far from every palette entry: kept
    expect(tint.recolor(0, 200, 0)).toEqual([0, 200, 0]);
  });

  it('shifts a grey pixel to red, keeping its shading', () => {
    const tint = buildTint(palette, greyToRedBlock());
    const [r, g, b] = tint.recolor(120, 120, 120);
    // Mostly red; the far-off entries among the 8 nearest of this sparse palette keep a little of the grey
    expect(r).toBeGreaterThan(130);
    expect(r - g).toBeGreaterThan(60);
    expect(g).toBe(b);
    // A slightly brighter grey comes out slightly brighter
    const [r2] = tint.recolor(130, 130, 130);
    expect(r2).toBeGreaterThan(r);
  });

  it('recolours RGBA buffers in place, keeping alpha and skipping transparent pixels', () => {
    const tint = buildTint(palette, greyToRedBlock());
    const rgba = Uint8Array.from([120, 120, 120, 77, 120, 120, 120, 0, 0, 0, 255, 255]);
    tint.apply(rgba);
    expect(rgba[3]).toBe(77);
    expect(rgba[0]).toBeGreaterThan(130);
    expect([...rgba.subarray(4, 8)]).toEqual([120, 120, 120, 0]);
    expect([...rgba.subarray(8, 12)]).toEqual([0, 0, 255, 255]);
  });

  it('recognises an identity block', () => {
    const tint = buildTint(
      palette,
      Uint8Array.from({ length: 256 }, (_, i) => i)
    );
    expect(tint.identity).toBe(true);
    expect(tint.recolor(120, 120, 120)).toEqual([120, 120, 120]);
  });

  it('is deterministic', () => {
    const a = buildTint(palette, greyToRedBlock()).recolor(100, 110, 105);
    const b = buildTint(palette, greyToRedBlock()).recolor(100, 110, 105);
    expect(a).toEqual(b);
  });
});

describe('meanChroma', () => {
  it('is 0 for greyscale art and weights pixels by alpha', () => {
    expect(meanChroma(Uint8Array.from([50, 50, 50, 255, 200, 200, 200, 128]))).toBe(0);
    expect(meanChroma(Uint8Array.from([255, 0, 0, 255, 255, 0, 0, 0]))).toBe(255);
    expect(meanChroma(new Uint8Array(0))).toBe(0);
  });
});

describe('planTints', () => {
  const choice = (slug: string, code: string, invTransform: string, own = false) => ({ slug, own, code, invTransform });
  const invTrans = new Map([
    ['ymg', 8],
    ['rin', 0],
    ['hax', 1],
  ]);

  it('recolours items with a colour code and a recolouring base, sharing variants, and counts the rest', () => {
    const plan = planTints({
      uniqueChoices: new Map([
        ['Grip', choice('glove_bracers_m', 'ymg', 'cred')],
        ['Other Grip', choice('glove_bracers_m', 'ymg', 'cred')],
        ['Ring', choice('ring_ring1', 'rin', 'blac')],
        ['Plain', choice('glove_bracers_m', 'ymg', '')],
        ['Odd', choice('glove_bracers_m', 'ymg', 'pink')],
        ['Own Grey', choice('axe_grey', 'hax', 'cblu', true)],
        ['Own Coloured', choice('axe_coloured', 'hax', 'cblu', true)],
      ]),
      setChoices: new Map([['Set Grip', choice('glove_bracers_m', 'ymg', 'cred')]]),
      invTrans,
      colormaps: new Set(['invgreybrown', 'grey']),
      tintOwnArt: (slug) => slug === 'axe_grey',
    });
    const red = { slug: 'glove_bracers_m__invgreybrown-cred', source: 'glove_bracers_m', map: 'invgreybrown', color: 'cred' };
    expect([...plan.uniques]).toEqual([
      ['Grip', red],
      ['Other Grip', red],
      ['Own Grey', { slug: 'axe_grey__grey-cblu', source: 'axe_grey', map: 'grey', color: 'cblu' }],
    ]);
    expect([...plan.sets]).toEqual([['Set Grip', red]]);
    expect([...plan.variants.keys()]).toEqual(['glove_bracers_m__invgreybrown-cred', 'axe_grey__grey-cblu']);
    expect(plan.uniqueStats).toEqual({
      recoloured: 3,
      recolouredOwnArt: 1,
      neverRecolour: 1,
      noPaletteData: 0,
      unknownColor: ['Odd (pink)'],
      ownArtSkipped: 1,
    });
  });

  it('recolours nothing without palette data', () => {
    const plan = planTints({
      uniqueChoices: new Map([['Grip', choice('glove_bracers_m', 'ymg', 'cred')]]),
      setChoices: new Map(),
      invTrans,
      colormaps: null,
    });
    expect(plan.uniques.size).toBe(0);
    expect(plan.uniqueStats.noPaletteData).toBe(1);
  });
});
