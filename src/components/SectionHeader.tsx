import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  readonly title: string;
  readonly icon?: LucideIcon;
  /** Optional muted count after the title (e.g. the number of items in the section) */
  readonly count?: ReactNode;
  /** Id of the heading, for `aria-labelledby` on the section */
  readonly id?: string;
  /** Optional right-aligned content (e.g. an action button or badge). */
  readonly action?: ReactNode;
  readonly className?: string;
}

/** A consistent section heading inside a page: optional icon + title (+ count) with a hairline rule below. */
export function SectionHeader({ title, icon: Icon, count, id, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-2 border-b pb-2', className)}>
      <h2 id={id} className="flex items-baseline gap-2 text-lg font-semibold">
        {Icon && <Icon className="size-5 self-center text-muted-foreground" aria-hidden />}
        <span>{title}</span>
        {count !== undefined && <span className="text-sm font-normal text-muted-foreground">{count}</span>}
      </h2>
      {action}
    </div>
  );
}
