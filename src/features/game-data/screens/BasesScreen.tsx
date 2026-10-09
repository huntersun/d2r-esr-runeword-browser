import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import type { BaseItem, TypesBundle } from '../engine/schema';
import { BASES_PAGE_SIZE } from '../constants/bases';
import { BaseCard } from '../components/BaseCard';
import { BaseFilters } from '../components/BaseFilters';
import { GameDataError } from '../components/GameDataError';
import { GameDataLoading } from '../components/GameDataLoading';
import { useGameData } from '../hooks/useGameData';
import { useBasesUrlState } from '../hooks/useBasesUrlState';
import { selectBaseFilters, setBaseSearch } from '../store/gameDataSlice';
import { filterBases } from '../utils/filterBases';
import { buildTypeGroups } from '../utils/typeGroups';

const BASES_FILES = ['types', 'bases'] as const;

export function BasesScreen() {
  const gameData = useGameData(BASES_FILES);
  if (gameData.status === 'loading') return <GameDataLoading />;
  if (gameData.status === 'error') return <GameDataError error={gameData.error} onRetry={gameData.retry} />;
  return <BasesBrowser typesBundle={gameData.data.types} bases={gameData.data.bases.bases} />;
}

interface BasesBrowserProps {
  readonly typesBundle: TypesBundle;
  readonly bases: readonly BaseItem[];
}

function BasesBrowser({ typesBundle, bases }: BasesBrowserProps) {
  const dispatch = useDispatch();
  const filters = useSelector(selectBaseFilters);
  const { types, classes } = typesBundle;

  const typeByCode = new Map(types.map((type) => [type.code, type]));
  const typeNames = new Map(types.map((type) => [type.code, type.name]));
  const knownTypes = new Set(typeByCode.keys());
  const baseByCode = new Map(bases.map((base) => [base.code, base]));
  const classNames = new Map<string, string>(classes.map((cls) => [cls.code, cls.name]));
  const typeGroups = buildTypeGroups(bases, types);
  const getShareUrl = useBasesUrlState(knownTypes);

  const filtered = filterBases(bases, filters, typeNames);

  const handleSearch = (text: string) => {
    dispatch(setBaseSearch(text));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <BaseFilters classes={classes} typeGroups={typeGroups} typeNames={typeNames} getShareUrl={getShareUrl} />

      <p className="mb-4 text-sm text-muted-foreground">
        Showing {filtered.length} of {bases.length} bases
      </p>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No bases found. Try adjusting your filters.</p>
      ) : (
        // Re-mount (and reset "Show more") whenever the filters change
        <BaseList
          key={JSON.stringify(filters)}
          bases={filtered}
          renderBase={(base) => (
            <BaseCard base={base} typeByCode={typeByCode} baseByCode={baseByCode} classNames={classNames} onSearch={handleSearch} />
          )}
        />
      )}

      <ScrollToTopButton />
    </div>
  );
}

interface BaseListProps {
  readonly bases: readonly BaseItem[];
  readonly renderBase: (base: BaseItem) => React.ReactNode;
}

function BaseList({ bases, renderBase }: BaseListProps) {
  const [visibleCount, setVisibleCount] = useState(BASES_PAGE_SIZE);
  const visible = bases.slice(0, visibleCount);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((base) => (
          <div key={base.code} className="card-visibility-auto">
            {renderBase(base)}
          </div>
        ))}
      </div>
      {visibleCount < bases.length && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setVisibleCount((count) => count + BASES_PAGE_SIZE);
            }}
          >
            Show more ({bases.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </>
  );
}
