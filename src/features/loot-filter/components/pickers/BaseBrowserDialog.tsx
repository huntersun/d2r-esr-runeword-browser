import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { GameDataError } from '@/features/game-data/components/GameDataError';
import { GameDataLoading } from '@/features/game-data/components/GameDataLoading';
import { BASE_TIERS } from '@/features/game-data/constants/bases';
import { useGameData } from '@/features/game-data/hooks/useGameData';
import { getBaseBrowserModel } from '../../utils/baseBrowser';
import {
  allCodes,
  applyBrowserSelection,
  filterBrowser,
  initialBrowserSelection,
  toggleCodes,
  triState,
  type BrowserModel,
} from '../../utils/browserModel';
import { BrowserGroupSection, TierBadge, TriCheckbox, type ToggleCodes } from './BaseBrowserGroups';

const BUNDLES = ['bases', 'types'] as const;

interface BaseBrowserProps {
  readonly values: readonly string[];
  readonly onChange: (codes: readonly string[]) => void;
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((value, index) => value === b[index]);

interface BrowserFormProps {
  readonly model: BrowserModel;
  readonly values: readonly string[];
  readonly onApply: (codes: readonly string[]) => void;
  readonly onCancel: () => void;
}

function BaseBrowserForm({ model, values, onApply, onCancel }: BrowserFormProps) {
  // The draft holds the codes the browser lists; Apply merges it into the values, Cancel drops it.
  const [draft, setDraft] = useState(() => initialBrowserSelection(values, model.codes));
  const [query, setQuery] = useState('');
  const groups = filterBrowser(model.groups, query);
  const searching = query.trim() !== '';

  const toggle: ToggleCodes = (codes, on) => {
    setDraft((current) => toggleCodes(current, codes, on));
  };

  return (
    <>
      <div className="space-y-2 border-b px-4 pb-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Filter by name, code or type…"
            aria-label="Filter bases"
            className="h-8 min-w-0 flex-1 basis-56"
          />
          <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {draft.size} selected
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs text-muted-foreground">{searching ? 'Every shown:' : 'Every:'}</span>
          {BASE_TIERS.map((tier) => {
            const codes = allCodes(groups, tier);
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
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-6">
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No bases match “{query.trim()}”.</p>
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
            onApply(applyBrowserSelection(values, model.codes, draft));
          }}
        >
          Apply
        </Button>
      </DialogFooter>
    </>
  );
}

function BaseBrowserBody({ values, onApply, onCancel }: Omit<BrowserFormProps, 'model'>) {
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
    <BaseBrowserForm
      model={getBaseBrowserModel(gameData.data.bases, gameData.data.types)}
      values={values}
      onApply={onApply}
      onCancel={onCancel}
    />
  );
}

/**
 * "Browse bases…": every spawnable base by type group, type and tier (a Normal | Exceptional | Elite row per family),
 * with checkboxes. The dialog edits a draft; Apply hands the picker its values with the browser's codes replaced.
 */
export function BaseBrowserDialog({ values, onChange }: BaseBrowserProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs">
          <LayoutGrid className="size-3.5" aria-hidden />
          Browse bases…
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="px-4 pt-4 pb-3 pr-12 sm:px-6 sm:pr-12">
          <DialogTitle>Browse bases</DialogTitle>
          <DialogDescription>
            Tick bases by type and tier, then Apply. Shadow bases of uniques and misc items (runes, gems, potions…) are not listed; find
            them with “Add item”.
          </DialogDescription>
        </DialogHeader>
        {/* The content unmounts on close, so every opening starts a fresh draft from the picker's values. */}
        <BaseBrowserBody
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
