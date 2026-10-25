import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageHeader, type PageHeaderProps } from './PageHeader';

/**
 * Page widths. `wide` is the one width of every browser page (lists, Game Data, Builds, Loot filters, guide notes):
 * three result cards per row at 1280 px and no edge-to-edge stretch on large monitors. `narrow` is the reading
 * column of the guide spine.
 */
const PAGE_WIDTHS = {
  wide: 'max-w-7xl',
  narrow: 'max-w-2xl',
} as const;

export type PageWidth = keyof typeof PAGE_WIDTHS;

interface PageShellProps extends Partial<Omit<PageHeaderProps, 'className'>> {
  /** Omit the title to use the shell for its width only (e.g. a layout route whose children render their own header) */
  readonly title?: ReactNode;
  readonly width?: PageWidth;
  readonly className?: string;
  readonly children: ReactNode;
}

/** The frame of a page: one centred width plus the shared title row (see `PageHeader`). */
export function PageShell({ title, count, actions, meta, nav, width = 'wide', className, children }: PageShellProps) {
  return (
    <div className={cn('mx-auto w-full', PAGE_WIDTHS[width], className)}>
      {title !== undefined && <PageHeader title={title} count={count} actions={actions} meta={meta} nav={nav} />}
      {children}
    </div>
  );
}
