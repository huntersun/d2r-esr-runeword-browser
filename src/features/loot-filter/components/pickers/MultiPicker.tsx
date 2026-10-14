import { useRef, useState } from 'react';
import { ChevronsUpDown, Minus, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { bulkPick, type PickerOption } from '../../utils/pickerSearch';
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

/** Above this many values "Add all" / "Remove all" asks for a second click. */
const BULK_CONFIRM = 50;

const POPOVER_CLASS = 'w-[min(32rem,calc(100vw-2rem))] p-0';

/** Singular and plural noun, e.g. `['item', 'items']`. */
export type PickerNouns = readonly [string, string];

function countOf(count: number, [one, many]: PickerNouns): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

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
  /** Offers "Add all N" / "Remove all N" for every match of the search, naming the values with these nouns. */
  readonly bulkNouns?: PickerNouns;
  /** What the muted options are (skipped by "Add all"), e.g. `['shadow base', 'shadow bases']`. */
  readonly mutedNouns?: PickerNouns;
}

/**
 * The add button plus chips for the selected values; the button opens a searchable list (Popover + cmdk). Picking an
 * option toggles it; the popover stays open and keeps the search, so several can be added in a row. The button comes
 * first so the list does not move as chips are added, and the search, the highlighted option and the scroll position
 * survive closing and reopening.
 */
export function MultiPicker({
  id,
  options,
  values,
  onChange,
  describe,
  addLabel,
  searchPlaceholder,
  custom,
  bulkNouns,
  mutedNouns = ['muted option', 'muted options'],
}: MultiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('');
  /** The bulk action waiting for its confirming click (`bulkKey`), if any. */
  const [armed, setArmed] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const shownValues = expanded ? values : values.slice(0, COLLAPSED_CHIPS);
  const hiddenCount = values.length - shownValues.length;

  const bulk = bulkNouns === undefined ? null : bulkPick(options, query, values);
  const bulkKey = bulk === null ? '' : `${bulk.action}:${query}:${String(bulk.values.length)}`;
  const needsConfirm = bulk !== null && bulk.values.length > BULK_CONFIRM;

  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((current) => current !== value) : [...values, value]);
  };

  const applyBulk = () => {
    if (bulk === null) return;
    if (needsConfirm && armed !== bulkKey) {
      setArmed(bulkKey);
      return;
    }
    setArmed(null);
    if (bulk.action === 'add') {
      onChange([...values, ...bulk.values]);
    } else {
      const drop = new Set(bulk.values);
      onChange(values.filter((value) => !drop.has(value)));
    }
  };

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-1.5">
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            scrollTopRef.current = listRef.current?.scrollTop ?? 0;
            setArmed(null);
          }
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" data-focus-fallback>
            <Plus className="size-3.5" aria-hidden />
            {addLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          // A fixed height: the popover does not flip sides as the matches (and the footer) come and go.
          className={cn(POPOVER_CLASS, 'flex flex-col', options.length > 0 && 'h-[min(22rem,60vh)]')}
          align="start"
          onOpenAutoFocus={(event) => {
            // Focus the kept search with its text selected (typing replaces it) and scroll back to where the list was.
            event.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
            const restore = () => {
              if (listRef.current !== null) listRef.current.scrollTop = scrollTopRef.current;
            };
            restore();
            // cmdk scrolls its highlighted option into view after mounting; restore once more after that.
            requestAnimationFrame(restore);
          }}
          onInteractOutside={(event) => {
            // Removing a chip or showing more chips while the list is open keeps it open.
            if (event.target instanceof Node && containerRef.current?.contains(event.target) === true) event.preventDefault();
          }}
        >
          <PickerList
            options={options}
            query={query}
            onQueryChange={setQuery}
            onPick={toggle}
            isSelected={(value) => values.includes(value)}
            custom={custom}
            searchPlaceholder={searchPlaceholder}
            active={active}
            onActiveChange={setActive}
            inputRef={inputRef}
            listRef={listRef}
            className="min-h-0 flex-1"
            listClassName="max-h-none flex-1"
          />
          {bulk !== null && bulkNouns !== undefined && (
            <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-t px-2 py-1.5">
              <Button
                type="button"
                variant={needsConfirm && armed === bulkKey ? 'default' : 'secondary'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={applyBulk}
              >
                {bulk.action === 'add' ? <Plus className="size-3.5" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
                {needsConfirm && armed === bulkKey
                  ? `${bulk.action === 'add' ? 'Add' : 'Remove'} ${countOf(bulk.values.length, bulkNouns)}? Click again`
                  : `${bulk.action === 'add' ? 'Add' : 'Remove'} all ${countOf(bulk.values.length, bulkNouns)}`}
              </Button>
              {bulk.skipped > 0 && <span className="text-xs text-muted-foreground">{countOf(bulk.skipped, mutedNouns)} skipped</span>}
            </div>
          )}
        </PopoverContent>
      </Popover>
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
