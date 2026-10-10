/**
 * Display text of a (colour-stripped) string-table entry. Multi-line item names are drawn bottom-up in game, so the
 * last line is the name and the lines above it are descriptors: "(Buckler, Pelta Lunata)\nAncient Coupon" →
 * "Ancient Coupon (Buckler, Pelta Lunata)".
 */
export function displayName(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .reverse()
    .join(' ');
}
