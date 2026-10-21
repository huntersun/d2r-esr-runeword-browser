import { useId, useState, type KeyboardEvent } from 'react';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { GameDataError } from '@/features/game-data/components/GameDataError';
import { GameDataLoading } from '@/features/game-data/components/GameDataLoading';
import { BASE_TIERS } from '@/features/game-data/constants/bases';
import { useGameData } from '@/features/game-data/hooks/useGameData';
import { cn } from '@/lib/utils';
import { getBaseBrowserModel } from '../../utils/baseBrowser';
import {
  allCodes,
  applyBrowserSelection,
  filterBrowser,
  initialBrowserSelection,
  toggleCodes,
  triState,
  type BrowserGroup,
  type BrowserModel,
} from '../../utils/browserModel';
import { getMiscBrowserModel, type MiscBrowserModel } from '../../utils/miscBrowser';
import { BrowserGroupSection, TierBadge, TriCheckbox, type ToggleCodes } from './BrowserGroups';

// `lootfilter` is the bundle the item picker already loads (one cached request per file).
const BUNDLES = ['bases', 'types', 'lootfilter'] as const;

type BrowserTab = 'bases' | 'misc';

const TABS: readonly { readonly value: BrowserTab; readonly label: string; readonly noun: string }[] = [
  { value: 'bases', label: 'Bases', noun: 'bases' },
  { value: 'misc', label: 'Misc', noun: 'misc items' },
];

interface ItemBrowserProps {
  readonly values: readonly string[];
  readonly onChange: (codes: readonly string[]) => void;
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((value, index) => value === b[index]);

interface BrowserTabsProps {
  readonly tab: BrowserTab;
  readonly onChange: (tab: BrowserTab) => void;
  readonly idPrefix: string;
  /** Match counts per tab while searching. */
  readonly counts: Readonly<Record<BrowserTab, number>> | null;
}

/** The Bases | Misc tab list (arrow keys, Home and End move between the tabs). */
function BrowserTabs({ tab, onChange, idPrefix, counts }: BrowserTabsProps) {
  const select = (next: BrowserTab) => {
    onChange(next);
    document.getElementById(`${idPrefix}-tab-${next}`)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const index = TABS.findIndex((candidate) => candidate.value === tab);
    const target =
      event.key === 'ArrowRight'
        ? TABS[(index + 1) % TABS.length]
        : event.key === 'ArrowLeft'
          ? TABS[(index - 1 + TABS.length) % TABS.length]
          : event.key === 'Home'
            ? TABS[0]
            : event.key === 'End'
              ? TABS[TABS.length - 1]
              : undefined;
    if (target === undefined) return;
    event.preventDefault();
    select(target.value);
  };
  return (
    <div role="tablist" aria-label="Item kinds" className="inline-flex rounded-md border bg-muted/40 p-0.5" onKeyDown={onKeyDown}>
      {TABS.map((option) => {
        const active = option.value === tab;
        return (
          <button
            key={option.value}
            id={`${idPrefix}-tab-${option.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            className={cn(
              'rounded-sm px-3 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => {
              onChange(option.value);
            }}
          >
            {option.label}
            {counts !== null && <span className="ml-1 tabular-nums">({counts[option.value]})</span>}
          </button>
        );
      })}
    </div>
  );
}

interface BrowserFormProps {
  readonly bases: BrowserModel;
  readonly misc: MiscBrowserModel;
  readonly values: readonly string[];
  readonly onApply: (codes: readonly string[]) => void;
  readonly onCancel: () => void;
}

function ItemBrowserForm({ bases, misc, values, onApply, onCancel }: BrowserFormProps) {
  const idPrefix = useId();
  // Bases first, then misc: the order new codes are appended in on Apply.
  const knownCodes = [...bases.codes, ...misc.codes];
  // One draft for both tabs: it holds the codes the browser lists; Apply merges it into the values, Cancel drops it.
  const [draft, setDraft] = useState(() => initialBrowserSelection(values, knownCodes));
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<BrowserTab>('bases');
  const searching = query.trim() !== '';
  const filtered: Record<BrowserTab, readonly BrowserGroup[]> = {
    bases: filterBrowser(bases.groups, query),
    misc: filterBrowser(misc.groups, query),
  };
  const groups = filtered[tab];
  const noun = TABS.find((option) => option.value === tab)?.noun ?? 'items';

  const toggle: ToggleCodes = (codes, on) => {
    setDraft((current) => toggleCodes(current, codes, on));
  };

  return (
    <>
      <div className="space-y-2 border-b px-4 pb-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <BrowserTabs
            tab={tab}
            onChange={setTab}
            idPrefix={idPrefix}
            counts={searching ? { bases: allCodes(filtered.bases).length, misc: allCodes(filtered.misc).length } : null}
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Filter by name, code or type…"
            aria-label="Filter items"
            className="h-8 min-w-0 flex-1 basis-56"
          />
          <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {draft.size} selected
          </span>
        </div>
        {tab === 'bases' && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-xs text-muted-foreground">{searching ? 'Every shown:' : 'Every:'}</span>
            {BASE_TIERS.map((tier) => {
              const codes = allCodes(filtered.bases, tier);
              return (
                <TriCheckbox
                  key={tier}
                  state={triState(codes, draft)}
                  disabled={codes.length === 0}
                  onChange={(on) => {
                    toggle(codes, on);
                  }}
                >
                  <TierBadge tier={tier} />
                </TriCheckbox>
              );
            })}
          </div>
        )}
      </div>
      <div
        id={`${idPrefix}-panel`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-tab-${tab}`}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-6"
      >
        {tab === 'misc' && misc.excluded.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Not listed: stacks of identically named containers ({misc.excluded.map((type) => type.itemName).join(', ')}); find them with
            “Add item” or by item type.
          </p>
        )}
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No {noun} match “{query.trim()}”.
          </p>
        ) : (
          groups.map((group) => <BrowserGroupSection key={group.label} group={group} selected={draft} onToggle={toggle} />)
        )}
      </div>
      <DialogFooter className="border-t px-4 py-3 sm:px-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            onApply(applyBrowserSelection(values, knownCodes, draft));
          }}
        >
          Apply
        </Button>
      </DialogFooter>
    </>
  );
}

function ItemBrowserBody({ values, onApply, onCancel }: Omit<BrowserFormProps, 'bases' | 'misc'>) {
  const gameData = useGameData(BUNDLES);
  if (gameData.status === 'loading') return <GameDataLoading />;
  if (gameData.status === 'error') {
    return (
      <div className="overflow-y-auto px-4 pb-4 sm:px-6">
        <GameDataError error={gameData.error} onRetry={gameData.retry} />
      </div>
    );
  }
  return (
    <ItemBrowserForm
      bases={getBaseBrowserModel(gameData.data.bases, gameData.data.types)}
      misc={getMiscBrowserModel(gameData.data.lootfilter, gameData.data.types, gameData.data.bases)}
      values={values}
      onApply={onApply}
      onCancel={onCancel}
    />
  );
}

/**
 * "Browse items…": two tabs with checkboxes. Bases: every spawnable base by type group, type and tier (a Normal |
 * Exceptional | Elite row per family). Misc: the spawnable misc items that are not bases, by type group and type, with
 * quality families (Chipped … Perfect) as grid rows. Both tabs edit one draft; Apply hands the picker its values with
 * the browser's codes replaced.
 */
export function ItemBrowserDialog({ values, onChange }: ItemBrowserProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs">
          <LayoutGrid className="size-3.5" aria-hidden />
          Browse items…
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="px-4 pt-4 pb-3 pr-12 sm:px-6 sm:pr-12">
          <DialogTitle>Browse items</DialogTitle>
          <DialogDescription>
            Tick bases by type and tier, or misc items (runes, gems, potions…) by group, then Apply. Shadow bases of uniques are not listed;
            find them with “Add item”.
          </DialogDescription>
        </DialogHeader>
        {/* The content unmounts on close, so every opening starts a fresh draft from the picker's values. */}
        <ItemBrowserBody
          values={values}
          onApply={(codes) => {
            if (!sameList(codes, values)) onChange(codes);
            setOpen(false);
          }}
          onCancel={() => {
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
