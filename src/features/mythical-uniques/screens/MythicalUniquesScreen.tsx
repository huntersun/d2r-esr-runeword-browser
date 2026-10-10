import { MythicalUniqueFilters } from '../components/MythicalUniqueFilters';
import { MythicalUniqueCard } from '../components/MythicalUniqueCard';
import { useFilteredMythicalUniques } from '../hooks/useFilteredMythicalUniques';
import { useUrlInitialize } from '../hooks/useUrlInitialize';
import { selectExactName, setExactName } from '../store';
import { useDispatch, useSelector } from 'react-redux';
import { ExactNameChip } from '@/core/components/ExactNameChip';
import { Spinner } from '@/components/ui/spinner';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { useItemSources } from '@/features/game-data/hooks/useItemSources';

export function MythicalUniquesScreen() {
  useUrlInitialize();
  const items = useFilteredMythicalUniques();
  const dispatch = useDispatch();
  const exactName = useSelector(selectExactName);
  const { index: sourceIndex } = useItemSources();

  // Loading state
  if (items === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Mythical Uniques ({items.length})</h1>
      <MythicalUniqueFilters />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">Showing {items.length} mythical uniques</p>
        {exactName !== null && <ExactNameChip name={exactName} onClear={() => dispatch(setExactName(null))} />}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No mythical uniques found. Try adjusting your filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="card-visibility-auto">
              <MythicalUniqueCard item={item} sourceIndex={sourceIndex} />
            </div>
          ))}
        </div>
      )}

      <ScrollToTopButton />
    </div>
  );
}
