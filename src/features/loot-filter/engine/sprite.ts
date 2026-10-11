/**
 * Decoder for D2R HD `.sprite` files (the minimap icons a filter ships in its `icons` folder).
 *
 * Layout, as observed in the author's goldstar.sprite / goldstar.lowend.sprite:
 * - bytes 0–3: magic `SpA1`; u16 at 4: version (31); u16 at 6: width again;
 * - i32 at 8: width, i32 at 12: height, i32 at 16: 0, i32 at 20: frame count; zeros to byte 40;
 * - from byte 40: frames of raw pixels, `width × height × 4` bytes each, in RGBA order (the gold star's
 *   opaque pixels average about R 187, G 131, B 37, so red comes first; BGRA would make it blue).
 * Only the first frame is decoded, as the plugin draws only that one.
 */

export interface DecodedSprite {
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  /** The first frame, RGBA, row by row from the top (ready for `ImageData`). */
  readonly rgba: Uint8ClampedArray;
}

const HEADER_SIZE = 40;
const MAGIC = 'SpA1';
const MAX_SIDE = 4096;

export function decodeSprite(bytes: ArrayBuffer | Uint8Array): DecodedSprite {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.byteLength < HEADER_SIZE) throw new Error('Not a .sprite file: it is shorter than the 40-byte header');
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const magic = String.fromCharCode(...data.subarray(0, 4));
  if (magic !== MAGIC) throw new Error(`Not a .sprite file: expected "${MAGIC}" at the start, found ${JSON.stringify(magic)}`);
  const width = view.getInt32(8, true);
  const height = view.getInt32(12, true);
  const frames = view.getInt32(20, true);
  if (width <= 0 || height <= 0 || width > MAX_SIDE || height > MAX_SIDE) {
    throw new Error(`Unsupported .sprite size ${String(width)}×${String(height)}`);
  }
  if (frames < 1) throw new Error('The .sprite file has no frames');
  const frameSize = width * height * 4;
  if (data.byteLength < HEADER_SIZE + frameSize) {
    throw new Error(`The .sprite file is truncated: ${String(width)}×${String(height)} needs ${String(HEADER_SIZE + frameSize)} bytes`);
  }
  const rgba = new Uint8ClampedArray(frameSize);
  rgba.set(data.subarray(HEADER_SIZE, HEADER_SIZE + frameSize));
  return { width, height, frames, rgba };
}
