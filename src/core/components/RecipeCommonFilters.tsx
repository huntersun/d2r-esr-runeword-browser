import { useDispatch, useSelector } from 'react-redux';
import type { UnknownAction } from '@reduxjs/toolkit';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { CopyLinkHelpButton } from '@/components/CopyLinkHelpButton';
import { SearchHelpButton } from '@/components/SearchHelpButton';
import { useDebouncedFilterValue } from '@/core/hooks/useDebouncedFilterValue';
import { ItemTypeFilter, type ItemTypeFilterActions } from '@/core/components/ItemTypeFilter';
import type { RootState } from '@/core/store';

const INPUT_DEBOUNCE_MS = 300;

const NUMBER_INPUT_CLASS =
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

/** Selectors of a recipe slice built with `createItemTypeFilterSelectors`. */
export interface RecipeFilterSelectors {
  readonly selectSearchText: (state: RootState) => string;
  readonly selectSocketCount: (state: RootState) => number | null;
  readonly selectMaxReqLevel: (state: RootState) => number | null;
  readonly selectSelectedItemTypes: (state: RootState) => Record<string, boolean>;
}

/** Actions of a recipe slice built with `itemTypeFilterReducers`. */
export interface RecipeFilterActions extends ItemTypeFilterActions {
  readonly setSearchText: (value: string) => UnknownAction;
  readonly setSocketCount: (value: number | null) => UnknownAction;
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
 * Search, socket count, max required level, share link and item type filters
 * shared by the runeword and gemword screens.
 */
export function RecipeCommonFilters({ selectors, actions, itemTypes, getShareUrl, idPrefix, searchPlaceholder }: RecipeCommonFiltersProps) {
  const dispatch = useDispatch();
  const searchText = useSelector(selectors.selectSearchText);
  const socketCount = useSelector(selectors.selectSocketCount);
  const maxReqLevel = useSelector(selectors.selectMaxReqLevel);

  const [localSearchText, setLocalSearchText, commitSearchText] = useDebouncedFilterValue(
    searchText,
    (value) => dispatch(actions.setSearchText(value)),
    INPUT_DEBOUNCE_MS
  );
  const [localSocketCount, setLocalSocketCount, commitSocketCount] = useDebouncedFilterValue(
    socketCount,
    (value) => dispatch(actions.setSocketCount(value)),
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

        <NumberFilterInput
          id={`${idPrefix}sockets`}
          hint="Filter by # of sockets."
          label="Sockets"
          placeholder="Sockets"
          max={6}
          value={localSocketCount}
          onChange={setLocalSocketCount}
          onClear={() => {
            commitSocketCount(null);
          }}
          clearLabel="Clear sockets"
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
