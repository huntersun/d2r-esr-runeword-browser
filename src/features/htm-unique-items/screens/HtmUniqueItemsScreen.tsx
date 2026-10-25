import { HtmUniqueItemFilters } from '../components/HtmUniqueItemFilters';
import { HtmUniqueItemCard } from '../components/HtmUniqueItemCard';
import { useFilteredHtmUniqueItems } from '../hooks/useFilteredHtmUniqueItems';
import { useUrlInitialize } from '../hooks/useUrlInitialize';
import { buildHtmUniqueItemFavoriteId } from '../utils/htmUniqueItemFavorites';
import { Spinner } from '@/components/ui/spinner';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { FavoritesToggleButton } from '@/core/components/FavoritesToggleButton';
import { useItemFavorites } from '@/features/favorites';
import type { HtmUniqueItem } from '@/core/db';
import { useSelector } from 'react-redux';
import { ExactNameChip } from '@/core/components/ExactNameChip';
import { selectAcquisition, selectExactName } from '../store';
import { ACQUISITION_OPTIONS } from '../utils/acquisition';
import { useItemSources } from '@/features/game-data/hooks/useItemSources';
import { useBaseTiers } from '@/features/game-data/hooks/useBaseTiers';

export function HtmUniqueItemsScreen() {
  const { nameFromUrl, clearExactName } = useUrlInitialize();
  // Tier badges and the tier filter come from tiers.json (the cards render without badges while it loads)
  const baseTiers = useBaseTiers();
  const items = useFilteredHtmUniqueItems(baseTiers);
  const exactName = useSelector(selectExactName);
  const acquisition = useSelector(selectAcquisition);
  const acquisitionLabel = ACQUISITION_OPTIONS.find((option) => option.value === acquisition)?.label;
  const sourceIndex = useItemSources();
  const favorites = useItemFavorites<HtmUniqueItem>({
    getId: buildHtmUniqueItemFavoriteId,
    kindPrefix: 'htmUnique:',
    filterStorageKey: 'd2r-esr.htmUniqueItems.favoritesOnly.v1',
  });

  // Loading state
  if (items === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  const filteredItems = favorites.filterItems(items);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Unique Items ({filteredItems.length})</h1>
      <HtmUniqueItemFilters />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">Showing {filteredItems.length} unique items</p>
          {exactName !== null && <ExactNameChip name={exactName} onClear={clearExactName} scrollOnMount={nameFromUrl} />}
        </div>
        {favorites.isAuthenticated && (
          <FavoritesToggleButton
            favoriteCount={favorites.favoriteCount}
            showFavoritesOnly={favorites.showFavoritesOnly}
            onToggle={favorites.toggleShowFavoritesOnly}
          />
        )}
      </div>

      {filteredItems.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          {favorites.showFavoritesOnly && favorites.isAuthenticated
            ? 'No favorite unique items to show. Star some items or turn off "Favorites only".'
            : acquisition !== 'all' && acquisitionLabel !== undefined
              ? `No unique items found with Acquisition "${acquisitionLabel}". Try "All" or adjust the other filters.`
              : 'No unique items found. Try adjusting your filters.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="card-visibility-auto">
              <HtmUniqueItemCard
                item={item}
                isFavorite={favorites.isFavorite(item)}
                favoriteCount={favorites.count(item)}
                favoritePending={favorites.isPending(item)}
                onToggleFavorite={favorites.toggle}
                sourceIndex={sourceIndex}
                tierIndex={baseTiers.index}
              />
            </div>
          ))}
        </div>
      )}

      <ScrollToTopButton />
    </div>
  );
}
