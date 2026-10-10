import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ExactNameChipProps {
  /** The exact-name focus (`?name=`) currently applied to the list */
  readonly name: string;
  readonly onClear: () => void;
}

/**
 * Dismissible "Showing: <Name> ×" chip for the exact-name focus of a list screen, so the
 * filter is never invisible. Scrolls itself (and thus the matching cards right below it)
 * into view when it appears.
 */
export function ExactNameChip({ name, onClear }: ExactNameChipProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center' });
  }, [name]);

  return (
    <span
      ref={ref}
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/15 py-0.5 pl-3 pr-1 text-sm"
    >
      <span className="text-muted-foreground">Showing:</span>
      <span className="font-medium">{name}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full hover:bg-amber-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Clear "${name}" filter and show all`}
        title="Show all"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}
