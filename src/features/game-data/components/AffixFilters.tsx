import { useDispatch, useSelector } from 'react-redux';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { CopyLinkHelpButton } from '@/components/CopyLinkHelpButton';
import { SearchHelpButton } from '@/components/SearchHelpButton';
import { NumberFilterInput } from '@/core/components/RecipeCommonFilters';
import { useDebouncedFilterValue } from '@/core/hooks/useDebouncedFilterValue';
import { isClassCode, type ClassInfo } from '../engine/schema';
import {
  AFFIX_KINDS,
  AFFIX_KIND_LABELS,
  AFFIX_LEVEL_RANGE,
  AFFIX_SORT_KEYS,
  AFFIX_SORT_LABELS,
  isAffixSortKey,
} from '../constants/affixes';
import {
  clearAffixTypes,
  resetAffixFilters,
  selectAffixFilters,
  setAffixClass,
  setAffixMaxLvl,
  setAffixMinLvl,
  setAffixRareOnly,
  setAffixSearch,
  setAffixSort,
  setAffixSortDir,
  toggleAffixKind,
  toggleAffixType,
} from '../store/gameDataSlice';

const INPUT_DEBOUNCE_MS = 300;

export interface TypeOption {
  readonly code: string;
  readonly name: string;
}

interface AffixFiltersProps {
  readonly classes: readonly ClassInfo[];
  /** Types used in any affix's itypes, sorted by name */
  readonly typeOptions: readonly TypeOption[];
  /** What-can-roll mode: level range, type and sort filters are replaced by the eligibility rules */
  readonly rollMode: boolean;
  readonly getShareUrl: () => string;
}

export function AffixFilters({ classes, typeOptions, rollMode, getShareUrl }: AffixFiltersProps) {
  const dispatch = useDispatch();
  const filters = useSelector(selectAffixFilters);

  const [localSearch, setLocalSearch, commitSearch] = useDebouncedFilterValue(
    filters.search,
    (value) => dispatch(setAffixSearch(value)),
    INPUT_DEBOUNCE_MS
  );
  const [localMinLvl, setLocalMinLvl, commitMinLvl] = useDebouncedFilterValue(
    filters.minLvl,
    (value) => dispatch(setAffixMinLvl(value)),
    INPUT_DEBOUNCE_MS
  );
  const [localMaxLvl, setLocalMaxLvl, commitMaxLvl] = useDebouncedFilterValue(
    filters.maxLvl,
    (value) => dispatch(setAffixMaxLvl(value)),
    INPUT_DEBOUNCE_MS
  );

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-64 max-w-md space-y-1">
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground">
              Search name or stats; <code className="bg-muted px-1 rounded">"exact phrases"</code>
            </p>
            <SearchHelpButton />
          </div>
          <Label htmlFor="affixes-search" className="sr-only">
            Search
          </Label>
          <InputGroup>
            <InputGroupInput
              id="affixes-search"
              type="text"
              placeholder="Search affixes..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {localSearch && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    commitSearch('');
                  }}
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        {!rollMode && (
          <>
            <NumberFilterInput
              id="affixes-minLvl"
              hint="Min affix level."
              label="Min affix level"
              placeholder="Min lvl"
              max={AFFIX_LEVEL_RANGE.max}
              value={localMinLvl}
              onChange={setLocalMinLvl}
              onClear={() => {
                commitMinLvl(null);
              }}
              clearLabel="Clear min affix level"
            />
            <NumberFilterInput
              id="affixes-maxLvl"
              hint="Max affix level."
              label="Max affix level"
              placeholder="Max lvl"
              max={AFFIX_LEVEL_RANGE.max}
              value={localMaxLvl}
              onChange={setLocalMaxLvl}
              onClear={() => {
                commitMaxLvl(null);
              }}
              clearLabel="Clear max affix level"
            />
          </>
        )}

        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground">Share your current filters.</p>
            <CopyLinkHelpButton />
          </div>
          <CopyLinkButton getShareUrl={getShareUrl} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Kind</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {AFFIX_KINDS.map((kind) => (
              <label key={kind} className="flex h-7 cursor-pointer items-center gap-1">
                <Checkbox checked={filters.kinds.includes(kind)} onCheckedChange={() => dispatch(toggleAffixKind(kind))} />
                <span className="text-sm">{AFFIX_KIND_LABELS[kind]}</span>
              </label>
            ))}
            <label className="flex h-7 cursor-pointer items-center gap-1">
              <Checkbox checked={filters.rareOnly} onCheckedChange={(checked) => dispatch(setAffixRareOnly(checked === true))} />
              <span className="text-sm">Rare only</span>
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="affixes-class" className="text-xs font-normal text-muted-foreground">
            Class restriction
          </Label>
          <Select
            value={filters.cls}
            onValueChange={(value) => {
              if (value === 'any' || value === 'none' || isClassCode(value)) dispatch(setAffixClass(value));
            }}
          >
            <SelectTrigger id="affixes-class" size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="none">No class restriction</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.code} value={cls.code}>
                  {cls.name} only
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!rollMode && (
          <div className="space-y-1">
            <Label htmlFor="affixes-sort" className="text-xs font-normal text-muted-foreground">
              Sort by
            </Label>
            <div className="flex items-center gap-1">
              <Select
                value={filters.sort}
                onValueChange={(value) => {
                  if (isAffixSortKey(value)) dispatch(setAffixSort(value));
                }}
              >
                <SelectTrigger id="affixes-sort" size="sm" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AFFIX_SORT_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {AFFIX_SORT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => dispatch(setAffixSortDir(filters.sortDir === 'asc' ? 'desc' : 'asc'))}
                aria-label={filters.sortDir === 'asc' ? 'Sorted ascending, switch to descending' : 'Sorted descending, switch to ascending'}
                title={filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {filters.sortDir === 'asc' ? <ArrowUpNarrowWide className="size-4" /> : <ArrowDownWideNarrow className="size-4" />}
              </Button>
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => dispatch(resetAffixFilters())}>
          Reset filters
        </Button>
      </div>

      {!rollMode && <AffixTypePicker typeOptions={typeOptions} selected={filters.types} />}
    </div>
  );
}

interface AffixTypePickerProps {
  readonly typeOptions: readonly TypeOption[];
  readonly selected: readonly string[];
}

/** Flat, collapsible list of the item types affixes name in their itypes; nothing selected means every type. */
function AffixTypePicker({ typeOptions, selected }: AffixTypePickerProps) {
  const dispatch = useDispatch();

  return (
    <details className="space-y-2">
      <summary className="cursor-pointer text-sm">
        <span className="font-medium">Item Types: </span>
        <span className="text-xs text-muted-foreground">
          {selected.length === 0 ? 'all (none selected)' : `${String(selected.length)} selected`}
        </span>
      </summary>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button variant="outline" size="sm" onClick={() => dispatch(clearAffixTypes())} disabled={selected.length === 0}>
          Clear
        </Button>
        {typeOptions.map((type) => (
          <label key={type.code} className="flex h-7 cursor-pointer items-center gap-1">
            <Checkbox checked={selected.includes(type.code)} onCheckedChange={() => dispatch(toggleAffixType(type.code))} />
            <span className="text-sm">{type.name}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
