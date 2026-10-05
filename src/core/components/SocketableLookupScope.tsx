import type { ReactNode } from 'react';
import { SocketableLookupContext, useSocketableLookup, useSocketableLookupQuery } from '@/core/hooks/useSocketableLookup';

/**
 * Makes sure `children` have a socketable lookup: reuses the screen-level one
 * when present, otherwise loads one (e.g. a single card rendered on its own).
 */
export function SocketableLookupScope({ children }: { readonly children: ReactNode }) {
  const lookup = useSocketableLookup();
  if (lookup !== null) return children;
  return <OwnSocketableLookup>{children}</OwnSocketableLookup>;
}

function OwnSocketableLookup({ children }: { readonly children: ReactNode }) {
  const lookup = useSocketableLookupQuery();
  return <SocketableLookupContext value={lookup}>{children}</SocketableLookupContext>;
}
