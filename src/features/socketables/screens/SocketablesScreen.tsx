import { useDispatch, useSelector } from 'react-redux';
import { SocketableFilters } from '../components/SocketableFilters';
import { SocketableCard } from '../components/SocketableCard';
import { useFilteredSocketables } from '../hooks/useFilteredSocketables';
import { useUrlInitialize } from '../hooks/useUrlInitialize';
import { selectEnabledCategories, selectExactName, setExactName } from '../store/socketablesSlice';
import { ExactNameChip } from '@/core/components/ExactNameChip';
import { Spinner } from '@/components/ui/spinner';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { useItemSources } from '@/features/game-data/hooks/useItemSources';

export function SocketablesScreen() {
  const nameFromUrl = useUrlInitialize();
  const socketables = useFilteredSocketables();
  const { index: sourceIndex } = useItemSources();
  const enabledCategories = useSelector(selectEnabledCategories);
  const exactName = useSelector(selectExactName);
  const dispatch = useDispatch();
  const noCategoriesSelected = !Object.values(enabledCategories).some(Boolean);

  // Loading state
  if (socketables === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Socketables</h1>
      <SocketableFilters />

      {exactName !== null && (
        <div className="mb-4">
          <ExactNameChip name={exactName} onClear={() => dispatch(setExactName(null))} scrollIntoView={nameFromUrl} />
        </div>
      )}

      {socketables.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          {noCategoriesSelected
            ? 'No categories selected. Select at least one category to see socketables.'
            : 'No socketables found. Try adjusting your filters or load data first.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {socketables.map((socketable) => (
            <div key={`${socketable.category}-${socketable.name}`} className="card-visibility-auto">
              <SocketableCard socketable={socketable} sourceIndex={sourceIndex} />
            </div>
          ))}
        </div>
      )}

      <ScrollToTopButton />
    </div>
  );
}
