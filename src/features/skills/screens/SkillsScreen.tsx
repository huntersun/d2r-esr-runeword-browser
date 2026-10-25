import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { FilterPanel } from '@/components/FilterPanel';
import { PageShell } from '@/components/PageShell';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { db } from '@/core/db';
import { useDebouncedFilterValue } from '@/core/hooks/useDebouncedFilterValue';
import { buildShareUrl } from '@/core/utils/filterUrlParams';
import { normaliseItemName } from '@/core/utils/itemName';
import { EnhanceSearch, Pills } from '@/features/game-data/components/EnhanceParts';
import { GameDataError } from '@/features/game-data/components/GameDataError';
import { GameDataLoading } from '@/features/game-data/components/GameDataLoading';
import type { SkillDetail } from '@/features/game-data/engine/schema';
import { useGameData } from '@/features/game-data/hooks/useGameData';
import { cn } from '@/lib/utils';
import { SkillDetailCard } from '../components/SkillDetailCard';
import { SkillTile, type SkillTileMark } from '../components/SkillTile';
import { SkillTreeTab } from '../components/SkillTreeTab';
import {
  buildSkillsView,
  disambiguation,
  duplicateNames,
  encodeSkillsState,
  ITEM_SKILLS,
  prerequisiteChain,
  readSkillsState,
  searchSkills,
  SKILLS_ROUTE,
  type SkillsState,
  type SkillsView,
} from '../utils/skills';

const SKILL_FILES = ['skills', 'skilldetails'] as const;
const SEARCH_DEBOUNCE_MS = 250;
/** Tailwind `lg`: the detail card sits next to the trees from here on */
const WIDE_QUERY = '(min-width: 1024px)';

export function SkillsScreen() {
  const gameData = useGameData(SKILL_FILES);
  return (
    <PageShell title="Skills">
      {gameData.status === 'loading' && <GameDataLoading />}
      {gameData.status === 'error' && <GameDataError error={gameData.error} onRetry={gameData.retry} />}
      {gameData.status === 'ready' && <SkillsBrowser view={buildSkillsView(gameData.data.skills, gameData.data.skilldetails)} />}
    </PageShell>
  );
}

/** The page state (class, tab, skill, search) lives in the URL, so links and the back button keep it. */
function SkillsBrowser({ view }: { readonly view: SkillsView }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = readSkillsState(searchParams, view);
  const update = (patch: Partial<SkillsState>, replace = false) => {
    setSearchParams(encodeSkillsState({ ...state, ...patch }), { replace });
  };
  const [search, setSearch, commitSearch] = useDebouncedFilterValue(
    state.search,
    (value) => {
      update({ search: value }, true);
    },
    SEARCH_DEBOUNCE_MS
  );
  // Uniques the HTM mythicals page lists link there; until the HTM data is in IndexedDB they link to Uniques
  const mythicalNames = useLiveQuery(async () => {
    const items = await db.mythicalUniques.toArray();
    return new Set(items.map((item) => normaliseItemName(item.name)));
  });
  const mythicals = mythicalNames ?? new Set<string>();

  const selected = state.skill === null ? undefined : view.byId.get(state.skill);
  const chain = state.skill === null ? new Set<string>() : prerequisiteChain(view, state.skill);
  const markOf = (id: string): SkillTileMark => {
    if (id === state.skill) return 'selected';
    if (chain.has(id)) return 'prerequisite';
    if (state.skill !== null && view.byId.get(id)?.reqSkills?.includes(state.skill) === true) return 'dependent';
    return null;
  };
  const detailRef = useRef<HTMLDivElement>(null);
  // On narrow screens the card is below the trees: bring it into view after a tap (not on page load)
  const pendingScroll = useRef(false);
  const select = (id: string) => {
    const detail = view.byId.get(id);
    if (detail === undefined) return;
    pendingScroll.current = true;
    commitSearch('');
    update({ skill: id, view: detail.cls ?? ITEM_SKILLS, tab: detail.page ?? state.tab, search: '' });
  };
  useEffect(() => {
    if (!pendingScroll.current || state.skill === null) return;
    pendingScroll.current = false;
    if (window.matchMedia(WIDE_QUERY).matches) return;
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [state.skill]);

  const cls = view.classes.find((entry) => entry.code === state.view);
  const results = search.trim() === '' ? null : searchSkills(view, search);
  const classOptions = [
    ...view.classes.map((entry) => ({ value: entry.code, label: entry.name })),
    { value: ITEM_SKILLS, label: 'Item skills', count: view.itemSkills.length },
  ];
  const getShareUrl = () => buildShareUrl(SKILLS_ROUTE, encodeSkillsState({ ...state, search }));

  const detailCard =
    selected === undefined ? null : (
      <div ref={detailRef} className="scroll-mt-20">
        <SkillDetailCard
          key={selected.id}
          view={view}
          skill={selected}
          mythicals={mythicals}
          onSelect={select}
          onClose={() => {
            update({ skill: null });
          }}
        />
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Every class skill tree from the ESR game files, plus the skills only items grant. Pick a skill for its description, mana cost,
        synergies and the uniques, set items and runewords that grant it. Per-level values are formulas in the game files and are not shown.
      </p>

      <FilterPanel>
        <div className="flex flex-wrap items-end gap-4">
          <EnhanceSearch
            value={search}
            onChange={setSearch}
            onClear={() => {
              commitSearch('');
            }}
            placeholder="Search skills by name..."
            hint="Search every class and item skill by name;"
          />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Share this view.</p>
            <CopyLinkButton getShareUrl={getShareUrl} />
          </div>
        </div>

        <Pills
          label="Class"
          options={classOptions}
          value={state.view}
          onChange={(value) => {
            update({ view: value, skill: null, tab: 1 });
          }}
        />
      </FilterPanel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          {results !== null ? (
            <SearchResults view={view} results={results} onSelect={select} />
          ) : cls !== undefined ? (
            <>
              {/* Narrow screens: one tab at a time, like in game */}
              <div className="lg:hidden">
                <Pills
                  label="Skill tab"
                  options={cls.tabs.map((tab) => ({ value: String(tab.page), label: tab.name }))}
                  value={String(state.tab)}
                  onChange={(value) => {
                    update({ tab: Number(value) }, true);
                  }}
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {cls.tabs.map((tab) => (
                  <SkillTreeTab
                    key={tab.page}
                    tab={tab}
                    markOf={markOf}
                    onSelect={select}
                    className={cn(tab.page !== state.tab && 'hidden lg:block')}
                  />
                ))}
              </div>
            </>
          ) : (
            <ItemSkills view={view} markOf={markOf} onSelect={select} />
          )}
        </div>
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {detailCard ?? (
            <p className="hidden rounded-lg border border-dashed p-4 text-sm text-muted-foreground lg:block">
              Pick a skill to see its details and the items that grant it.
            </p>
          )}
        </aside>
      </div>
      <ScrollToTopButton />
    </div>
  );
}

function ItemSkills({
  view,
  markOf,
  onSelect,
}: {
  readonly view: SkillsView;
  readonly markOf: (id: string) => SkillTileMark;
  readonly onSelect: (id: string) => void;
}) {
  const duplicates = duplicateNames(view.itemSkills);
  return (
    <section aria-label="Item skills" className="space-y-2 rounded-lg border bg-card p-2">
      <p className="px-1 text-xs text-muted-foreground">
        Skills no class has in its tree, granted by uniques, set items and runewords (procs, item-only spells, ESR's elemental surges and
        masteries). Many have no description text in the game files.
      </p>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8">
        {view.itemSkills.map((skill) => {
          const variant = disambiguation(skill, duplicates);
          const count = grantCount(skill.grantedBy?.length ?? 0);
          return (
            <SkillTile
              key={skill.id}
              skill={skill}
              mark={markOf(skill.id)}
              onSelect={onSelect}
              subtitle={variant === null ? count : `${variant} · ${count}`}
            />
          );
        })}
      </div>
    </section>
  );
}

function grantCount(count: number): string {
  return `${String(count)} item${count === 1 ? '' : 's'}`;
}

function SearchResults({
  view,
  results,
  onSelect,
}: {
  readonly view: SkillsView;
  readonly results: readonly SkillDetail[];
  readonly onSelect: (id: string) => void;
}) {
  if (results.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No skill matches.</p>;
  return (
    <section aria-label="Search results" className="space-y-2 rounded-lg border bg-card p-2">
      <p className="px-1 text-xs text-muted-foreground">
        {String(results.length)} skill{results.length === 1 ? '' : 's'} found
      </p>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8">
        {results.map((skill) => (
          <SkillTile
            key={skill.id}
            skill={skill}
            mark={null}
            onSelect={onSelect}
            subtitle={skill.cls === null ? 'Item skill' : (view.classNames.get(skill.cls) ?? skill.cls)}
          />
        ))}
      </div>
    </section>
  );
}
