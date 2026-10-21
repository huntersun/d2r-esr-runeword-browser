import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BASE_TIER_LABELS, TIER_BADGE_CLASS } from '@/features/game-data/constants/bases';
import { cn } from '@/lib/utils';
import {
  groupCodes,
  TIER_COLUMNS,
  triState,
  typeCodes,
  type BaseTier,
  type BrowserBase,
  type BrowserGroup,
  type BrowserType,
  type TriState,
} from '../../utils/baseBrowser';

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

interface BaseCellProps {
  readonly base: BrowserBase;
  readonly selected: boolean;
  readonly onToggle: ToggleCodes;
  /** Classes for the tier badge; without it the cell has no badge. */
  readonly badgeClassName?: string;
}

function BaseCell({ base, selected, onToggle, badgeClassName }: BaseCellProps) {
  return (
    <label
      title={`Sockets: ${base.sockets}`}
      className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 hover:bg-accent/50 has-checked:border-primary/50 has-checked:bg-primary/5"
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-primary"
        checked={selected}
        onChange={() => {
          onToggle([base.code], !selected);
        }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-sm font-medium break-words">{base.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{base.code}</span>
          {badgeClassName !== undefined && <TierBadge tier={base.tier} className={badgeClassName} />}
        </span>
        <span className="block text-xs text-muted-foreground">{base.stats}</span>
      </span>
    </label>
  );
}

function TierGrid({ type, selected, onToggle }: SelectionProps & { readonly type: BrowserType }) {
  return (
    <>
      <div className="flex flex-wrap gap-x-4 gap-y-1 md:grid md:grid-cols-3 md:gap-2">
        {TIER_COLUMNS.map((tier) => {
          const codes = typeCodes(type, tier);
          return (
            <TriCheckbox
              key={tier}
              state={triState(codes, selected)}
              disabled={codes.length === 0}
              onChange={(on) => {
                onToggle(codes, on);
              }}
            >
              <TierBadge tier={tier} />
              <SelectedCount codes={codes} selected={selected} />
            </TriCheckbox>
          );
        })}
      </div>
      <div className="space-y-3 md:space-y-2">
        {type.rows.map((row) => (
          <div key={row.key} className="grid grid-cols-1 gap-1 md:grid-cols-3 md:gap-2">
            {TIER_COLUMNS.map((tier) => {
              const cell = row.cells[tier];
              if (cell === null) return <div key={tier} className="hidden md:block" />;
              return <BaseCell key={tier} base={cell} selected={selected.has(cell.code)} onToggle={onToggle} badgeClassName="md:hidden" />;
            })}
          </div>
        ))}
      </div>
      {type.mythical.length > 0 && (
        <div className="space-y-2">
          <TriCheckbox
            state={triState(typeCodes(type, 'mythical'), selected)}
            onChange={(on) => {
              onToggle(typeCodes(type, 'mythical'), on);
            }}
          >
            <TierBadge tier="mythical" />
            <SelectedCount codes={typeCodes(type, 'mythical')} selected={selected} />
          </TriCheckbox>
          <div className="grid grid-cols-1 gap-1 md:grid-cols-3 md:gap-2">
            {type.mythical.map((base) => (
              <BaseCell key={base.code} base={base} selected={selected.has(base.code)} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}
    </>
  );
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
      {type.layout === 'tiers' ? (
        <TierGrid type={type} selected={selected} onToggle={onToggle} />
      ) : (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 md:gap-2">
          {type.items.map((base) => (
            <BaseCell
              key={base.code}
              base={base}
              selected={selected.has(base.code)}
              onToggle={onToggle}
              badgeClassName={base.tier === 'normal' ? undefined : ''}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** A type group (Weapons, Armor…): collapsible, with a checkbox for all its (shown) bases. */
export function BaseGroupSection({ group, selected, onToggle }: SelectionProps & { readonly group: BrowserGroup }) {
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
