import { CheckCircle2, CircleDashed, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { noteFreshness } from '../engine/freshness';

const AMBER = 'border-amber-500/40 text-amber-700 dark:text-amber-400';

/** "Checked on ESR x.y.z" / "Draft" / amber "outdated" pill for a note (see docs/features/GUIDE.md). */
export function FreshnessBadge({ verified, current }: { readonly verified: string | null; readonly current: string }) {
  const freshness = noteFreshness(verified, current);
  const base = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs';

  switch (freshness) {
    case 'fresh':
      return (
        <span className={cn(base, 'text-muted-foreground')}>
          <CheckCircle2 className="size-3" aria-hidden />
          Checked on ESR {verified}
        </span>
      );
    case 'draft':
      return (
        <span className={cn(base, 'border-dashed text-muted-foreground')}>
          <CircleDashed className="size-3" aria-hidden />
          Draft – not yet verified in-game
        </span>
      );
    case 'outdated':
      return (
        <span className={cn(base, AMBER)}>
          <AlertTriangle className="size-3" aria-hidden />
          Checked on ESR {verified} · now {current}, may have changed
        </span>
      );
    case 'old':
      return (
        <span className={cn(base, AMBER)}>
          <AlertTriangle className="size-3" aria-hidden />
          Written for ESR {verified}; may be out of date for {current}
        </span>
      );
  }
}

/** Tiny marker for note cards: nothing when fresh. */
export function FreshnessMarker({ verified, current }: { readonly verified: string | null; readonly current: string }) {
  const freshness = noteFreshness(verified, current);
  if (freshness === 'fresh') return null;
  const draft = freshness === 'draft';
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-1.5 text-[0.6875rem] leading-4',
        draft ? 'border-dashed text-muted-foreground' : AMBER
      )}
    >
      {draft ? 'draft' : 'outdated'}
    </span>
  );
}
