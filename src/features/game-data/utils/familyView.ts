import { parseSearchTerms } from '@/core/utils/searchTerms';
import type { BaseItem } from '../engine/schema';
import type { BaseTier } from '../constants/bases';
import type { BaseFilters } from '../store/gameDataSlice';
import { FAMILY_TIERS, familyMembers, isFamilyRow, type BaseFamilyGroup, type FamilyTier } from './baseFamilies';
import { baseMatchesFilters } from './filterBases';

/**
 * The Bases page families view: which tier columns, family rows and loose bases show for the current filters, and which
 * members are dimmed. The tier filter hides columns; every other filter keeps a family with at least one matching
 * member in a visible column and marks the other members as not matching. Sorting does not apply.
 */

export interface FamilyViewCell {
  readonly base: BaseItem;
  /** False = shown dimmed (the family stays because another member matches) */
  readonly matches: boolean;
}

export interface FamilyViewRow {
  readonly key: string;
  /** Index-aligned with `FamilyView.columns` */
  readonly cells: readonly (FamilyViewCell | null)[];
}

export interface FamilyViewType {
  readonly code: string;
  readonly name: string;
  readonly rows: readonly FamilyViewRow[];
}

export interface FamilyViewGroup {
  readonly label: string;
  readonly types: readonly FamilyViewType[];
}

/** A base without a family (mythical, accessory, a base outside its own family) with its type's name. */
export interface FamilyViewLoner {
  readonly base: BaseItem;
  readonly typeName: string;
}

export interface FamilyViewCounts {
  readonly families: number;
  readonly totalFamilies: number;
  /** Members shown in the family rows (visible columns only) */
  readonly members: number;
  /** Of those, the ones matching the filters */
  readonly matching: number;
  readonly loners: number;
}

export interface FamilyView {
  readonly columns: readonly FamilyTier[];
  readonly groups: readonly FamilyViewGroup[];
  readonly loners: readonly FamilyViewLoner[];
  readonly counts: FamilyViewCounts;
}

/** The tier columns the tier filter leaves visible (all three when it selects no family tier at all, i.e. is empty). */
export function visibleFamilyTiers(tiers: readonly BaseTier[]): FamilyTier[] {
  return tiers.length === 0 ? [...FAMILY_TIERS] : FAMILY_TIERS.filter((tier) => tiers.includes(tier));
}

export function buildFamilyView(
  model: readonly BaseFamilyGroup[],
  filters: BaseFilters,
  typeNames: ReadonlyMap<string, string>
): FamilyView {
  const terms = parseSearchTerms(filters.search);
  const memberFilters: BaseFilters = { ...filters, tiers: [] };
  const matches = (base: BaseItem) => baseMatchesFilters(base, memberFilters, terms, typeNames);
  const tierShown = (tier: BaseTier) => filters.tiers.length === 0 || filters.tiers.includes(tier);
  const columns = visibleFamilyTiers(filters.tiers);

  let totalFamilies = 0;
  let members = 0;
  let matching = 0;
  const loners: FamilyViewLoner[] = [];
  const groups = model.flatMap((group): FamilyViewGroup[] => {
    const types = group.types.flatMap((type): FamilyViewType[] => {
      const rows: FamilyViewRow[] = [];
      for (const row of type.rows) {
        if (!isFamilyRow(row)) {
          for (const base of familyMembers(row)) if (tierShown(base.tier) && matches(base)) loners.push({ base, typeName: type.name });
          continue;
        }
        totalFamilies++;
        const cells = columns.map((tier) => {
          const base = row.cells[tier];
          return base === null ? null : { base, matches: matches(base) };
        });
        if (!cells.some((cell) => cell?.matches === true)) continue;
        rows.push({ key: row.key, cells });
        for (const cell of cells) {
          if (cell === null) continue;
          members++;
          if (cell.matches) matching++;
        }
      }
      for (const base of type.mythical) if (tierShown(base.tier) && matches(base)) loners.push({ base, typeName: type.name });
      return rows.length === 0 ? [] : [{ code: type.code, name: type.name, rows }];
    });
    return types.length === 0 ? [] : [{ label: group.label, types }];
  });

  const families = groups.reduce((sum, group) => sum + group.types.reduce((typeSum, type) => typeSum + type.rows.length, 0), 0);
  return { columns, groups, loners, counts: { families, totalFamilies, members, matching, loners: loners.length } };
}
