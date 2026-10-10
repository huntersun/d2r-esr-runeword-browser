import { CircleDot, Crown, Database, Gem, ScrollText, Sparkles, TrendingUp, Users } from 'lucide-react';

/** Icon for an in-app link by its target section (runewords, the home page, is the fallback). */
export function AppLinkIcon({ href, className }: { readonly href: string; readonly className?: string }) {
  if (href.startsWith('/game-data')) return <Database className={className} aria-hidden />;
  if (href.startsWith('/gemwords')) return <Gem className={className} aria-hidden />;
  if (href.startsWith('/socketables')) return <CircleDot className={className} aria-hidden />;
  if (href.startsWith('/uniques')) return <Crown className={className} aria-hidden />;
  if (href.startsWith('/mythicals')) return <Sparkles className={className} aria-hidden />;
  if (href.startsWith('/ascendancies')) return <TrendingUp className={className} aria-hidden />;
  if (href.startsWith('/build') || href.startsWith('/user')) return <Users className={className} aria-hidden />;
  return <ScrollText className={className} aria-hidden />;
}
