import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react';

const OPEN_DELAY = 300;
const CLOSE_DELAY = 150;

/**
 * Hover "peek" state for a controlled Radix Popover. Only mouse pointers and keyboard focus (:focus-visible) open it,
 * so a tap on a touch device simply activates the trigger (e.g. follows the link) without a popover trap.
 */
export function useHoverPopover() {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    []
  );

  const schedule = (next: boolean, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOpen(next);
    }, delay);
  };

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') schedule(true, OPEN_DELAY);
  };
  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') schedule(false, CLOSE_DELAY);
  };

  return {
    open,
    setOpen: (next: boolean) => {
      window.clearTimeout(timer.current);
      setOpen(next);
    },
    triggerProps: {
      onPointerEnter,
      onPointerLeave,
      onFocus: (event: FocusEvent<HTMLElement>) => {
        if (event.currentTarget.matches(':focus-visible')) schedule(true, 0);
      },
      onBlur: () => {
        schedule(false, CLOSE_DELAY);
      },
    },
    contentProps: {
      onPointerEnter,
      onPointerLeave,
      // Keep focus on the trigger: the peek is supplementary, not a dialog.
      onOpenAutoFocus: (event: Event) => {
        event.preventDefault();
      },
      onCloseAutoFocus: (event: Event) => {
        event.preventDefault();
      },
    },
  };
}
