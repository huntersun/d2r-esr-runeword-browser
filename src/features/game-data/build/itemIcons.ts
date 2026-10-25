/**
 * Item icons from the HD item sprites an ESR clone ships (pure logic; scripts/generate-item-icons.ts does the IO and
 * the WebP encoding).
 *
 * - `hd/items/items.json` maps an item code to an asset path (`{"hax":{"asset":"axe/hand_axe"}}`);
 * - the asset is `hd/global/ui/items/{weapon|armor|misc}/<asset>.sprite`, matched case-insensitively (17 asset paths
 *   differ from the file name in letter case, and Linux file systems are case-sensitive);
 * - items whose asset is not in the clone use vanilla D2R art and get no icon.
 */
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { IconsBundle, ItemIconInfo } from '../engine/schema.ts';

export const ESR_HD_ITEMS_FILE = 'Eastern_Sun_Resurrected.mpq/data/hd/items/items.json';
export const ESR_HD_ITEM_SPRITES_DIR = 'Eastern_Sun_Resurrected.mpq/data/hd/global/ui/items';
/** Subfolders of ESR_HD_ITEM_SPRITES_DIR an asset path resolves into, in lookup order */
export const ITEM_SPRITE_FOLDERS = ['weapon', 'armor', 'misc'] as const;
/** Icons fit inside a square of this many pixels (keeping the aspect ratio, never enlarged) */
export const ICON_MAX_SIDE = 128;

export interface ItemAssets {
  /** Code → asset path; the first entry wins when a code repeats */
  readonly assets: ReadonlyMap<string, string>;
  /** Codes listed more than once */
  readonly duplicates: readonly string[];
}

/** Parses items.json: an array of single-key objects `{ code: { asset } }`. Malformed entries are skipped. */
export function parseItemAssets(json: unknown): ItemAssets {
  if (!Array.isArray(json)) throw new Error('items.json: expected an array');
  const assets = new Map<string, string>();
  const duplicates: string[] = [];
  for (const entry of json as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue;
    for (const [code, value] of Object.entries(entry as Record<string, unknown>)) {
      const asset = typeof value === 'object' && value !== null ? (value as Record<string, unknown>).asset : undefined;
      if (typeof asset !== 'string' || asset === '') continue;
      if (assets.has(code)) duplicates.push(code);
      else assets.set(code, asset);
    }
  }
  return { assets, duplicates };
}

/** Lowercased `folder/asset` (no extension) → the real relative path of the `.sprite` file, `/`-separated. */
export type SpriteIndex = ReadonlyMap<string, string>;

/** Builds the index from relative `.sprite` paths (`weapon/axe/hand_axe.sprite`); other files are ignored. */
export function buildSpriteIndex(relativePaths: readonly string[]): SpriteIndex {
  const index = new Map<string, string>();
  for (const path of [...relativePaths].sort()) {
    const normalized = path.split(sep).join('/');
    if (!normalized.toLowerCase().endsWith('.sprite')) continue;
    const key = normalized.slice(0, -'.sprite'.length).toLowerCase();
    if (!index.has(key)) index.set(key, normalized);
  }
  return index;
}

/** Lists every file under `dir` as `/`-separated paths relative to it (sorted, deterministic). */
export function listFilesRecursive(dir: string): string[] {
  const entries = readdirSync(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
}

/** The real relative sprite path for an asset, looked up case-insensitively in each folder; null when the clone lacks it. */
export function resolveSprite(asset: string, index: SpriteIndex): string | null {
  const key = asset.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
  for (const folder of ITEM_SPRITE_FOLDERS) {
    const path = index.get(`${folder}/${key}`);
    if (path !== undefined) return path;
  }
  return null;
}

/** Output file name of an asset: `axe/Hand_Axe` → `axe_hand_axe.webp`. */
export function assetSlug(asset: string): string {
  return asset
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, '-')
    .replace(/\//g, '_');
}

export interface IconPlan {
  /** Code → asset slug, for codes whose art the clone ships (input order) */
  readonly codes: ReadonlyMap<string, string>;
  /** Slug → real relative sprite path, one per distinct asset */
  readonly sprites: ReadonlyMap<string, string>;
  /** Codes without an items.json entry */
  readonly missingEntry: readonly string[];
  /** Codes whose asset is not in the clone (vanilla D2R art) */
  readonly missingArt: readonly string[];
}

export function planItemIcons(codes: readonly string[], assets: ReadonlyMap<string, string>, index: SpriteIndex): IconPlan {
  const byCode = new Map<string, string>();
  const sprites = new Map<string, string>();
  const missingEntry: string[] = [];
  const missingArt: string[] = [];
  for (const code of codes) {
    if (byCode.has(code)) continue;
    const asset = assets.get(code);
    if (asset === undefined) {
      missingEntry.push(code);
      continue;
    }
    const sprite = resolveSprite(asset, index);
    if (sprite === null) {
      missingArt.push(code);
      continue;
    }
    const slug = assetSlug(asset);
    byCode.set(code, slug);
    if (!sprites.has(slug)) sprites.set(slug, sprite);
  }
  return { codes: byCode, sprites, missingEntry, missingArt };
}

export interface CropBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Bounding box of the pixels with any alpha; null when the image is fully transparent. */
export function opaqueBounds(width: number, height: number, rgba: Uint8Array | Uint8ClampedArray): CropBox | null {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if ((rgba[row + x * 4 + 3] ?? 0) === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Copies the box out of an RGBA image. */
export function cropRgba(width: number, rgba: Uint8Array | Uint8ClampedArray, box: CropBox): Uint8Array {
  const out = new Uint8Array(box.width * box.height * 4);
  for (let y = 0; y < box.height; y++) {
    const start = ((box.y + y) * width + box.x) * 4;
    out.set(rgba.subarray(start, start + box.width * 4), y * box.width * 4);
  }
  return out;
}

/** Size that fits inside max×max keeping the aspect ratio; never enlarges, never below 1 px. */
export function fitInside(width: number, height: number, max: number = ICON_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / width, max / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** icons.json: only the codes whose slug got an image (decode failures drop out). */
export function buildIconsBundle(input: {
  esrVersion: string;
  esrTag: string | null;
  codes: ReadonlyMap<string, string>;
  images: ReadonlyMap<string, { width: number; height: number }>;
  extension: string;
}): IconsBundle {
  const icons: Record<string, ItemIconInfo> = {};
  for (const [code, slug] of input.codes) {
    const image = input.images.get(slug);
    if (image === undefined) continue;
    icons[code] = { file: `${slug}.${input.extension}`, w: image.width, h: image.height };
  }
  return { esrVersion: input.esrVersion, esrTag: input.esrTag, icons };
}
