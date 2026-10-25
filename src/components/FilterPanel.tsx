import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  /** Optional header text (e.g. "What can roll on a base?"); also names the region */
  readonly title?: ReactNode;
  /** Optional right-aligned header content (e.g. Copy link / Reset) */
  readonly actions?: ReactNode;
  /** Accessible name when there is no title (default "Filters") */
  readonly label?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * The card surface around a page's filter controls (the home page's card look), always open, also on phones.
 * Children are stacked with `space-y-4`.
 */
export function FilterPanel({ title, actions, label = 'Filters', className, children }: FilterPanelProps) {
  const titleId = useId();
  const hasHeader = title !== undefined || actions !== undefined;

  return (
    <section
      aria-label={title === undefined ? label : undefined}
      aria-labelledby={title === undefined ? undefined : titleId}
      className={cn('mb-6 space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6', className)}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title !== undefined && (
            <h2 id={titleId} className="text-sm font-semibold">
              {title}
            </h2>
          )}
          {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
