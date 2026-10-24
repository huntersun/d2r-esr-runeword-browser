import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { runewordsRedirectTarget } from './homeRedirect';

/** The `/` index route: old runewords links (`/?…`) redirect to `/runewords?…`, a bare `/` renders the home page. */
export function HomeRoute({ children }: { readonly children: ReactNode }) {
  const { search, hash } = useLocation();
  const target = runewordsRedirectTarget(search, hash);
  if (target !== null) return <Navigate to={target} replace />;
  return children;
}
