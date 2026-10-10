import type { ReactNode } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { HoverPopover } from '../hooks/useHoverPopover';
import { GUIDE_PROSE_FONT } from './styles';

interface PeekPopoverProps {
  /** State from useHoverPopover; the trigger spreads `peek.triggerProps` itself */
  readonly peek: HoverPopover;
  /** The anchor element (rendered with asChild) */
  readonly trigger: ReactNode;
  /** False when there is nothing to show: the popover then never opens */
  readonly enabled?: boolean;
  readonly children: ReactNode;
}

/** The hover/focus "peek" above a note link, glossary term or graph node. */
export function PeekPopover({ peek, trigger, enabled = true, children }: PeekPopoverProps) {
  return (
    <Popover open={peek.open && enabled} onOpenChange={peek.setOpen}>
      <PopoverAnchor asChild>{trigger}</PopoverAnchor>
      {enabled && (
        <PopoverContent side="top" className={cn('w-72 p-3 text-sm', GUIDE_PROSE_FONT)} {...peek.contentProps}>
          {children}
        </PopoverContent>
      )}
    </Popover>
  );
}

interface PeekTextProps {
  readonly title: string;
  readonly text: string;
}

/** Title and muted text of a peek (a note's title + summary, a term + definition). */
export function PeekText({ title, text }: PeekTextProps) {
  return (
    <>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{text}</p>
    </>
  );
}
