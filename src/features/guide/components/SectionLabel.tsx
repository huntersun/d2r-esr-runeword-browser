import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionLabelProps {
  readonly as?: 'h2' | 'p' | 'span';
  readonly id?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Small uppercase muted label above a guide section or data block ("KNOW FIRST", "CONNECTIONS", block captions). */
export function SectionLabel({ as: Tag = 'h2', id, className, children }: SectionLabelProps) {
  return (
    <Tag id={id} className={cn('text-xs font-semibold tracking-wide text-muted-foreground uppercase', className)}>
      {children}
    </Tag>
  );
}
