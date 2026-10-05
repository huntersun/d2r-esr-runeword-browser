import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RuneBadge } from './RuneBadge';
import { GemBadge } from '@/core/components/GemBadge';
import { RunewordPointsDisplay } from './RunewordPointsDisplay';
import { FavoriteButton } from '@/core/components/FavoriteButton';
import { useRuneBonuses } from '../hooks/useRuneBonuses';
import { RecipeAffixes, SocketableBonusesSection } from '@/core/components/RecipeBonuses';
import { getRelevantCategories } from '@/core/utils/itemCategoryMapping';
import { isGemName } from '@/features/data-sync/parsers/gemsParser';
import { LOD_SORT_KEY_OFFSET } from '@/features/data-sync/parsers/runewordsParser';
import type { Runeword } from '@/core/db/models';

interface RunewordCardProps {
  readonly runeword: Runeword;
  readonly isFavorite?: boolean;
  readonly favoriteCount?: number;
  readonly favoritePending?: boolean;
  readonly onToggleFavorite?: (runeword: Runeword) => void;
}

export function RunewordCard({
  runeword,
  isFavorite = false,
  favoriteCount = 0,
  favoritePending = false,
  onToggleFavorite,
}: RunewordCardProps) {
  const { name, sockets, runes, allowedItems, excludedItems, affixes, tierPointTotals } = runeword;
  // Handle backwards compatibility for cached runewords without reqLevel
  const reqLevel = 'reqLevel' in runeword ? runeword.reqLevel : undefined;
  const isLod = 'sortKey' in runeword && runeword.sortKey >= LOD_SORT_KEY_OFFSET;
  const gems = 'gems' in runeword ? runeword.gems : undefined;
  const jewelInfo = 'jewelInfo' in runeword ? runeword.jewelInfo : undefined;
  // Recipes with optional jewels show a socket range on the ESR site, e.g. "(2-3 Socket)"
  const socketsMax = 'socketsMax' in runeword ? runeword.socketsMax : undefined;
  const socketLabel = socketsMax === undefined ? String(sockets) : `${String(sockets)}-${String(socketsMax)}`;
  const ingredientsList = 'ingredients' in runeword && runeword.ingredients.length > 0 ? runeword.ingredients : runes;
  const runeBonuses = useRuneBonuses(runes, gems);
  const relevantCategories = getRelevantCategories(allowedItems);

  // Old cached runewords may lack per-column affixes
  const columnAffixes = 'columnAffixes' in runeword ? runeword.columnAffixes : undefined;

  return (
    <Card className="h-full">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 text-lg text-amber-700 dark:text-amber-400">{name}</CardTitle>
          <div className="flex shrink-0 items-center gap-1">
            {onToggleFavorite && (
              <FavoriteButton
                isFavorite={isFavorite}
                count={favoriteCount}
                pending={favoritePending}
                label={name}
                onToggle={() => {
                  onToggleFavorite(runeword);
                }}
              />
            )}
            <Badge variant="secondary">{socketLabel} Socket</Badge>
            {reqLevel !== undefined && <Badge variant="outline">Lvl {reqLevel}</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Ingredient sequence (runes + gems in original order) */}
        <div className="flex flex-wrap gap-1">
          {ingredientsList.map((item, index) =>
            isGemName(item) ? (
              <GemBadge key={`${item}-${String(index)}`} gemName={item} />
            ) : (
              <RuneBadge key={`${item}-${String(index)}`} runeName={item} isLod={isLod} />
            )
          )}
          {jewelInfo && <Badge variant="outline">{jewelInfo}</Badge>}
        </div>

        {/* Tier point totals - check with 'in' for backwards compatibility with old cached data */}
        {'tierPointTotals' in runeword && tierPointTotals.length > 0 && <RunewordPointsDisplay tierTotals={tierPointTotals} />}

        {/* Allowed items */}
        <div>
          <p className="font-medium text-muted-foreground mb-1">Items:</p>
          <p className="text-sm">{allowedItems.join(', ')}</p>
          {excludedItems.length > 0 && <p className="text-sm text-muted-foreground mt-1">Excluded: {excludedItems.join(', ')}</p>}
        </div>

        <RecipeAffixes affixes={affixes} columnAffixes={columnAffixes} allowedItems={allowedItems} categories={relevantCategories} />

        <SocketableBonusesSection
          title="Socketable Bonuses:"
          bonuses={runeBonuses}
          allowedItems={allowedItems}
          categories={relevantCategories}
        />
      </CardContent>
    </Card>
  );
}
