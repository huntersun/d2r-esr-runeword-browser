import { AscendancyFilters } from '../components/AscendancyFilters';
import { AscendancyCard } from '../components/AscendancyCard';
import { useFilteredAscendancies } from '../hooks/useFilteredAscendancies';
import { useUrlInitialize } from '../hooks/useUrlInitialize';
import { Spinner } from '@/components/ui/spinner';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';

export function AscendanciesScreen() {
  useUrlInitialize();
  const items = useFilteredAscendancies();

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
      <h1 className="text-2xl font-bold mb-4">Ascendancies ({items.length})</h1>
      <AscendancyFilters />

      <p className="text-sm text-muted-foreground mb-4">Showing {items.length} ascendancies</p>

      {items.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No ascendancies found. Try adjusting your search.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <AscendancyCard key={item.name} item={item} />
          ))}
        </div>
      )}

      <ScrollToTopButton />
    </div>
  );
}
