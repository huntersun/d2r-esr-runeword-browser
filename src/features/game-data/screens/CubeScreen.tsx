import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { CopyLinkHelpButton } from '@/components/CopyLinkHelpButton';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { Card, CardContent } from '@/components/ui/card';
import { FilterPanel } from '@/components/FilterPanel';
import { SectionHeader } from '@/components/SectionHeader';
import { useDebouncedFilterValue } from '@/core/hooks/useDebouncedFilterValue';
import { buildShareUrl } from '@/core/utils/filterUrlParams';
import type { CubeBundle } from '../engine/schema';
import { CubeFamilySection, DocsLink } from '../components/CubeFamilySection';
import { EnhanceSearch } from '../components/EnhanceParts';
import { GameDataError } from '../components/GameDataError';
import { GameDataLoading } from '../components/GameDataLoading';
import { useGameData } from '../hooks/useGameData';
import {
  CUBE_DOCS_URL,
  buildCubeTree,
  encodeCubeState,
  filterCubeTree,
  focusCubeTree,
  formatCount,
  readCubeState,
  sectionDocsUrl,
  shownRowCount,
  type CubeSectionView,
  type CubeState,
} from '../utils/cube';

const CUBE_FILES = ['cube'] as const;
const CUBE_ROUTE = 'game-data/cube';
const SEARCH_DEBOUNCE_MS = 300;
/** The "Show all families" line above a focused family, scrolled into view */
const FOCUS_ANCHOR = 'cube-family-focus';

export function CubeScreen() {
  const gameData = useGameData(CUBE_FILES);
  if (gameData.status === 'loading') return <GameDataLoading />;
  if (gameData.status === 'error') return <GameDataError error={gameData.error} onRetry={gameData.retry} />;
  return <CubeBrowser bundle={gameData.data.cube} />;
}

/** The page state lives in the URL (search, focused family), so links and the back button keep it. */
function CubeBrowser({ bundle }: { readonly bundle: CubeBundle }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = readCubeState(searchParams, bundle);
  const tree = buildCubeTree(bundle);

  const update = (patch: Partial<CubeState>, replace = true) => {
    setSearchParams(encodeCubeState({ ...state, ...patch }), { replace });
  };

  const [search, setSearch, commitSearch] = useDebouncedFilterValue(
    state.search,
    (value) => {
      update({ search: value });
    },
    SEARCH_DEBOUNCE_MS
  );

  // A focused family scrolls into view (from a guide link or a family chip)
  useEffect(() => {
    if (state.family === null) return;
    document.getElementById(FOCUS_ANCHOR)?.scrollIntoView({ block: 'start' });
  }, [state.family]);

  const getShareUrl = () => buildShareUrl(CUBE_ROUTE, encodeCubeState({ ...state, search }));
  const filtered = filterCubeTree(tree, state.search);
  const shown = focusCubeTree(filtered, state.family);
  const total = bundle.families.reduce((sum, family) => sum + family.rowCount, 0);
  const focus = (family: string | null) => {
    update({ family }, false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Every cube recipe in the game files: {formatCount(total)} cubemain rows in {formatCount(bundle.families.length)} families, grouped
        like the <DocsLink href={CUBE_DOCS_URL}>official Cube Recipes page</DocsLink>. Rows that only differ in the base type, quality or
        class are merged into one line.
      </p>

      <FilterPanel>
        <div className="flex flex-wrap items-end gap-4">
          <EnhanceSearch
            value={search}
            onChange={setSearch}
            onClear={() => {
              commitSearch('');
            }}
            placeholder="Search items, bonuses or recipes..."
            hint="Search items, bonuses and families;"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">Share this view.</p>
              <CopyLinkHelpButton />
            </div>
            <CopyLinkButton getShareUrl={getShareUrl} />
          </div>
        </div>

        {state.family === null ? (
          <FamilyIndex
            tree={filtered}
            searching={state.search !== ''}
            onFocus={(family) => {
              focus(family);
            }}
          />
        ) : (
          <p id={FOCUS_ANCHOR} className="scroll-mt-20 text-sm">
            <button
              type="button"
              className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              onClick={() => {
                focus(null);
              }}
            >
              ← Show all families
            </button>
          </p>
        )}
      </FilterPanel>

      {state.family === null && state.search === '' && <HiddenRowsCards bundle={bundle} />}

      {shown.length === 0 ? (
        <EmptyState focused={state.family !== null} />
      ) : (
        <div className="space-y-8">
          {shown.map(({ section, families }) => (
            <div key={section.id} className="space-y-5">
              <SectionHeader title={section.label} />
              {families.map((view) => (
                <CubeFamilySection
                  // Remount on a new search so "Show all" starts closed
                  key={`${view.family.id}|${state.search}`}
                  view={view}
                  section={section}
                  searching={state.search !== ''}
                  onFocus={(family) => {
                    focus(family);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      <ScrollToTopButton />
    </div>
  );
}

interface FamilyIndexProps {
  readonly tree: readonly CubeSectionView[];
  readonly searching: boolean;
  readonly onFocus: (family: string) => void;
}

/** The families by section, with their row counts (matching rows while searching); a chip focuses one family */
function FamilyIndex({ tree, searching, onFocus }: FamilyIndexProps) {
  if (tree.length === 0) return null;
  return (
    <nav aria-label="Recipe families" className="border-t pt-4">
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
        {tree.map(({ section, families }) => {
          const docs = sectionDocsUrl(section);
          return (
            <div key={section.id} className="contents">
              <dt className="pt-0.5 text-xs font-semibold text-muted-foreground">
                {docs === null ? section.label : <DocsLink href={docs}>{section.label}</DocsLink>}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {families.map((view) => (
                  <button
                    key={view.family.id}
                    type="button"
                    onClick={() => {
                      onFocus(view.family.id);
                    }}
                    className="rounded-full border bg-background px-2.5 py-0.5 text-xs transition-colors hover:bg-accent"
                  >
                    {view.family.label}
                    <span className="ml-1.5 text-muted-foreground">
                      {formatCount(searching ? shownRowCount(view) : view.family.rowCount)}
                    </span>
                  </button>
                ))}
              </dd>
            </div>
          );
        })}
      </dl>
    </nav>
  );
}

/** Where the rows that are not listed went: the Enhance page and the stocker bookkeeping */
function HiddenRowsCards({ bundle }: { readonly bundle: CubeBundle }) {
  const { hidden } = bundle;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="py-3">
        <CardContent className="space-y-1 px-4 text-sm">
          <p className="font-medium">Corruption, anointment and the Vessel of Souls</p>
          <p className="text-muted-foreground">
            Their {formatCount(hidden.enhance)} rows (one per roll) are summarised as outcome lists on the{' '}
            <Link to="/game-data/enhance" className="font-medium text-primary underline decoration-primary/40 underline-offset-2">
              Enhance page
            </Link>
            .
          </p>
        </CardContent>
      </Card>
      <Card className="py-3">
        <CardContent className="space-y-1 px-4 text-sm">
          <p className="font-medium">Stockers and cans</p>
          <p className="text-muted-foreground">
            Storing gems, runes, crystals and decals in a Multi Stocker, Rune Stocker or Gem Can (and taking them out) takes{' '}
            {formatCount(hidden.stockers)} rows; they are left out, as are {formatCount(hidden.traps + hidden.old + hidden.dummy)} internal
            blocker and unused rows. The <DocsLink href={CUBE_DOCS_URL}>official Cube Recipes page</DocsLink> explains the stockers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ focused }: { readonly focused: boolean }) {
  return (
    <div className="space-y-1 py-6 text-center text-sm text-muted-foreground">
      <p>{focused ? 'Nothing in this family matches the search.' : 'No cube recipe matches the search.'}</p>
      <p>
        Try fewer words, or look it up on the <DocsLink href={CUBE_DOCS_URL}>official Cube Recipes page</DocsLink>.
      </p>
    </div>
  );
}
