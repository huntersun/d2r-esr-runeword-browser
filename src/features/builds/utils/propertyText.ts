// The ESR site hard-wraps long affix/property text with <br> mid-sentence, and the
// parsers' handling of those wraps can change between releases (one sentence stored
// as three lines in an old snapshot may be one merged line in current data). Line
// boundaries are therefore not meaningful when comparing saved snapshots against
// current data: compare the text as a whole, in order, with whitespace collapsed.

/**
 * The property lines as a single normalised string: lines joined with a space and
 * runs of whitespace collapsed. Split and merged versions of the same text are equal;
 * any wording/number/order change is not. Tolerates a non-array (snapshots are jsonb).
 */
export function propertyText(lines: readonly string[] | undefined): string {
  if (!Array.isArray(lines)) return '';
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

/** Word tokens of the normalised property text (for wrap-independent similarity). */
export function propertyTokens(lines: readonly string[] | undefined): string[] {
  const text = propertyText(lines);
  return text === '' ? [] : text.split(' ');
}
