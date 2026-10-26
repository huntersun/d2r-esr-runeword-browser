import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export interface BrowserTab<T extends string> {
  readonly value: T;
  readonly label: string;
  /** What the tab lists, for "No … match" ("bases", "set items"). */
  readonly noun: string;
}

interface BrowserTabsProps<T extends string> {
  readonly tabs: readonly BrowserTab<T>[];
  readonly tab: T;
  readonly onChange: (tab: T) => void;
  readonly idPrefix: string;
  /** The tab list's accessible name. */
  readonly label: string;
  /** Match counts per tab while searching. */
  readonly counts: Readonly<Record<T, number>> | null;
}

/**
 * A browser dialog's tab list (Bases | Misc, Uniques | Sets); arrow keys, Home and End move between the tabs. The
 * panel is `${idPrefix}-panel`, each tab `${idPrefix}-tab-${value}`.
 */
export function BrowserTabs<T extends string>({ tabs, tab, onChange, idPrefix, label, counts }: BrowserTabsProps<T>) {
  const select = (next: T) => {
    onChange(next);
    document.getElementById(`${idPrefix}-tab-${next}`)?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const index = tabs.findIndex((candidate) => candidate.value === tab);
    const target =
      event.key === 'ArrowRight'
        ? tabs[(index + 1) % tabs.length]
        : event.key === 'ArrowLeft'
          ? tabs[(index - 1 + tabs.length) % tabs.length]
          : event.key === 'Home'
            ? tabs[0]
            : event.key === 'End'
              ? tabs[tabs.length - 1]
              : undefined;
    if (target === undefined) return;
    event.preventDefault();
    select(target.value);
  };
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-md border bg-muted/40 p-0.5" onKeyDown={onKeyDown}>
      {tabs.map((option) => {
        const active = option.value === tab;
        return (
          <button
            key={option.value}
            id={`${idPrefix}-tab-${option.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            className={cn(
              'rounded-sm px-3 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => {
              onChange(option.value);
            }}
          >
            {option.label}
            {counts !== null && <span className="ml-1 tabular-nums">({counts[option.value]})</span>}
          </button>
        );
      })}
    </div>
  );
}
