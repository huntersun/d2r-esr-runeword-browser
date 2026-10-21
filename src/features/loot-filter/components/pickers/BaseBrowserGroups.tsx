import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BASE_TIER_LABELS, TIER_BADGE_CLASS } from '@/features/game-data/constants/bases';
import { cn } from '@/lib/utils';
import {
  groupCodes,
  triState,
  typeCodes,
  type BaseTier,
  type BrowserColumn,
  type BrowserGroup,
  type BrowserItem,
  type BrowserType,
  type TriState,
} from '../../utils/browserModel';

/** Adds (`on`) or removes the codes from the draft. */
export type ToggleCodes = (codes: readonly string[], on: boolean) => void;

interface SelectionProps {
  readonly selected: ReadonlySet<string>;
  readonly onToggle: ToggleCodes;
}

export function TierBadge({ tier, className }: { readonly tier: BaseTier; readonly className?: string }) {
  return (
    <Badge variant="outline" className={cn('px-1.5 py-0 text-[11px]', TIER_BADGE_CLASS[tier], className)}>
      {BASE_TIER_LABELS[tier]}
    </Badge>
  );
}

/** A column's badge: the tier badge for base tiers, else a plain label. */
export function ColumnBadge({ column, className }: { readonly column: BrowserColumn; readonly className?: string }) {
  if (column.tier !== undefined) return <TierBadge tier={column.tier} className={className} />;
  return (
    <Badge variant="outline" className={cn('px-1.5 py-0 text-[11px] text-muted-foreground', className)}>
      {column.label}
    </Badge>
  );
}

interface TriCheckboxProps {
  readonly state: TriState;
  /** Called with true to select every code (from "none" or "some"), false to clear them. */
  readonly onChange: (on: boolean) => void;
  readonly disabled?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

/** A native checkbox with a label; "some" shows as indeterminate (announced as mixed). */
export function TriCheckbox({ state, onChange, disabled, children, className }: TriCheckboxProps) {
  return (
    <label className={cn('inline-flex items-center gap-2', disabled === true ? 'opacity-50' : 'cursor-pointer', className)}>
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-primary"
        checked={state === 'all'}
        ref={(element) => {
          if (element !== null) element.indeterminate = state === 'some';
        }}
        disabled={disabled}
        onChange={() => {
          onChange(state !== 'all');
        }}
      />
      {children}
    </label>
  );
}

function SelectedCount({ codes, selected }: { readonly codes: readonly string[]; readonly selected: ReadonlySet<string> }) {
  const count = codes.filter((code) => selected.has(code)).length;
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {count}/{codes.length}
    </span>
  );
}

// Static class names per column count (Tailwind only sees literal class names).
const MD_GRID_COLS: Readonly<Record<number, string>> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const mdGridCols = (count: number) => MD_GRID_COLS[count] ?? 'md:grid-cols-6';

/** The cell grid of a list: four columns on wide screens when the cells have no stats line. */
function listGridClass(items: readonly BrowserItem[]) {
  return cn(
    'grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 md:gap-2',
    items.every((item) => (item.stats ?? '') === '') && 'lg:grid-cols-4'
  );
}

interface ItemCellProps {
  readonly item: BrowserItem;
  readonly selected: boolean;
  readonly onToggle: ToggleCodes;
  /** The column badge, with classes; without it the cell has no badge. */
  readonly badge?: { readonly column: BrowserColumn; readonly className: string };
}

function ItemCell({ item, selected, onToggle, badge }: ItemCellProps) {
  return (
    <label
      title={item.sockets === undefined ? undefined : `Sockets: ${item.sockets}`}
      className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 hover:bg-accent/50 has-checked:border-primary/50 has-checked:bg-primary/5"
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-primary"
        checked={selected}
        onChange={() => {
          onToggle([item.code], !selected);
        }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-sm font-medium break-words">{item.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
          {badge !== undefined && <ColumnBadge column={badge.column} className={badge.className} />}
        </span>
        {item.stats !== undefined && item.stats !== '' && <span className="block text-xs text-muted-foreground">{item.stats}</span>}
      </span>
    </label>
  );
}

function ColumnGrid({ type, selected, onToggle }: SelectionProps & { readonly type: BrowserType }) {
  const cols = mdGridCols(type.columns.length);
  const extrasCodes = type.extrasColumn === null ? [] : typeCodes(type, type.extrasColumn.key);
  return (
    <>
      <div className={cn('flex flex-wrap gap-x-4 gap-y-1 md:grid md:gap-2', cols)}>
        {type.columns.map((column) => {
          const codes = typeCodes(type, column.key);
          return (
            <TriCheckbox
              key={column.key}
              state={triState(codes, selected)}
              disabled={codes.length === 0}
              onChange={(on) => {
                onToggle(codes, on);
              }}
            >
              <ColumnBadge column={column} />
              <SelectedCount codes={codes} selected={selected} />
            </TriCheckbox>
          );
        })}
      </div>
      {type.rows.length > 0 && (
        <div className="space-y-3 md:space-y-2">
          {type.rows.map((row) => (
            <div key={row.key} className={cn('grid grid-cols-1 gap-1 md:gap-2', cols)}>
              {type.columns.map((column, index) => {
                const cell = row.cells[index] ?? null;
                if (cell === null) return <div key={column.key} className="hidden md:block" />;
                return (
                  <ItemCell
                    key={column.key}
                    item={cell}
                    selected={selected.has(cell.code)}
                    onToggle={onToggle}
                    badge={{ column, className: 'md:hidden' }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
      {type.extras.length > 0 && (
        <div className="space-y-2">
          {type.extrasColumn !== null && (
            <TriCheckbox
              state={triState(extrasCodes, selected)}
              onChange={(on) => {
                onToggle(extrasCodes, on);
              }}
            >
              <ColumnBadge column={type.extrasColumn} />
              <SelectedCount codes={extrasCodes} selected={selected} />
            </TriCheckbox>
          )}
          <div className={type.extrasColumn === null ? listGridClass(type.extras) : 'grid grid-cols-1 gap-1 md:grid-cols-3 md:gap-2'}>
            {type.extras.map((item) => (
              <ItemCell key={item.code} item={item} selected={selected.has(item.code)} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** A list cell shows the column badge of a base outside the normal tier (Mythical rings…). */
function listBadge(item: BrowserItem): ItemCellProps['badge'] {
  return item.column?.tier !== undefined && item.column.tier !== 'normal' ? { column: item.column, className: '' } : undefined;
}

function TypeBlock({ type, selected, onToggle }: SelectionProps & { readonly type: BrowserType }) {
  const codes = typeCodes(type);
  return (
    <section className="space-y-2" aria-label={type.name}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <TriCheckbox
          state={triState(codes, selected)}
          onChange={(on) => {
            onToggle(codes, on);
          }}
        >
          <span className="font-medium">{type.name}</span>
        </TriCheckbox>
        <span className="font-mono text-xs text-muted-foreground">{type.code}</span>
        <SelectedCount codes={codes} selected={selected} />
      </div>
      {type.layout === 'grid' ? (
        <ColumnGrid type={type} selected={selected} onToggle={onToggle} />
      ) : (
        <div className={listGridClass(type.items)}>
          {type.items.map((item) => (
            <ItemCell key={item.code} item={item} selected={selected.has(item.code)} onToggle={onToggle} badge={listBadge(item)} />
          ))}
        </div>
      )}
    </section>
  );
}

/** A type group (Weapons, Armor, Gems…): collapsible, with a checkbox for all its (shown) items. */
export function BrowserGroupSection({ group, selected, onToggle }: SelectionProps & { readonly group: BrowserGroup }) {
  const [open, setOpen] = useState(true);
  const contentId = useId();
  const codes = groupCodes(group);
  return (
    <section className="rounded-lg border" aria-label={group.label}>
      <div className="flex items-center gap-2 rounded-t-lg bg-muted/40 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${group.label}`}
          onClick={() => {
            setOpen(!open);
          }}
        >
          <ChevronDown className={cn('size-4 transition-transform', !open && '-rotate-90')} aria-hidden />
        </Button>
        <TriCheckbox
          state={triState(codes, selected)}
          onChange={(on) => {
            onToggle(codes, on);
          }}
        >
          <span className="font-semibold">{group.label}</span>
        </TriCheckbox>
        <SelectedCount codes={codes} selected={selected} />
      </div>
      {open && (
        <div id={contentId} className="space-y-5 p-3">
          {group.types.map((type) => (
            <TypeBlock key={type.code} type={type} selected={selected} onToggle={onToggle} />
          ))}
        </div>
      )}
    </section>
  );
}
