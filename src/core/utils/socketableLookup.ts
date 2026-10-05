import type { EsrRune, Gem, KanjiRune, LodRune, SocketableBonuses } from '@/core/db/models';
import type { BonusCategory } from './itemCategoryMapping';

/** Rune and gem tables keyed by name, loaded once per screen. */
export interface SocketableLookup {
  readonly esrRunes: ReadonlyMap<string, EsrRune>;
  readonly lodRunes: ReadonlyMap<string, LodRune>;
  readonly kanjiRunes: ReadonlyMap<string, KanjiRune>;
  readonly gems: ReadonlyMap<string, Gem>;
}

export type ResolvedRune =
  | { readonly category: 'esrRunes'; readonly rune: EsrRune }
  | { readonly category: 'lodRunes'; readonly rune: LodRune }
  | { readonly category: 'kanjiRunes'; readonly rune: KanjiRune };

/** Bonus texts per item category (e.g. aggregated rune/gem bonuses). */
export type BonusTextsByCategory = Readonly<Record<BonusCategory, readonly string[]>>;

export function buildSocketableLookup(
  esrRunes: readonly EsrRune[],
  lodRunes: readonly LodRune[],
  kanjiRunes: readonly KanjiRune[],
  gems: readonly Gem[]
): SocketableLookup {
  return {
    esrRunes: new Map(esrRunes.map((rune) => [rune.name, rune])),
    lodRunes: new Map(lodRunes.map((rune) => [rune.name, rune])),
    kanjiRunes: new Map(kanjiRunes.map((rune) => [rune.name, rune])),
    gems: new Map(gems.map((gem) => [gem.name, gem])),
  };
}

/**
 * Finds a rune by name: ESR → LoD → Kanji, except that LoD runewords check
 * LoD first so runes sharing a name across tables (e.g. Ko) resolve to the
 * LoD version.
 */
export function resolveRune(lookup: SocketableLookup, name: string, isLod: boolean): ResolvedRune | null {
  const lodRune = lookup.lodRunes.get(name);
  if (isLod && lodRune) return { category: 'lodRunes', rune: lodRune };

  const esrRune = lookup.esrRunes.get(name);
  if (esrRune) return { category: 'esrRunes', rune: esrRune };

  if (lodRune) return { category: 'lodRunes', rune: lodRune };

  const kanjiRune = lookup.kanjiRunes.get(name);
  if (kanjiRune) return { category: 'kanjiRunes', rune: kanjiRune };

  return null;
}

/** Concatenates the bonus texts of several socketables, per item category. */
export function aggregateBonusTexts(bonusesList: readonly SocketableBonuses[]): BonusTextsByCategory {
  return {
    weaponsGloves: bonusesList.flatMap((bonuses) => bonuses.weaponsGloves.map((affix) => affix.rawText)),
    helmsBoots: bonusesList.flatMap((bonuses) => bonuses.helmsBoots.map((affix) => affix.rawText)),
    armorShieldsBelts: bonusesList.flatMap((bonuses) => bonuses.armorShieldsBelts.map((affix) => affix.rawText)),
  };
}
