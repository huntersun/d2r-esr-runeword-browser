import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';

const OPEN_DELAY = 300;
const CLOSE_DELAY = 150;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hover "peek" state for a controlled Radix Popover. Only mouse pointers and keyboard focus (:focus-visible) open it,
 * so a tap on a touch device simply activates the trigger (e.g. follows the link) without a popover trap.
 *
 * Keyboard: the content is portaled to the end of <body>, so Tab from the open trigger moves focus into the content's
 * first link (if any); the popover stays open while focus is inside it, and tabbing out of it returns focus to the
 * trigger (closing the popover) so the next Tab continues in reading order.
 */
export function useHoverPopover() {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

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

  const focusables = () => Array.from(contentRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

  const isInside = (target: EventTarget | null) =>
    target instanceof Node && (contentRef.current?.contains(target) === true || triggerRef.current?.contains(target) === true);

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
        triggerRef.current = event.currentTarget;
        if (event.currentTarget.matches(':focus-visible')) schedule(true, 0);
      },
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!isInside(event.relatedTarget)) schedule(false, CLOSE_DELAY);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        triggerRef.current = event.currentTarget;
        if (event.key !== 'Tab' || event.shiftKey || !open) return;
        const first = focusables().at(0);
        if (first === undefined) return;
        event.preventDefault();
        window.clearTimeout(timer.current);
        first.focus();
      },
    },
    contentProps: {
      ref: contentRef,
      onPointerEnter,
      onPointerLeave,
      onFocus: () => {
        window.clearTimeout(timer.current);
      },
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!isInside(event.relatedTarget)) schedule(false, CLOSE_DELAY);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Tab') return;
        const items = focusables();
        const leaving = event.shiftKey ? items.at(0) : items.at(-1);
        if (leaving === undefined || document.activeElement !== leaving) return;
        // Leave the portaled content: back to the trigger, so the next Tab continues after it in the text.
        event.preventDefault();
        window.clearTimeout(timer.current);
        setOpen(false);
        triggerRef.current?.focus();
      },
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

export type HoverPopover = ReturnType<typeof useHoverPopover>;
