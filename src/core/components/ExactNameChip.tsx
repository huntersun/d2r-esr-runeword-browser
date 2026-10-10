import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** How long the chip keeps itself in view while the screen's layout settles */
const SETTLE_MS = 1500;
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

interface ExactNameChipProps {
  /** The exact-name focus (`?name=`) currently applied to the list */
  readonly name: string;
  readonly onClear: () => void;
  /** Scroll into view on mount: only when the focus was just set from the visit's URL */
  readonly scrollIntoView: boolean;
}

/**
 * Dismissible "Showing: <Name> ×" chip for the exact-name focus of a list screen, so the
 * filter is never invisible. Scrolls itself (and thus the matching cards right below it)
 * into view when it appears after a `?name=` deep link.
 */
export function ExactNameChip({ name, onClear, scrollIntoView }: ExactNameChipProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!scrollIntoView) return;
    const scroll = () => ref.current?.scrollIntoView({ block: 'center' });
    scroll();
    // The chip can mount before the filters above it finish rendering, which pushes it back out of view.
    // Re-centre while the page is still growing, until the viewer scrolls or the layout settles.
    const observer = new ResizeObserver(scroll);
    observer.observe(document.body);
    const stop = () => {
      observer.disconnect();
      clearTimeout(timer);
      for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, stop);
    };
    const timer = setTimeout(stop, SETTLE_MS);
    for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { passive: true });
    return stop;
  }, [name, scrollIntoView]);

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
