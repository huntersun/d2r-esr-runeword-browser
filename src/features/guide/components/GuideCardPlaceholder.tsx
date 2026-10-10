import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';

/** The compact muted box an embedded item card shows instead of the card (loading, or not in the data). */
interface GuideCardNoticeProps {
  readonly children: ReactNode;
}

export function GuideCardNotice({ children }: GuideCardNoticeProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Loading state of an embedded item card: while its code chunk loads, and while the first data sync is still running. */
interface GuideCardLoadingProps {
  readonly name: string;
}

export function GuideCardLoading({ name }: GuideCardLoadingProps) {
  return (
    <GuideCardNotice>
      <Spinner className="size-4" />
      <span>Loading {name}…</span>
    </GuideCardNotice>
  );
}

/** The "In the app →" link of an embedded item card (to the item's exact-name view). */
interface GuideCardAppLinkProps {
  readonly href: string;
}

export function GuideCardAppLink({ href }: GuideCardAppLinkProps) {
  return (
    <Link to={href} className="font-medium text-primary underline-offset-2 hover:underline">
      In the app →
    </Link>
  );
}

/** Fallback when an embedded item card cannot be shown: the data sync failed, or the card's code failed to load. */
interface GuideCardFailedProps {
  readonly name: string;
  readonly href: string;
}

export function GuideCardFailed({ name, href }: GuideCardFailedProps) {
  return (
    <GuideCardNotice>
      <span>
        <span className="font-medium text-foreground">{name}</span> could not be loaded.
      </span>
      <GuideCardAppLink href={href} />
    </GuideCardNotice>
  );
}
