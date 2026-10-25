import type { Crystal, EsrRune, Gem, HtmUniqueItem, KanjiRune, LodRune, SocketableBonuses } from '@/core/db';
import type { ColumnAffixesSnapshot } from '../buildData';

/** htmUniqueItems category of the unique jewels (the "Jewel" section of the unique others page). */
export const UNIQUE_JEWEL_CATEGORY = 'Jewel';

/** The local socketables an author can put in a socket. */
export interface SocketFillerCatalog {
  readonly esrRunes: readonly EsrRune[];
  readonly lodRunes: readonly LodRune[];
  readonly kanjiRunes: readonly KanjiRune[];
  readonly gems: readonly Gem[];
  readonly crystals: readonly Crystal[];
  readonly uniqueJewels: readonly HtmUniqueItem[];
}

const normalize = (name: string) => name.trim().toLowerCase();

/**
 * The bonus lines a socket filler gives in a bonus column, when its name is a local rune,
 * gem or crystal ("Ko Rune", "Perfect Ruby"; case-insensitive). ESR runes win over LoD
 * runes of the same name, as on the runeword pages. Null for anything else (unique jewels,
 * free text, unknown names).
 */
export function fillerBonusLines(
  name: string,
  catalog: SocketFillerCatalog,
  column: keyof ColumnAffixesSnapshot
): readonly string[] | null {
  const key = normalize(name);
  const sources: readonly (readonly { readonly name: string; readonly bonuses: SocketableBonuses }[])[] = [
    catalog.esrRunes,
    catalog.lodRunes,
    catalog.kanjiRunes,
    catalog.gems,
    catalog.crystals,
  ];
  for (const source of sources) {
    const match = source.find((entry) => normalize(entry.name) === key);
    if (match !== undefined) return match.bonuses[column].map((affix) => affix.rawText);
  }
  return null;
}
