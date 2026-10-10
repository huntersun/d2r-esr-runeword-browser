import type { ReactNode } from 'react';
import { Spinner } from '@/components/ui/spinner';

/** The compact muted box an embedded item card shows instead of the card (loading, or not in the data). */
export function GuideCardNotice({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Loading state of an embedded item card: while its code chunk loads, and while the first data sync is still running. */
export function GuideCardLoading({ name }: { readonly name: string }) {
  return (
    <GuideCardNotice>
      <Spinner className="size-4" />
      <span>Loading {name}…</span>
    </GuideCardNotice>
  );
}
