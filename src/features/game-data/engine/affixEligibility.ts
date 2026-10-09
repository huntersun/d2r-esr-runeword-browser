/**
 * Which magic/rare affixes can roll on a base at an item level (vanilla rules; no ESR override is known).
 *
 * - affix level: `affixLevel(ilvl, qlvl, magicLvl)` (see below)
 * - an affix is eligible when `lvl ≤ alvl`, `maxLvl == 0 || alvl ≤ maxLvl`, an itype is among the base's ancestors and
 *   no etype is, `rare` is set when the item is rare, `freq > 0`, and the class lock allows it (base without class, or
 *   affix without class, or the same class)
 * - automods (kind `a`) roll from the base's own pool: `group == base.autoGroup`, on any quality
 * - weight = `freq / Σfreq` of the eligible affixes of the same kind; only one affix per `group` can be on an item
 */
import type { Affix, BaseItem } from './schema.ts';

export const MAX_LEVEL = 99;

/**
 * Vanilla affix level: ilvl is capped at 99 and raised to qlvl; with `magic lvl` alvl = ilvl + magicLvl, otherwise
 * ilvl − ⌊qlvl/2⌋ while ilvl < 99 − ⌊qlvl/2⌋, else 2·ilvl − 99. Clamped to 1–99.
 */
export function affixLevel(ilvl: number, qlvl: number, magicLvl: number): number {
  let level = Math.min(ilvl, MAX_LEVEL);
  if (qlvl > level) level = qlvl;
  const half = Math.floor(qlvl / 2);
  let alvl: number;
  if (magicLvl > 0) alvl = level + magicLvl;
  else if (level < MAX_LEVEL - half) alvl = level - half;
  else alvl = 2 * level - MAX_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(1, alvl));
}

export interface WeightedAffix {
  affix: Affix;
  /** freq / Σfreq within its kind (0-1) */
  weight: number;
}

export interface EligibleAffixes {
  alvl: number;
  prefixes: WeightedAffix[];
  suffixes: WeightedAffix[];
  automagic: WeightedAffix[];
}

export interface EligibilityInput {
  affixes: readonly Affix[];
  base: Pick<BaseItem, 'qlvl' | 'magicLvl' | 'autoGroup' | 'cls'>;
  /** Type ancestors of the base (BaseItem.ancestors: type + type2 and their Equiv parents) */
  ancestors: readonly string[];
  ilvl: number;
  quality: 'magic' | 'rare';
  includeAutomagic: boolean;
}

function weighted(affixes: readonly Affix[]): WeightedAffix[] {
  const total = affixes.reduce((sum, affix) => sum + affix.freq, 0);
  return affixes.map((affix) => ({ affix, weight: total > 0 ? affix.freq / total : 0 }));
}

export function eligibleAffixes(input: EligibilityInput): EligibleAffixes {
  const { base, quality } = input;
  const alvl = affixLevel(input.ilvl, base.qlvl, base.magicLvl);
  const ancestors = new Set(input.ancestors);

  const fits = (affix: Affix) =>
    affix.freq > 0 &&
    affix.lvl <= alvl &&
    (affix.maxLvl === 0 || alvl <= affix.maxLvl) &&
    affix.itypes.some((code) => ancestors.has(code)) &&
    !affix.etypes.some((code) => ancestors.has(code)) &&
    (base.cls === null || affix.cls === null || affix.cls === base.cls);

  const byKind = (kind: Affix['kind']) =>
    input.affixes.filter((affix) => affix.kind === kind && fits(affix) && (quality === 'magic' || affix.rare));

  const automagic =
    input.includeAutomagic && base.autoGroup !== null
      ? input.affixes.filter((affix) => affix.kind === 'a' && affix.group === base.autoGroup && fits(affix))
      : [];

  return { alvl, prefixes: weighted(byKind('p')), suffixes: weighted(byKind('s')), automagic: weighted(automagic) };
}
