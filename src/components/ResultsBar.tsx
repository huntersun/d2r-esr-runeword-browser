import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResultsBarProps {
  /** The "Showing N …" text */
  readonly summary: ReactNode;
  /** Shown right after the summary, e.g. the ExactNameChip */
  readonly chips?: ReactNode;
  /** Right-aligned list controls, e.g. the "Favorites only" toggle */
  readonly actions?: ReactNode;
  readonly className?: string;
}

/** The line between a page's filters and its results: "Showing N …", the active-focus chips and list toggles. */
export function ResultsBar({ summary, chips, actions, className }: ResultsBarProps) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">{summary}</p>
        {chips}
      </div>
      {actions}
    </div>
  );
}
