import { Check, Plus } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { filterPickerOptions, groupPickerOptions, type PickerOption } from '../../utils/pickerSearch';

/** An entry for what the user typed when the list has no option for it (an unknown code, an id). */
export interface PickerCustomOption {
  readonly value: string;
  readonly label: string;
}

/** Offers the typed query as a value; return null when the query is not a valid value. */
export type PickerCustom = (query: string) => PickerCustomOption | null;

interface PickerListProps {
  readonly options: readonly PickerOption[];
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly onPick: (value: string) => void;
  readonly isSelected: (value: string) => boolean;
  readonly custom?: PickerCustom;
  readonly searchPlaceholder: string;
}

const CUSTOM_KEY = '__custom';

/**
 * The searchable list inside a picker popover: cmdk with our own filter, grouped, capped; Enter picks the highlighted
 * option. The typed-value entry comes last, so Enter on a name search picks the best match, not the raw text.
 */
export function PickerList({ options, query, onQueryChange, onPick, isSelected, custom, searchPlaceholder }: PickerListProps) {
  const { matches, total } = filterPickerOptions(options, query);
  const trimmed = query.trim();
  const offered = custom === undefined || trimmed === '' ? null : custom(trimmed);
  // No custom entry for a value the list already has (`R33` for `r33`, `007` for id 7).
  const customOption =
    offered !== null && options.some((option) => option.value.toLowerCase() === offered.value.toLowerCase()) ? null : offered;
  const groups = groupPickerOptions(matches);

  return (
    <Command shouldFilter={false}>
      <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={onQueryChange} />
      <CommandList className="max-h-[min(20rem,50vh)]">
        <CommandEmpty>{options.length === 0 ? 'Game data not loaded: type a code or id.' : 'Nothing found.'}</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading === '' ? undefined : group.heading}>
            {group.options.map((option) => {
              const selected = isSelected(option.value);
              return (
                <CommandItem
                  key={option.key}
                  value={option.key}
                  onSelect={() => {
                    onPick(option.value);
                  }}
                >
                  <Check className={cn('size-4', selected ? 'opacity-100' : 'opacity-0')} aria-hidden />
                  <span className={cn('flex min-w-0 flex-1 items-baseline gap-2', option.muted === true && 'text-muted-foreground')}>
                    <span className="truncate">{option.label}</span>
                    {option.detail !== undefined && <span className="truncate text-xs text-muted-foreground">{option.detail}</span>}
                  </span>
                  {option.hint !== undefined && <span className="shrink-0 text-xs text-muted-foreground italic">{option.hint}</span>}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        {customOption !== null && (
          <CommandGroup>
            <CommandItem
              value={CUSTOM_KEY}
              onSelect={() => {
                onPick(customOption.value);
              }}
            >
              <Plus aria-hidden />
              <span className="truncate">{customOption.label}</span>
            </CommandItem>
          </CommandGroup>
        )}
        {total > matches.length && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Showing {matches.length} of {total}: type to narrow.
          </p>
        )}
      </CommandList>
    </Command>
  );
}
