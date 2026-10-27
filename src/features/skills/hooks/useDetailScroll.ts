import { useEffect, useRef } from 'react';

/** Tailwind `lg`: the detail card sits next to the trees from here on */
const WIDE_QUERY = '(min-width: 1024px)';

/**
 * Below `lg` the skill detail card is under the trees: after a tap (`requestScroll`, then the selection changes) the
 * card (`ref`) is scrolled into view. Nothing happens on a wide screen or when the selection changes without a tap
 * (page load, a link).
 */
export function useDetailScroll(selected: string | null) {
  const ref = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  useEffect(() => {
    if (!pending.current || selected === null) return;
    pending.current = false;
    if (window.matchMedia(WIDE_QUERY).matches) return;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected]);
  const requestScroll = () => {
    pending.current = true;
  };
  return { ref, requestScroll };
}
