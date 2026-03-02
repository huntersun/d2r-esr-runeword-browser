import type { HtmUniqueItem, HtmUniqueItemPage } from '@/core/db';
import { decodeHtmlEntities } from './shared/parserUtils';

/**
 * Parses HTM unique items from ESR documentation HTML pages.
 *
 * HTML structure (all 3 pages use identical format):
 * - Each category: <a name="CategoryName"> + <table>
 * - Category header row: <td colspan="3" bgcolor="#402040"><b>CategoryName</b></td>
 * - Column headers row: Name | Stats | Properties
 * - Data rows (3 cells): name cell | stats cell | properties cell
 */
export function parseHtmUniqueItems(html: string, page: HtmUniqueItemPage): HtmUniqueItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const items: HtmUniqueItem[] = [];

  // Find all category header cells: td with colspan="3" and bgcolor="#402040"
  const headerCells = doc.querySelectorAll('td[colspan="3"][bgcolor="#402040"]');

  for (const headerCell of headerCells) {
    const bTag = headerCell.querySelector('b');
    if (!bTag) continue;
    const categoryName = bTag.textContent.trim();
    if (!categoryName) continue;

    // Navigate up to the table containing this category
    const table = headerCell.closest('table');
    if (!table) continue;

    // Get all rows in the table, skip first 2 (category header + column headers)
    const rows = table.querySelectorAll('tr');

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td');
      if (cells.length < 3) continue;

      const nameCell = cells[0];
      const statsCell = cells[1];
      const propsCell = cells[2];

      // Parse name cell
      const { name, baseItem, baseItemCode, isAncientCoupon, gambleItem } = parseNameCell(nameCell);
      if (!name) continue;

      // Parse stats cell
      const { itemLevel, reqLevel } = parseStatsCell(statsCell);

      // Parse properties cell
      const properties = parsePropertiesCell(propsCell);

      items.push({
        name,
        baseItem,
        baseItemCode,
        page,
        category: categoryName,
        itemLevel,
        reqLevel,
        properties,
        isAncientCoupon,
        gambleItem,
      });
    }
  }

  return items;
}

interface ParsedNameCell {
  name: string;
  baseItem: string;
  baseItemCode: string;
  isAncientCoupon: boolean;
  gambleItem: string;
}

function parseNameCell(cell: Element): ParsedNameCell {
  const result: ParsedNameCell = {
    name: '',
    baseItem: '',
    baseItemCode: '',
    isAncientCoupon: false,
    gambleItem: '',
  };

  // Item name is the first text node inside <b>
  const bTag = cell.querySelector('b');
  if (!bTag) return result;

  // The <b> tag contains: "ItemName<br>BaseItem (code)" or "ItemName<br><a>BaseItem (code)</a>"
  const bHtml = bTag.innerHTML;
  const parts = bHtml.split(/<br\s*\/?>/i);

  // First part: item name
  result.name = parts[0]
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Second part: base item (may be in an <a> tag or plain text)
  if (parts.length > 1) {
    const baseText = parts
      .slice(1)
      .join(' ')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract base item name and code from "Base Item (code)" format
    const codeMatch = /^(.+?)\s*\((\w+)\)\s*$/.exec(baseText);
    if (codeMatch) {
      result.baseItem = codeMatch[1].trim();
      result.baseItemCode = codeMatch[2];
    } else {
      result.baseItem = baseText;
    }
  }

  // Check for Ancient Coupon Unique
  const cellText = cell.textContent;
  if (cellText.includes('Ancient Coupon Unique')) {
    result.isAncientCoupon = true;
  }

  // Check for Gamble Item
  const gambleMatch = /Gamble Item:\s*([\s\S]*?)$/i.exec(cellText);
  if (gambleMatch) {
    // Extract the gamble item name (clean up whitespace)
    const gambleText = gambleMatch[1].replace(/\s+/g, ' ').trim();
    // Remove trailing code in parens if present: "Hand Axe (hax)" -> "Hand Axe"
    const gambleNameMatch = /^(.+?)\s*\([^)]+\)\s*$/.exec(gambleText);
    result.gambleItem = gambleNameMatch ? gambleNameMatch[1].trim() : gambleText;
  }

  return result;
}

interface ParsedStatsCell {
  itemLevel: number;
  reqLevel: number;
}

function parseStatsCell(cell: Element): ParsedStatsCell {
  const text = cell.textContent;

  const itemLevelMatch = /Item Level:\s*(\d+)/i.exec(text);
  const reqLevelMatch = /Required Level:\s*(\d+)/i.exec(text);

  return {
    itemLevel: itemLevelMatch ? parseInt(itemLevelMatch[1], 10) : 0,
    reqLevel: reqLevelMatch ? parseInt(reqLevelMatch[1], 10) : 0,
  };
}

function parsePropertiesCell(cell: Element): string[] {
  const html = cell.innerHTML;
  if (!html.trim()) return [];

  return html
    .split(/<br\s*\/?>/i)
    .map((line) => line.replace(/<[^>]*>/g, ''))
    .map((line) => decodeHtmlEntities(line))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}
