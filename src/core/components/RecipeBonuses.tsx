import { cn } from '@/lib/utils';
import type { Affix, BonusPool, ColumnBonusPools, SocketableBonuses } from '@/core/db/models';
import { getCategoryLabel, type BonusCategory } from '@/core/utils/itemCategoryMapping';
import { firstNonEmptyPools, hasColumnDifferences, hasPoolColumnDifferences } from '@/core/utils/columnAffixes';
import type { BonusTextsByCategory } from '@/core/utils/socketableLookup';

interface RecipeAffixesProps {
  readonly affixes: readonly Affix[];
  /** Per-column affixes; undefined for old cached data */
  readonly columnAffixes: SocketableBonuses | undefined;
  /** Per-column random bonus pools (gemwords); undefined for runewords and old cached data */
  readonly columnBonusPools?: ColumnBonusPools;
  readonly allowedItems: readonly string[];
  readonly categories: readonly BonusCategory[];
}

/** A recipe's own bonuses (then its random bonus pools): one list, or one column per category when they differ. */
export function RecipeAffixes({ affixes, columnAffixes, columnBonusPools, allowedItems, categories }: RecipeAffixesProps) {
  if (affixes.length === 0) return null;

  return (
    <div className="text-center">
      <p className="font-medium text-muted-foreground mb-1">Bonuses:</p>
      {columnAffixes && hasColumnDifferences(columnAffixes, categories) ? (
        <BonusColumns
          allowedItems={allowedItems}
          categories={categories}
          linesFor={(category) => columnAffixes[category].map((affix) => affix.rawText)}
        />
      ) : (
        <BonusList lines={affixes.map((affix) => affix.rawText)} />
      )}
      {columnBonusPools && <RecipeBonusPools columnBonusPools={columnBonusPools} allowedItems={allowedItems} categories={categories} />}
    </div>
  );
}

interface RecipeBonusPoolsProps {
  readonly columnBonusPools: ColumnBonusPools;
  readonly allowedItems: readonly string[];
  readonly categories: readonly BonusCategory[];
}

/** Random bonus pools ("1-2 of the following:"): shown once, or per category when they differ. */
function RecipeBonusPools({ columnBonusPools, allowedItems, categories }: RecipeBonusPoolsProps) {
  if (hasPoolColumnDifferences(columnBonusPools, categories)) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-3">
        {categories.map((category) => {
          const pools = columnBonusPools[category];
          if (pools.length === 0) return null;
          return (
            <div key={category}>
              <p className="font-medium text-muted-foreground text-xs mb-1">{getCategoryLabel(allowedItems, category)}:</p>
              <BonusPoolList pools={pools} />
            </div>
          );
        })}
      </div>
    );
  }

  const pools = firstNonEmptyPools(columnBonusPools);
  if (pools.length === 0) return null;
  return <BonusPoolList pools={pools} className="mt-3" />;
}

function BonusPoolList({ pools, className }: { readonly pools: readonly BonusPool[]; readonly className?: string }) {
  return (
    <div className={cn('space-y-2 text-xs', className)}>
      {pools.map((pool, index) => (
        <div key={`${String(index)}-${pool.label}`} className="rounded-md border border-dashed px-2 py-1.5">
          <p className="italic text-muted-foreground mb-0.5">{pool.label}</p>
          <ul className="space-y-0.5 text-[#8080E6]">
            {pool.affixes.map((affix, lineIndex) => (
              <li key={`${String(lineIndex)}-${affix.rawText}`}>{affix.rawText}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface SocketableBonusesSectionProps {
  readonly title: string;
  readonly bonuses: BonusTextsByCategory | undefined;
  readonly allowedItems: readonly string[];
  readonly categories: readonly BonusCategory[];
}

/** Aggregated bonuses of the recipe's socketables (runes/gems), per relevant category. */
export function SocketableBonusesSection({ title, bonuses, allowedItems, categories }: SocketableBonusesSectionProps) {
  if (!bonuses || !categories.some((category) => bonuses[category].length > 0)) return null;

  return (
    <div className="border-t pt-3">
      <p className="font-medium text-muted-foreground mb-2 text-center">{title}</p>
      {categories.length === 1 ? (
        <BonusList lines={bonuses[categories[0]]} className="text-center" />
      ) : (
        <BonusColumns allowedItems={allowedItems} categories={categories} linesFor={(category) => bonuses[category]} />
      )}
    </div>
  );
}

function BonusList({ lines, className }: { readonly lines: readonly string[]; readonly className?: string }) {
  return (
    <ul className={cn('space-y-0.5 text-[#8080E6]', className)}>
      {lines.map((line, index) => (
        <li key={`${String(index)}-${line}`}>{line}</li>
      ))}
    </ul>
  );
}

interface BonusColumnsProps {
  readonly allowedItems: readonly string[];
  readonly categories: readonly BonusCategory[];
  readonly linesFor: (category: BonusCategory) => readonly string[];
}

/** Two-column grid with one labelled list per category; empty categories are skipped. */
function BonusColumns({ allowedItems, categories, linesFor }: BonusColumnsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {categories.map((category) => {
        const lines = linesFor(category);
        if (lines.length === 0) return null;
        return (
          <div key={category}>
            <p className="font-medium text-muted-foreground text-xs mb-1">{getCategoryLabel(allowedItems, category)}:</p>
            <ul className="space-y-0.5 text-[#8080E6] text-xs">
              {lines.map((line, index) => (
                <li key={`${String(index)}-${line}`}>{line}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
