import type { LabelColor } from '../engine/types';

/**
 * The sprite pixels with a minimap icon's tint applied, as the plugin draws them: each pixel's RGB is
 * multiplied by `color / 255`, and its alpha by `color[3] / 255` when the colour has a fourth number.
 * No colour returns an unchanged copy. The input is not changed.
 */
export function tintSprite(rgba: Uint8ClampedArray, color: LabelColor | undefined): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  if (color === undefined) return out;
  const [r, g, b] = [color[0] / 255, color[1] / 255, color[2] / 255];
  const a = color.length === 4 ? color[3] / 255 : 1;
  for (let i = 0; i + 3 < out.length; i += 4) {
    out[i] = (rgba[i] ?? 0) * r;
    out[i + 1] = (rgba[i + 1] ?? 0) * g;
    out[i + 2] = (rgba[i + 2] ?? 0) * b;
    out[i + 3] = (rgba[i + 3] ?? 0) * a;
  }
  return out;
}
