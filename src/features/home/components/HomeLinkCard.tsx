import type { ReactNode } from 'react';
import { ExternalLink } from '@/components/ExternalLink';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/guide/components/styles';

const LINK_ICON = 'ml-0.5 inline size-[0.9em] align-[-0.1em]';

interface HomeLinkCardProps {
  readonly label: string;
  readonly href: string;
  readonly description: string;
  /** Muted description (the compact official-link cards) instead of body text. */
  readonly mutedDescription?: boolean;
  /** A row under the title (author, badges). */
  readonly meta?: ReactNode;
  readonly caveat?: string;
  /** Adds a small "Source on GitHub" link. */
  readonly sourceUrl?: string;
}

/** One external-link card of the home page's Official ESR links and Community tools sections (an `<li>`). */
export function HomeLinkCard({ label, href, description, mutedDescription = false, meta, caveat, sourceUrl }: HomeLinkCardProps) {
  return (
    <li className={cn('rounded-lg border bg-background p-4', meta === undefined && caveat === undefined ? 'space-y-1' : 'space-y-1.5')}>
      <ExternalLink href={href} className={cn('text-sm font-medium text-primary hover:underline', FOCUS_RING)} iconClassName={LINK_ICON}>
        {label}
      </ExternalLink>
      {meta !== undefined && <div className="flex flex-wrap items-center gap-2">{meta}</div>}
      <p className={cn('text-sm', mutedDescription && 'text-muted-foreground')}>{description}</p>
      {caveat !== undefined && <p className="text-xs text-muted-foreground">{caveat}</p>}
      {sourceUrl !== undefined && (
        <ExternalLink
          href={sourceUrl}
          className={cn('inline-block text-xs text-muted-foreground hover:text-foreground hover:underline', FOCUS_RING)}
          iconClassName={LINK_ICON}
        >
          Source on GitHub
        </ExternalLink>
      )}
    </li>
  );
}
