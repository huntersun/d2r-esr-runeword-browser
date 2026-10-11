import { useDispatch, useSelector } from 'react-redux';
import type { UnknownAction } from '@reduxjs/toolkit';
import { HelpCircle, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { CopyLinkHelpButton } from '@/components/CopyLinkHelpButton';
import { SearchHelpButton } from '@/components/SearchHelpButton';
import { useDebouncedFilterValue } from '@/core/hooks/useDebouncedFilterValue';
import { ItemTypeFilter, type ItemTypeFilterActions } from '@/core/components/ItemTypeFilter';
import type { RootState } from '@/core/store';
import { formatSocketRange, parseSocketRange, type SocketRange } from '@/core/utils/socketRange';

const INPUT_DEBOUNCE_MS = 300;

const NUMBER_INPUT_CLASS =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

/** Selectors of a recipe slice built with `createItemTypeFilterSelectors`. */
export interface RecipeFilterSelectors {
  readonly selectSearchText: (state: RootState) => string;
  readonly selectSocketRange: (state: RootState) => SocketRange | null;
  readonly selectMaxReqLevel: (state: RootState) => number | null;
  readonly selectSelectedItemTypes: (state: RootState) => Record<string, boolean>;
}

/** Actions of a recipe slice built with `itemTypeFilterReducers`. */
export interface RecipeFilterActions extends ItemTypeFilterActions {
  readonly setSearchText: (value: string) => UnknownAction;
  readonly setSocketRange: (value: SocketRange | null) => UnknownAction;
  readonly setMaxReqLevel: (value: number | null) => UnknownAction;
}

interface RecipeCommonFiltersProps {
  readonly selectors: RecipeFilterSelectors;
  readonly actions: RecipeFilterActions;
  readonly itemTypes: readonly string[] | undefined;
  readonly getShareUrl: () => string;
  /** Prefix for input ids, keeps them unique per screen */
  readonly idPrefix: string;
  readonly searchPlaceholder: string;
}

/**
 * Search, socket range, max required level, share link and item type filters
 * shared by the runeword and gemword screens.
 */
export function RecipeCommonFilters({ selectors, actions, itemTypes, getShareUrl, idPrefix, searchPlaceholder }: RecipeCommonFiltersProps) {
  const dispatch = useDispatch();
  const searchText = useSelector(selectors.selectSearchText);
  const socketRange = useSelector(selectors.selectSocketRange);
  const maxReqLevel = useSelector(selectors.selectMaxReqLevel);

  const [localSearchText, setLocalSearchText, commitSearchText] = useDebouncedFilterValue(
    searchText,
    (value) => dispatch(actions.setSearchText(value)),
    INPUT_DEBOUNCE_MS
  );
  // The input holds the text form; only valid text is committed, so a half-typed range keeps the previous filter
  const [localSocketText, setLocalSocketText, commitSocketText] = useDebouncedFilterValue(
    formatSocketRange(socketRange),
    (text) => {
      const parsed = parseSocketRange(text);
      if (text.trim() === '' || parsed !== null) dispatch(actions.setSocketRange(parsed));
    },
    INPUT_DEBOUNCE_MS
  );
  const [localMaxReqLevel, setLocalMaxReqLevel, commitMaxReqLevel] = useDebouncedFilterValue(
    maxReqLevel,
    (value) => dispatch(actions.setMaxReqLevel(value)),
    INPUT_DEBOUNCE_MS
  );

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        {/* Search input */}
        <div className="flex-1 min-w-64 max-w-md space-y-1">
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground">
              Search by words or <code className="bg-muted px-1 rounded">"exact phrases"</code>
            </p>
            <SearchHelpButton />
          </div>
          <Label htmlFor={`${idPrefix}search`} className="sr-only">
            Search
          </Label>
          <InputGroup>
            <InputGroupInput
              id={`${idPrefix}search`}
              type="text"
              placeholder={searchPlaceholder}
              value={localSearchText}
              onChange={(e) => {
                setLocalSearchText(e.target.value);
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {localSearchText && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    commitSearchText('');
                  }}
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        <SocketRangeInput
          id={`${idPrefix}sockets`}
          value={localSocketText}
          onChange={setLocalSocketText}
          onClear={() => {
            commitSocketText('');
          }}
        />

        <NumberFilterInput
          id={`${idPrefix}maxReqLevel`}
          hint="Max required level."
          label="Max Req Level"
          placeholder="Max Req Lvl"
          max={999}
          value={localMaxReqLevel}
          onChange={setLocalMaxReqLevel}
          onClear={() => {
            commitMaxReqLevel(null);
          }}
          clearLabel="Clear max req level"
        />

        {/* Copy Link button */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground">Share your current filters.</p>
            <CopyLinkHelpButton />
          </div>
          <CopyLinkButton getShareUrl={getShareUrl} />
        </div>
      </div>

      <ItemTypeFilter itemTypes={itemTypes} selectSelectedItemTypes={selectors.selectSelectedItemTypes} actions={actions} />
    </>
  );
}

export interface NumberFilterInputProps {
  readonly id: string;
  readonly hint: string;
  readonly label: string;
  readonly placeholder: string;
  readonly max: number;
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
  readonly onClear: () => void;
  readonly clearLabel: string;
}

/** Optional integer input in [1, max] with a clear button; empty means "no filter". */
export function NumberFilterInput({ id, hint, label, placeholder, max, value, onChange, onClear, clearLabel }: NumberFilterInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(null);
      return;
    }
    const num = parseInt(raw, 10);
    if (num >= 1 && num <= max) {
      onChange(num);
    }
  };

  return (
    <div className="w-32 space-y-1">
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          type="number"
          min={1}
          max={max}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={handleChange}
          autoComplete="off"
          className={NUMBER_INPUT_CLASS}
        />
        {value !== null && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="ghost" size="icon-xs" onClick={onClear} aria-label={clearLabel}>
              <X className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}

interface SocketRangeInputProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onClear: () => void;
}

const SOCKET_RANGE_EXAMPLES: readonly { readonly text: string; readonly description: string }[] = [
  { text: '4', description: 'exactly 4 sockets' },
  { text: '2-4', description: '2, 3 or 4 sockets' },
  { text: '-4', description: 'up to 4 sockets' },
  { text: '4-', description: '4 or more sockets' },
];

/** Socket filter text input: an exact count or a range (see `parseSocketRange`); empty means "no filter". */
function SocketRangeInput({ id, value, onChange, onClear }: SocketRangeInputProps) {
  const isInvalid = value.trim() !== '' && parseSocketRange(value) === null;

  return (
    <div className="w-40 space-y-1">
      <div className="flex items-center gap-1">
        <p className="text-xs text-muted-foreground">Sockets or a range.</p>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="size-5 text-muted-foreground" aria-label="Socket filter help">
              <HelpCircle className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium mb-1">Socket Filter</h4>
                <p className="text-sm text-muted-foreground">
                  Type a socket count, or a range to see every recipe that fits an item with that many sockets.
                </p>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {SOCKET_RANGE_EXAMPLES.map((example) => (
                  <li key={example.text}>
                    <code className="bg-muted px-1 rounded">{example.text}</code> - {example.description}
                  </li>
                ))}
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Label htmlFor={id} className="sr-only">
        Sockets
      </Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          type="text"
          placeholder="4 or 2-4"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          aria-invalid={isInvalid || undefined}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {value !== '' && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="ghost" size="icon-xs" onClick={onClear} aria-label="Clear sockets">
              <X className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}
