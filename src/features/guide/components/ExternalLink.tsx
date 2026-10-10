import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface ExternalLinkProps {
  readonly href: string;
  readonly className?: string;
  readonly iconClassName?: string;
  readonly children: ReactNode;
}

/** A link that opens in a new tab, with a ↗ icon and a screen-reader hint. */
export function ExternalLink({ href, className, iconClassName, children }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
      <ArrowUpRight className={iconClassName} aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
