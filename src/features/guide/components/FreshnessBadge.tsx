import { CheckCircle2, CircleDashed, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { noteFreshness, type NoteFreshness } from '../engine/freshness';

const AMBER = 'border-amber-500/40 text-amber-700 dark:text-amber-400';
const BASE = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs';

const NO_REASONS: readonly string[] = [];

interface FreshnessBadgeProps {
  readonly verified: string | null;
  readonly current: string;
  /** GuideNote.staleReasons (build-time); only shown for the review state */
  readonly reasons?: readonly string[];
}

/** "Checked on ESR x.y.z" / "Draft" / amber "needs review" (reasons in a popover) / amber "old" pill (see docs/features/GUIDE.md). */
export function FreshnessBadge({ verified, current, reasons = NO_REASONS }: FreshnessBadgeProps) {
  const freshness = noteFreshness(verified, current, reasons);

  switch (freshness) {
    case 'fresh':
      return (
        <span className={cn(BASE, 'text-muted-foreground')}>
          <CheckCircle2 className="size-3" aria-hidden />
          Checked on ESR {verified}
        </span>
      );
    case 'draft':
      return (
        <span className={cn(BASE, 'border-dashed text-muted-foreground')}>
          <CircleDashed className="size-3" aria-hidden />
          Draft – not yet verified in-game
        </span>
      );
    case 'review':
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={cn(BASE, AMBER, 'cursor-pointer hover:bg-amber-500/10')}>
              <AlertTriangle className="size-3" aria-hidden />
              Checked on ESR {verified} · needs review
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <h4 className="font-medium">What changed since ESR {verified}</h4>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">The text may still be right; it has not been re-checked on ESR {current}.</p>
            </div>
          </PopoverContent>
        </Popover>
      );
    case 'old':
      return (
        <span className={cn(BASE, AMBER)}>
          <AlertTriangle className="size-3" aria-hidden />
          Written for ESR {verified}; may be out of date for {current}
        </span>
      );
  }
}

const MARKER_LABEL: Record<Exclude<NoteFreshness, 'fresh'>, string> = { draft: 'draft', review: 'review', old: 'old' };

/** Tiny marker for note cards: nothing when fresh. */
export function FreshnessMarker({ verified, current, reasons = NO_REASONS }: FreshnessBadgeProps) {
  const freshness = noteFreshness(verified, current, reasons);
  if (freshness === 'fresh') return null;
  const draft = freshness === 'draft';
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-1.5 text-[0.6875rem] leading-4',
        draft ? 'border-dashed text-muted-foreground' : AMBER
      )}
      title={freshness === 'review' ? reasons.join('\n') : undefined}
    >
      {MARKER_LABEL[freshness]}
    </span>
  );
}
