import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisitedMarkProps {
  /** Icon size, e.g. `size-3` */
  readonly className?: string;
}

/** The ✓ (plus screen-reader text) after a note the viewer has already read. */
export function VisitedMark({ className }: VisitedMarkProps) {
  return (
    <>
      <Check className={cn('shrink-0 text-muted-foreground', className)} aria-hidden />
      <span className="sr-only"> (read)</span>
    </>
  );
}
