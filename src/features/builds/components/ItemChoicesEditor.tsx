import { useState } from 'react';
import { ChevronsUpDown, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { BaseItem } from '@/features/game-data/engine/schema';
import { cn } from '@/lib/utils';
import {
  ITEM_CHOICE_MAX_LENGTH,
  supportsSocketed,
  type EquipmentSlot,
  type ItemRef,
  type RunewordBaseChoice,
  type RunewordItemRef,
  type SocketableItemRef,
  type WeaponSwapSlot,
} from '../buildData';
import { useRunewordBases } from '../hooks/useRunewordBases';
import { useSocketFillerCatalog } from '../hooks/useSocketFillerCatalog';
import { withBase, withSocketed } from '../utils/itemChoices';
import { baseSummary } from '../utils/runewordBases';
import { slotSocketCap } from '../utils/sockets';

const MAX_BASE_RESULTS = 60;
const MAX_FILLERS_PER_GROUP = 12;

interface ItemChoicesEditorProps {
  readonly item: ItemRef;
  readonly slot: EquipmentSlot | WeaponSwapSlot;
  readonly onChange: (ref: ItemRef) => void;
  readonly disabled?: boolean;
}

/**
 * The author's choices for an equipped item, under its slot picker: the base of a runeword
 * and the socket fillers (runeword jewel sockets, or up to the slot family's cap for
 * uniques / mythicals / set items). Nothing for gemwords and freetext.
 */
export function ItemChoicesEditor({ item, slot, onChange, disabled }: ItemChoicesEditorProps) {
  if (item.type === 'runeword') return <RunewordChoicesEditor item={item} slot={slot} onChange={onChange} disabled={disabled} />;
  if (!supportsSocketed(item)) return null;
  return <SocketedEditor item={item} cap={slotSocketCap(slot)} onChange={onChange} disabled={disabled} />;
}

function RunewordChoicesEditor({
  item,
  slot,
  onChange,
  disabled,
}: {
  readonly item: RunewordItemRef;
  readonly slot: EquipmentSlot | WeaponSwapSlot;
  readonly onChange: (ref: ItemRef) => void;
  readonly disabled?: boolean;
}) {
  const state = useRunewordBases(item, slot);
  if (state.status === 'loading') return null;

  const setBase = (base: RunewordBaseChoice | undefined) => {
    onChange(withBase(item, base));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {state.status === 'unavailable' ? (
        <p className="text-xs text-muted-foreground">Bases unavailable{item.base !== undefined && ` (saved: ${item.base.name})`}</p>
      ) : (
        (state.candidates.length > 0 || item.base !== undefined) && (
          <BasePicker
            candidates={state.candidates}
            typeNames={state.typeNames}
            unmatched={state.unmatched}
            currentLabel={
              item.base === undefined
                ? null
                : state.chosenBase !== undefined
                  ? baseSummary(state.chosenBase, state.typeNames)
                  : item.base.name
            }
            disabled={disabled}
            onSelect={setBase}
          />
        )
      )}
      {(state.jewelSockets > 0 || (item.socketed?.length ?? 0) > 0) && (
        <SocketedEditor item={item} cap={state.jewelSockets} label="Jewel sockets" onChange={onChange} disabled={disabled} />
      )}
    </div>
  );
}

interface BasePickerProps {
  readonly candidates: readonly BaseItem[];
  readonly typeNames: ReadonlyMap<string, string>;
  readonly unmatched: boolean;
  /** Summary of the chosen base, or null when none is chosen */
  readonly currentLabel: string | null;
  readonly disabled?: boolean;
  readonly onSelect: (base: RunewordBaseChoice | undefined) => void;
}

function BasePicker({ candidates, typeNames, unmatched, currentLabel, disabled, onSelect }: BasePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = candidates.filter(
    (base) => q === '' || base.name.toLowerCase().includes(q) || (typeNames.get(base.type) ?? base.type).toLowerCase().includes(q)
  );
  const shown = matches.slice(0, MAX_BASE_RESULTS);

  const select = (base: RunewordBaseChoice | undefined) => {
    onSelect(base);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">Base</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8 min-w-0 flex-1 justify-between font-normal"
            aria-label="Runeword base"
          >
            <span className={cn('truncate text-xs', currentLabel === null && 'text-muted-foreground')}>
              {currentLabel ?? 'Choose base…'}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(28rem,calc(100vw-2rem))] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search bases..." value={query} onValueChange={setQuery} />
            {unmatched && (
              <p className="border-b px-3 py-2 text-xs text-muted-foreground">Recipe not matched to the game files: all bases shown.</p>
            )}
            <CommandList>
              {currentLabel !== null && (
                <CommandGroup>
                  <CommandItem
                    value="__no_base__"
                    onSelect={() => {
                      select(undefined);
                    }}
                  >
                    <X className="size-4" />
                    No base
                  </CommandItem>
                </CommandGroup>
              )}
              {shown.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">No matching base.</div>}
              {shown.length > 0 && (
                <CommandGroup
                  heading={
                    matches.length > shown.length ? `${String(shown.length)} of ${String(matches.length)} — type to narrow` : undefined
                  }
                >
                  {shown.map((base) => (
                    <CommandItem
                      key={base.code}
                      value={base.code}
                      onSelect={() => {
                        select({ code: base.code, name: base.name });
                      }}
                    >
                      <span className="truncate text-xs">{baseSummary(base, typeNames)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface SocketedEditorProps {
  readonly item: SocketableItemRef;
  readonly cap: number;
  readonly label?: string;
  readonly onChange: (ref: ItemRef) => void;
  readonly disabled?: boolean;
}

/** "Sockets (n/N)": chips for the current fillers, and an "Add…" picker while there is room. */
function SocketedEditor({ item, cap, label = 'Sockets', onChange, disabled }: SocketedEditorProps) {
  const fillers = item.socketed ?? [];
  if (cap <= 0 && fillers.length === 0) return null;

  const remove = (index: number) => {
    onChange(
      withSocketed(
        item,
        fillers.filter((_, position) => position !== index)
      )
    );
  };
  const add = (name: string) => {
    const trimmed = name.trim().slice(0, ITEM_CHOICE_MAX_LENGTH);
    if (trimmed === '' || fillers.length >= cap) return;
    onChange(withSocketed(item, [...fillers, trimmed]));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label} ({fillers.length}/{cap})
      </span>
      {fillers.map((filler, index) => (
        <Badge key={`${String(index)}:${filler}`} variant="secondary" className="gap-1 pr-1">
          {filler}
          <button
            type="button"
            disabled={disabled}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
            aria-label={`Remove ${filler}`}
            onClick={() => {
              remove(index);
            }}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      {fillers.length < cap && <FillerPicker disabled={disabled} onSelect={add} />}
    </div>
  );
}

interface FillerOption {
  readonly key: string;
  readonly name: string;
}

function FillerPicker({ disabled, onSelect }: { readonly disabled?: boolean; readonly onSelect: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const catalog = useSocketFillerCatalog();
  const q = query.trim().toLowerCase();

  const groups: readonly { readonly heading: string; readonly options: readonly FillerOption[] }[] =
    catalog === undefined
      ? []
      : [
          { heading: 'ESR Runes', options: catalog.esrRunes.map((rune) => ({ key: `esr:${rune.name}`, name: rune.name })) },
          { heading: 'LoD Runes', options: catalog.lodRunes.map((rune) => ({ key: `lod:${rune.name}`, name: rune.name })) },
          { heading: 'Kanji Runes', options: catalog.kanjiRunes.map((rune) => ({ key: `kanji:${rune.name}`, name: rune.name })) },
          { heading: 'Gems', options: catalog.gems.map((gem) => ({ key: `gem:${gem.name}`, name: gem.name })) },
          { heading: 'Crystals', options: catalog.crystals.map((crystal) => ({ key: `crystal:${crystal.name}`, name: crystal.name })) },
          {
            heading: 'Unique Jewels',
            options: catalog.uniqueJewels.map((jewel) => ({ key: `jewel:${String(jewel.id)}:${jewel.name}`, name: jewel.name })),
          },
        ];
  const visible = groups
    .map((group) => ({ ...group, options: group.options.filter((option) => q === '' || option.name.toLowerCase().includes(q)) }))
    .filter((group) => group.options.length > 0)
    .map((group) => ({ ...group, options: group.options.slice(0, MAX_FILLERS_PER_GROUP) }));

  const select = (name: string) => {
    onSelect(name);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="h-6 gap-1 px-2 text-xs">
          <Plus className="size-3" />
          Add…
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rune, gem, crystal, jewel..."
            value={query}
            onValueChange={setQuery}
            maxLength={ITEM_CHOICE_MAX_LENGTH}
          />
          <CommandList>
            {catalog === undefined && <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>}
            {visible.map((group) => (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.options.map((option) => (
                  <CommandItem
                    key={option.key}
                    value={option.key}
                    onSelect={() => {
                      select(option.name);
                    }}
                  >
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {q !== '' && (
              <CommandGroup heading="Custom">
                <CommandItem
                  value="__custom__"
                  onSelect={() => {
                    select(query);
                  }}
                >
                  <Plus className="size-4" />
                  Use “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
