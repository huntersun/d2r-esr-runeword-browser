import { useRef, useState } from 'react';
import { ChevronsUpDown, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PickerOption } from '../../utils/pickerSearch';
import { focusAfterRemoval } from './focusAfterRemoval';
import { PickerList, type PickerCustom } from './PickerList';

/** How a selected value is shown: on a chip (multi) or on the trigger button (single). */
export interface PickerValueLabel {
  readonly label: string;
  /** The code or id, shown greyed next to the label. */
  readonly detail?: string;
  /** Greyed out (a shadow base, an unknown code). */
  readonly muted?: boolean;
  /** Tooltip text. */
  readonly title?: string;
}

export type DescribeValue = (value: string) => PickerValueLabel;

/** Chips shown before "Show all" (a filter can list dozens of codes). */
const COLLAPSED_CHIPS = 12;

const POPOVER_CLASS = 'w-[min(32rem,calc(100vw-2rem))] p-0';

export interface MultiPickerProps {
  readonly id?: string;
  readonly options: readonly PickerOption[];
  readonly values: readonly string[];
  readonly onChange: (values: readonly string[]) => void;
  readonly describe: DescribeValue;
  /** Text of the add button, e.g. "Add item". */
  readonly addLabel: string;
  readonly searchPlaceholder: string;
  /** Offers typed text that is not in the list (codes and ids the game data does not know, or no data at all). */
  readonly custom?: PickerCustom;
}

/**
 * Chips for the selected values plus an add button that opens a searchable list (Popover + cmdk). Picking an
 * option toggles it; the popover stays open so several can be added in a row.
 */
export function MultiPicker({ id, options, values, onChange, describe, addLabel, searchPlaceholder, custom }: MultiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const shownValues = expanded ? values : values.slice(0, COLLAPSED_CHIPS);
  const hiddenCount = values.length - shownValues.length;

  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((current) => current !== value) : [...values, value]);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-1.5">
      {shownValues.map((value, index) => {
        const { label, detail, muted, title } = describe(value);
        return (
          <Badge
            // A file can list a value twice; the position keeps the keys unique.
            key={`${value}-${String(index)}`}
            variant="secondary"
            title={title}
            className={cn('max-w-full gap-1 py-0.5 pr-0.5 pl-2 font-normal', muted === true && 'opacity-70')}
          >
            <span className="truncate">{label}</span>
            {detail !== undefined && detail !== label && <span className="text-muted-foreground">{detail}</span>}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Remove ${label}`}
              data-remove
              onClick={() => {
                onChange(values.filter((_, position) => position !== index));
                focusAfterRemoval(containerRef.current, index);
              }}
            >
              <X className="size-3" aria-hidden />
            </button>
          </Badge>
        );
      })}
      {(hiddenCount > 0 || (expanded && values.length > COLLAPSED_CHIPS)) && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-7 px-1 text-xs"
          onClick={() => {
            setExpanded(!expanded);
          }}
        >
          {hiddenCount > 0 ? `+${String(hiddenCount)} more` : 'Show fewer'}
        </Button>
      )}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" data-focus-fallback>
            <Plus className="size-3.5" aria-hidden />
            {addLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={POPOVER_CLASS} align="start">
          <PickerList
            options={options}
            query={query}
            onQueryChange={setQuery}
            onPick={toggle}
            isSelected={(value) => values.includes(value)}
            custom={custom}
            searchPlaceholder={searchPlaceholder}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface SinglePickerProps {
  readonly id?: string;
  readonly options: readonly PickerOption[];
  readonly value: string | undefined;
  readonly onChange: (value: string) => void;
  readonly describe: DescribeValue;
  /** Trigger text when nothing is picked. */
  readonly placeholder: string;
  readonly searchPlaceholder: string;
  readonly custom?: PickerCustom;
  readonly className?: string;
  readonly 'aria-label'?: string;
  /** Radix's hook when the popover closes; `event.preventDefault()` keeps focus off the trigger. */
  readonly onCloseAutoFocus?: (event: Event) => void;
}

/** A combobox over the same searchable list: the trigger shows the value; picking closes the popover. */
export function SinglePicker({
  id,
  options,
  value,
  onChange,
  describe,
  placeholder,
  searchPlaceholder,
  custom,
  className,
  'aria-label': ariaLabel,
  onCloseAutoFocus,
}: SinglePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const shown = value === undefined || value === '' ? undefined : describe(value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          title={shown?.title}
          className={cn('h-8 justify-between gap-1 px-2 font-normal', className)}
        >
          {shown === undefined ? (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          ) : (
            <span className={cn('flex min-w-0 items-baseline gap-1.5', shown.muted === true && 'text-muted-foreground')}>
              <span className="truncate">{shown.label}</span>
              {shown.detail !== undefined && shown.detail !== shown.label && (
                <span className="shrink-0 text-xs text-muted-foreground">{shown.detail}</span>
              )}
            </span>
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={POPOVER_CLASS} align="start" onCloseAutoFocus={onCloseAutoFocus}>
        <PickerList
          options={options}
          query={query}
          onQueryChange={setQuery}
          onPick={(picked) => {
            onChange(picked);
            setOpen(false);
            setQuery('');
          }}
          isSelected={(candidate) => candidate === value}
          custom={custom}
          searchPlaceholder={searchPlaceholder}
        />
      </PopoverContent>
    </Popover>
  );
}
