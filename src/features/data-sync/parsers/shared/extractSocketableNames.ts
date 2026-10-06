import { getItemName, getInnerFontColor, hasColoredInnerFont, normalizeRuneName } from './parserUtils';

export interface ExtractedSocketable {
  readonly name: string;
  readonly color: string | null;
  readonly isRune: boolean;
}

/**
 * Extracts all socketable names from the gems HTML.
 * This is used for completeness verification - ensuring no socketables are missed by parsers.
 *
 * The HTML structure has header cells with colspan="3" containing item names.
 * - No colored inner font → LoD rune
 * - Colored inner font → ESR or Kanji rune (see categorizeSocketables)
 * - Non-runes → gems or crystals
 */
export function extractAllSocketableNames(html: string): ExtractedSocketable[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const socketables: ExtractedSocketable[] = [];

  const headerCells = doc.querySelectorAll('td[colspan="3"]');

  for (const headerCell of headerCells) {
    const rawName = getItemName(headerCell);
    if (!rawName) continue;

    // Normalize name to strip "(X points)" suffix if present
    const { name } = normalizeRuneName(rawName);

    // Determine color
    let color: string | null = null;
    if (hasColoredInnerFont(headerCell)) {
      color = getInnerFontColor(headerCell);
    }

    const isRune = name.endsWith(' Rune');

    socketables.push({ name, color, isRune });
  }

  return socketables;
}

/**
 * Groups extracted socketables by their expected parser category.
 *
 * Deliberately uses page order instead of colors, so it stays an independent check of the
 * color-based parsers: gems.htm lists ESR runes, then the uncolored LoD runes, then Kanji runes.
 * A colored rune is therefore ESR before the first LoD rune and Kanji after it.
 */
export function categorizeSocketables(socketables: ExtractedSocketable[]): {
  lodRunes: string[];
  kanjiRunes: string[];
  esrRunes: string[];
  nonRunes: string[]; // gems and crystals
} {
  const lodRunes: string[] = [];
  const kanjiRunes: string[] = [];
  const esrRunes: string[] = [];
  const nonRunes: string[] = [];

  for (const { name, color, isRune } of socketables) {
    if (isRune) {
      if (color === null) {
        // No color = LoD rune
        lodRunes.push(name);
      } else if (lodRunes.length > 0) {
        // Colored rune after the LoD runes = Kanji rune
        kanjiRunes.push(name);
      } else {
        // Colored rune before the LoD runes = ESR rune
        esrRunes.push(name);
      }
    } else {
      // Non-runes are gems or crystals
      nonRunes.push(name);
    }
  }

  return { lodRunes, kanjiRunes, esrRunes, nonRunes };
}
