/** Conversions between the filter's `[r, g, b]` / `[r, g, b, a]` colours and the `#rrggbb` form of `<input type=color>`. */
import type { LabelColor, RgbColor } from '../engine/types';

/** A whole number 0 to 255 (NaN becomes 0). */
export function clampByte(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
}

/** `#rrggbb` of the first three numbers (alpha is ignored). */
export function colorToHex(color: readonly number[]): string {
  const channel = (index: number) =>
    clampByte(color[index] ?? 0)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/** `[r, g, b]` of `#rrggbb` or `#rgb` (the `#` is optional), or undefined when it is not a hex colour. */
export function hexToRgb(hex: string): RgbColor | undefined {
  const digits = hex.trim().replace(/^#/, '');
  const full = /^[0-9a-f]{3}$/i.test(digits) ? digits.replace(/./g, (digit) => digit + digit) : digits;
  if (!/^[0-9a-f]{6}$/i.test(full)) return undefined;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/** The alpha of a colour, or undefined for `[r, g, b]`. */
export function colorAlpha(color: LabelColor): number | undefined {
  return color.length === 4 ? color[3] : undefined;
}

/** `rgb` with the alpha of `color` kept (when it has one). */
export function withRgb(color: LabelColor | undefined, rgb: RgbColor): LabelColor {
  const alpha = color === undefined ? undefined : colorAlpha(color);
  return withAlpha(rgb, alpha);
}

/** `color` with the given alpha, or as `[r, g, b]` when `alpha` is undefined. */
export function withAlpha(color: LabelColor, alpha: number | undefined): LabelColor {
  const rgb: RgbColor = [clampByte(color[0]), clampByte(color[1]), clampByte(color[2])];
  return alpha === undefined ? rgb : [rgb[0], rgb[1], rgb[2], clampByte(alpha)];
}

/** `"255, 128, 0"` or `"255, 128, 0, 200"`, as the JSON writes it without brackets. */
export function formatColor(color: LabelColor): string {
  return color.join(', ');
}
