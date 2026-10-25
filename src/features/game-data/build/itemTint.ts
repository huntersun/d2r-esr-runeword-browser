/**
 * Inventory colour transforms of unique and set items (pure logic; scripts/generate-item-icons.ts does the IO).
 *
 * The game recolours a unique / set item's inventory art at draw time with the legacy palette system (D2R ships no HD
 * colour data): the item row's `invtransform` (uniqueitems.txt / setitems.txt) names a colour of colors.txt, the base
 * row's `InvTrans` (weapons / armor / misc.txt) selects a colour-map file (`data/global/items/palette/*.dat`, 21 blocks
 * of 256 bytes, one per colour), and a pixel of palette index `i` is drawn as `palette[map[colour * 256 + i]]`.
 *
 * HD sprites are true colour, so `buildTint` approximates the lookup: each pixel is matched to its nearest palette
 * entries, the entries' destination colours are blended by distance, and the pixel's own shading is kept by scaling the
 * result by the pixel's luminance relative to the matched entries'. Entries the map leaves alone (and pixels far from
 * any entry) keep the pixel as it is.
 */
import type { TsvTable } from './tsv.ts';

/** colors.txt codes in file order; the position is the block index in a colour-map file */
export const TINT_COLORS = [
  'whit',
  'lgry',
  'dgry',
  'blac',
  'lblu',
  'dblu',
  'cblu',
  'lred',
  'dred',
  'cred',
  'lgrn',
  'dgrn',
  'cgrn',
  'lyel',
  'dyel',
  'lgld',
  'dgld',
  'lpur',
  'dpur',
  'oran',
  'bwht',
] as const;
export type TintColor = (typeof TINT_COLORS)[number];

/** Folder of the colour-map files and the palette, relative to a `data/global`-rooted folder (the vanilla art folder) */
export const COLORMAP_DIR = 'data/global/items/palette';
/** The base palette the inventory art is drawn with (256 × BGR) */
export const PALETTE_FILE = 'data/global/palette/act1/pal.dat';

const PALETTE_BYTES = 256 * 3;
const COLORMAP_BYTES = TINT_COLORS.length * 256;

/** Block index of a colors.txt code (case-insensitive); null for blank or unknown codes. */
export function tintColorIndex(code: string): number | null {
  const index = (TINT_COLORS as readonly string[]).indexOf(code.trim().toLowerCase());
  return index < 0 ? null : index;
}

/**
 * Colour-map file (without `.dat`) selected by a base row's `InvTrans`; null when the item is never recoloured
 * (0, and 3 / 4, which the game treats as 0, and anything unknown).
 */
export function invTransMapFile(invTrans: number): string | null {
  switch (invTrans) {
    case 1:
      return 'grey';
    case 2:
      return 'grey2';
    case 5:
      return 'greybrown';
    case 6:
      return 'invgrey';
    case 7:
      return 'invgrey2';
    case 8:
      return 'invgreybrown';
    default:
      return null;
  }
}

/** Every colour-map file `invTransMapFile` can name */
export const COLORMAP_FILES = ['grey', 'grey2', 'greybrown', 'invgrey', 'invgrey2', 'invgreybrown'] as const;

/** `InvTrans` by item code over weapons / armor / misc.txt (every row, shadow bases included); the first row of a code wins. */
export function readInvTrans(tables: readonly TsvTable[]): Map<string, number> {
  const byCode = new Map<string, number>();
  for (const table of tables) {
    for (const row of table.rows) {
      const code = row.str('code');
      if (code === '' || byCode.has(code) || !row.has('InvTrans')) continue;
      byCode.set(code, row.num('InvTrans'));
    }
  }
  return byCode;
}

/** pal.dat (256 entries of B, G, R) → 256 × R, G, B. */
export function parsePalette(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength !== PALETTE_BYTES)
    throw new Error(`palette: expected ${String(PALETTE_BYTES)} bytes, got ${String(bytes.byteLength)}`);
  const rgb = new Uint8Array(PALETTE_BYTES);
  for (let i = 0; i < 256; i++) {
    rgb[i * 3] = bytes[i * 3 + 2] ?? 0;
    rgb[i * 3 + 1] = bytes[i * 3 + 1] ?? 0;
    rgb[i * 3 + 2] = bytes[i * 3] ?? 0;
  }
  return rgb;
}

/** The 256-byte block of a colour in a colour-map file (`[i]` = new palette index of index `i`). */
export function colormapBlock(bytes: Uint8Array, colorIndex: number): Uint8Array {
  if (bytes.byteLength !== COLORMAP_BYTES) {
    throw new Error(`colour map: expected ${String(COLORMAP_BYTES)} bytes, got ${String(bytes.byteLength)}`);
  }
  if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex >= TINT_COLORS.length) {
    throw new Error(`colour map: no block ${String(colorIndex)}`);
  }
  return bytes.slice(colorIndex * 256, colorIndex * 256 + 256);
}

export interface TintOptions {
  /** Nearest palette entries blended per pixel */
  readonly k?: number;
  /** RGB distance beyond which an entry counts as "leave the pixel alone" */
  readonly maxDistance?: number;
}

/** Tuned on a comparison sheet: k = 8 smooths the speckle k = 4 left on saturated parts (gems); 64 recolours mid-tone leather fully */
export const DEFAULT_TINT_OPTIONS: Required<TintOptions> = { k: 8, maxDistance: 64 };

/** Own art at or below this mean chroma counts as greyscale (made to be tinted); see `meanChroma` */
export const GREYSCALE_MAX_CHROMA = 5;

/**
 * Alpha-weighted mean of `max(R, G, B) - min(R, G, B)` over an RGBA buffer (0 for greyscale art, 0 when empty). ESR
 * ships about 60 own unique / set sprites in pure greyscale, evidently drawn for the colour transform; coloured own art
 * (Divada's Screen's gold and red) loses its design when tinted.
 */
export function meanChroma(rgba: Uint8Array | Uint8ClampedArray): number {
  let sum = 0;
  let weight = 0;
  for (let p = 0; p + 3 < rgba.length; p += 4) {
    const alpha = (rgba[p + 3] ?? 0) / 255;
    if (alpha === 0) continue;
    const r = rgba[p] ?? 0;
    const g = rgba[p + 1] ?? 0;
    const b = rgba[p + 2] ?? 0;
    sum += alpha * (Math.max(r, g, b) - Math.min(r, g, b));
    weight += alpha;
  }
  return weight === 0 ? 0 : sum / weight;
}

const luminance = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;
const clampByte = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

export interface Tint {
  /** True when the block changes no colour (every entry maps to an entry of the same colour) */
  readonly identity: boolean;
  /** Recoloured R, G, B of one pixel */
  recolor(r: number, g: number, b: number): [number, number, number];
  /** Recolours an RGBA buffer in place (alpha untouched) and returns it */
  apply(rgba: Uint8Array): Uint8Array;
}

/**
 * The approximate recolour for one (palette, block). Per pixel: the `k` nearest palette entries (index 0, the
 * transparent entry, excluded), weighted by `max(0, 1 - d / d_next)²` where `d_next` is the distance of the
 * (k+1)-th entry — so an entry's weight fades to 0 before it drops out of the set and the result is continuous, no
 * posterisation. Entries the block maps to the same colour, and entries farther than `maxDistance`, keep the pixel;
 * the others contribute their destination colour scaled by the pixel's luminance relative to the entry's source
 * luminance (the pixel's shading survives). Results are cached per colour, so the output is deterministic and fast.
 */
export function buildTint(palette: Uint8Array, block: Uint8Array, options: TintOptions = {}): Tint {
  const { k, maxDistance } = { ...DEFAULT_TINT_OPTIONS, ...options };
  const count = 255;
  const src = new Float64Array(count * 3);
  const dst = new Float64Array(count * 3);
  const srcLum = new Float64Array(count);
  const changed = new Uint8Array(count);
  let identity = true;
  for (let n = 0; n < count; n++) {
    const i = n + 1;
    const j = block[i] ?? i;
    for (let c = 0; c < 3; c++) {
      src[n * 3 + c] = palette[i * 3 + c] ?? 0;
      dst[n * 3 + c] = palette[j * 3 + c] ?? 0;
    }
    srcLum[n] = luminance(src[n * 3] ?? 0, src[n * 3 + 1] ?? 0, src[n * 3 + 2] ?? 0);
    const same = dst[n * 3] === src[n * 3] && dst[n * 3 + 1] === src[n * 3 + 1] && dst[n * 3 + 2] === src[n * 3 + 2];
    changed[n] = same ? 0 : 1;
    if (!same) identity = false;
  }

  const nearestIdx = new Int32Array(k + 1);
  const nearestD = new Float64Array(k + 1);
  const cache = new Map<number, number>();

  const compute = (r: number, g: number, b: number): number => {
    // Insertion into the k+1 smallest distances
    let filled = 0;
    for (let n = 0; n < count; n++) {
      const dr = (src[n * 3] ?? 0) - r;
      const dg = (src[n * 3 + 1] ?? 0) - g;
      const db = (src[n * 3 + 2] ?? 0) - b;
      const d = dr * dr + dg * dg + db * db;
      if (filled === k + 1 && d >= (nearestD[k] ?? 0)) continue;
      let pos = filled < k + 1 ? filled++ : k;
      while (pos > 0 && (nearestD[pos - 1] ?? 0) > d) {
        nearestD[pos] = nearestD[pos - 1] ?? 0;
        nearestIdx[pos] = nearestIdx[pos - 1] ?? 0;
        pos--;
      }
      nearestD[pos] = d;
      nearestIdx[pos] = n;
    }
    const pixelLum = luminance(r, g, b);
    const next = Math.sqrt(nearestD[k] ?? 0);
    let weightSum = 0;
    let keep = 0;
    let outR = 0;
    let outG = 0;
    let outB = 0;
    for (let m = 0; m < k; m++) {
      const d = Math.sqrt(nearestD[m] ?? 0);
      // Coincident k-th and (k+1)-th entries: equal weights
      const fade = next > 0 ? Math.max(0, 1 - d / next) : 1;
      const w = m === 0 && fade === 0 ? 1 : fade * fade;
      if (w === 0) continue;
      weightSum += w;
      const n = nearestIdx[m] ?? 0;
      if (changed[n] === 0 || d > maxDistance) {
        keep += w;
        continue;
      }
      const ratio = Math.min(3, (pixelLum + 1) / ((srcLum[n] ?? 0) + 1));
      outR += w * (dst[n * 3] ?? 0) * ratio;
      outG += w * (dst[n * 3 + 1] ?? 0) * ratio;
      outB += w * (dst[n * 3 + 2] ?? 0) * ratio;
    }
    if (weightSum === 0 || keep === weightSum) return (r << 16) | (g << 8) | b;
    const keepShare = keep / weightSum;
    const nr = clampByte(keepShare * r + outR / weightSum);
    const ng = clampByte(keepShare * g + outG / weightSum);
    const nb = clampByte(keepShare * b + outB / weightSum);
    return (nr << 16) | (ng << 8) | nb;
  };

  const recolorPacked = (r: number, g: number, b: number): number => {
    const key = (r << 16) | (g << 8) | b;
    let value = cache.get(key);
    if (value === undefined) {
      value = identity ? key : compute(r, g, b);
      cache.set(key, value);
    }
    return value;
  };

  return {
    identity,
    recolor(r, g, b) {
      const value = recolorPacked(r, g, b);
      return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    },
    apply(rgba) {
      if (identity) return rgba;
      for (let p = 0; p + 3 < rgba.length; p += 4) {
        if ((rgba[p + 3] ?? 0) === 0) continue;
        const value = recolorPacked(rgba[p] ?? 0, rgba[p + 1] ?? 0, rgba[p + 2] ?? 0);
        rgba[p] = (value >> 16) & 255;
        rgba[p + 1] = (value >> 8) & 255;
        rgba[p + 2] = value & 255;
      }
      return rgba;
    },
  };
}

/** Slug of a recoloured variant: `<asset slug>__<map file>-<colour>` (shared by every item with the same triple). */
export function tintedSlug(slug: string, map: string, color: string): string {
  return `${slug}__${map}-${color}`;
}

/** The untinted file of an icon file name (`armor_gloves__invgreybrown-cred.webp` → `armor_gloves.webp`); others as is. */
export function untintedFile(file: string): string {
  return file.replace(/__[a-z0-9]+-[a-z]+(\.[a-z0-9]+)$/, '$1');
}

/** A unique / set item's recoloured icon */
export interface TintRef {
  /** Variant slug (`tintedSlug`) */
  readonly slug: string;
  /** Untinted asset slug it is made from */
  readonly source: string;
  /** Colour-map file without `.dat` */
  readonly map: string;
  readonly color: TintColor;
}

export interface TintStats {
  /** Items whose icon is recoloured */
  readonly recoloured: number;
  /** Of `recoloured`: items showing their own art */
  readonly recolouredOwnArt: number;
  /** Items with a colour code whose base's `InvTrans` never recolours (0, 3, 4) */
  readonly neverRecolour: number;
  /** Items with a colour code and a recolouring base, but no colour-map / palette data (vanilla folder missing) */
  readonly noPaletteData: number;
  /** Items with a colour code that is not in colors.txt */
  readonly unknownColor: readonly string[];
  /** Items with own art and a colour code left untinted because the art is coloured (`tintOwnArt` false) */
  readonly ownArtSkipped: number;
}

export interface TintPlan {
  readonly uniques: ReadonlyMap<string, TintRef>;
  readonly sets: ReadonlyMap<string, TintRef>;
  /** Variant slug → its tint, one per distinct (asset, map, colour) */
  readonly variants: ReadonlyMap<string, TintRef>;
  readonly uniqueStats: TintStats;
  readonly setStats: TintStats;
}

export interface TintPlanInput {
  readonly uniqueChoices: ReadonlyMap<string, { slug: string; own: boolean; code: string; invTransform: string }>;
  readonly setChoices: ReadonlyMap<string, { slug: string; own: boolean; code: string; invTransform: string }>;
  /** `readInvTrans` of weapons / armor / misc.txt */
  readonly invTrans: ReadonlyMap<string, number>;
  /** Colour-map files available (`COLORMAP_FILES` read from the vanilla folder); null without palette data */
  readonly colormaps: ReadonlySet<string> | null;
  /**
   * Whether an item showing its own art (by asset slug) is recoloured too; default all. The generator passes "the art
   * is greyscale": the game tints own art as well, but ESR's coloured HD art already carries its colours.
   */
  readonly tintOwnArt?: (slug: string) => boolean;
}

/** Which unique / set icons get a recoloured variant: a colour code on the row and a recolouring base. */
export function planTints(input: TintPlanInput): TintPlan {
  const variants = new Map<string, TintRef>();
  const section = (choices: TintPlanInput['uniqueChoices']) => {
    const refs = new Map<string, TintRef>();
    let recolouredOwnArt = 0;
    let neverRecolour = 0;
    let noPaletteData = 0;
    let ownArtSkipped = 0;
    const unknownColor: string[] = [];
    for (const [name, choice] of choices) {
      if (choice.invTransform === '') continue;
      const colorIndex = tintColorIndex(choice.invTransform);
      const color = colorIndex === null ? undefined : TINT_COLORS[colorIndex];
      if (color === undefined) {
        unknownColor.push(`${name} (${choice.invTransform})`);
        continue;
      }
      const map = invTransMapFile(input.invTrans.get(choice.code) ?? 0);
      if (map === null) {
        neverRecolour++;
        continue;
      }
      if (input.colormaps?.has(map) !== true) {
        noPaletteData++;
        continue;
      }
      if (choice.own && input.tintOwnArt?.(choice.slug) === false) {
        ownArtSkipped++;
        continue;
      }
      if (choice.own) recolouredOwnArt++;
      const slug = tintedSlug(choice.slug, map, color);
      const ref = variants.get(slug) ?? { slug, source: choice.slug, map, color };
      variants.set(slug, ref);
      refs.set(name, ref);
    }
    const stats: TintStats = { recoloured: refs.size, recolouredOwnArt, neverRecolour, noPaletteData, unknownColor, ownArtSkipped };
    return { refs, stats };
  };
  const uniques = section(input.uniqueChoices);
  const sets = section(input.setChoices);
  return { uniques: uniques.refs, sets: sets.refs, variants, uniqueStats: uniques.stats, setStats: sets.stats };
}
