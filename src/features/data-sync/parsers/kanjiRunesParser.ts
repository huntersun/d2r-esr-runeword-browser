import type { KanjiRune } from '@/core/db';
import { parseReqLevel, parseBonuses, hasColoredInnerFont, getInnerFontColor, getItemName } from './shared/parserUtils';
import { isEsrTierColor } from './esrRunesParser';

/**
 * Checks if a name is a Kanji rune.
 * Kanji runes: end with " Rune" and have a colored inner font that is not an ESR tier color.
 * The exact color is not matched because the site has changed it before (BLUE until ESR 3.12, #EED68D since 3.2).
 */
export function isKanjiRuneName(name: string, color: string | null): boolean {
  if (!name.endsWith(' Rune')) return false;
  if (!color) return false;
  return !isEsrTierColor(color);
}

export function parseKanjiRunesHtml(html: string): KanjiRune[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const kanjiRunes: KanjiRune[] = [];

  const headerCells = doc.querySelectorAll('td[colspan="3"]');

  for (const headerCell of headerCells) {
    const headerRow = headerCell.parentElement;
    if (!headerRow) continue;

    // Kanji runes must have colored inner font
    if (!hasColoredInnerFont(headerCell)) continue;

    const name = getItemName(headerCell);
    if (!name) continue;

    const color = getInnerFontColor(headerCell);
    if (!isKanjiRuneName(name, color)) continue;

    const headerText = headerCell.textContent;
    const reqLevel = headerText ? parseReqLevel(headerText) : 0;

    const bonuses = parseBonuses(headerRow);

    kanjiRunes.push({
      name,
      reqLevel,
      bonuses,
    });
  }

  console.log(`Parsed ${String(kanjiRunes.length)} Kanji runes`);
  return kanjiRunes;
}
