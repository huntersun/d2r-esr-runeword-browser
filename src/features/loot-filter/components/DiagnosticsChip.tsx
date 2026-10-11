import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Diagnostic } from '../engine/types';
import { countDiagnostics } from '../store/selectors';

interface DiagnosticsChipProps {
  readonly diagnostics: readonly Diagnostic[];
  readonly onClick: () => void;
}

const plural = (count: number, word: string) => `${String(count)} ${word}${count === 1 ? '' : 's'}`;

/** "N errors / M warnings"; clicking it shows the full list (JSON tab). */
export function DiagnosticsChip({ diagnostics, onClick }: DiagnosticsChipProps) {
  const { errors, warnings } = countDiagnostics(diagnostics);
  const clean = errors === 0 && warnings === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      title="Show the problems list"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent',
        errors > 0
          ? 'border-destructive/50 text-destructive'
          : warnings > 0
            ? 'border-amber-500/50 text-amber-700 dark:text-amber-400'
            : 'text-muted-foreground'
      )}
    >
      {clean ? (
        <>
          <CircleCheck className="size-3.5" aria-hidden />
          No problems
        </>
      ) : (
        <>
          {errors > 0 && (
            <span className="inline-flex items-center gap-1">
              <CircleAlert className="size-3.5" aria-hidden />
              {plural(errors, 'error')}
            </span>
          )}
          {warnings > 0 && (
            <span className="inline-flex items-center gap-1">
              <TriangleAlert className="size-3.5" aria-hidden />
              {plural(warnings, 'warning')}
            </span>
          )}
        </>
      )}
    </button>
  );
}
