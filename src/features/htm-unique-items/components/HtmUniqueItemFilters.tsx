import { useDispatch, useSelector } from 'react-redux';
import { useDebouncedFilterValue } from '@/core/hooks/useDebouncedFilterValue';
import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { CopyLinkButton } from '@/components/CopyLinkButton';
import { SearchHelpButton } from '@/components/SearchHelpButton';
import { FilterPanel } from '@/components/FilterPanel';
import { HtmCategoryFilter } from './HtmCategoryFilter';
import { AcquisitionFilter } from './AcquisitionFilter';
import { MaxReqLevelInput } from './MaxReqLevelInput';
import { TierFilter } from './TierFilter';
import { useShareUrl } from '../hooks/useShareUrl';
import { setSearchText, setMaxReqLevel, selectSearchText, selectMaxReqLevel } from '../store';

const SEARCH_DEBOUNCE_MS = 300;

export function HtmUniqueItemFilters() {
  const dispatch = useDispatch();
  const searchText = useSelector(selectSearchText);
  const maxReqLevel = useSelector(selectMaxReqLevel);
  const getShareUrl = useShareUrl();

  const [localSearchText, setLocalSearchText, commitSearchText] = useDebouncedFilterValue(
    searchText,
    (value) => dispatch(setSearchText(value)),
    SEARCH_DEBOUNCE_MS
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchText(e.target.value);
  };

  const handleClearSearch = () => {
    commitSearchText('');
  };

  return (
    <FilterPanel>
      {/* Search row */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Search input */}
        <div className="flex-1 min-w-64 max-w-md space-y-1">
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground">
              Search by words or <code className="bg-muted px-1 rounded">"exact phrases"</code>
            </p>
            <SearchHelpButton />
          </div>
          <Label htmlFor="htm-unique-search" className="sr-only">
            Search
          </Label>
          <InputGroup>
            <InputGroupInput
              id="htm-unique-search"
              type="text"
              placeholder="Search name or properties..."
              value={localSearchText}
              onChange={handleSearchChange}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {localSearchText && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton variant="ghost" size="icon-xs" onClick={handleClearSearch} aria-label="Clear search">
                  <X className="size-4" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>

        {/* Max Required Level */}
        <MaxReqLevelInput id="htm-unique-maxReqLevel" value={maxReqLevel} onChange={(value) => dispatch(setMaxReqLevel(value))} />

        {/* Copy Link button */}
        <CopyLinkButton getShareUrl={getShareUrl} />
      </div>

      {/* Acquisition chips */}
      <AcquisitionFilter />

      {/* Base tier checkboxes */}
      <TierFilter />

      {/* Category Filter */}
      <HtmCategoryFilter />
    </FilterPanel>
  );
}
