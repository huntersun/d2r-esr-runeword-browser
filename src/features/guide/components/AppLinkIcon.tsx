import { CircleDot, Crown, Database, Gem, ScrollText, Sparkles, TrendingUp, Users } from 'lucide-react';
import { NAME_FOCUS_PAGES } from '../engine/linkSchemes';

interface AppLinkIconProps {
  readonly href: string;
  readonly className?: string;
}

/** Icon for an in-app link by its target section (runewords, the home page, is the fallback). */
export function AppLinkIcon({ href, className }: AppLinkIconProps) {
  if (href.startsWith('/game-data')) return <Database className={className} aria-hidden />;
  if (href.startsWith(NAME_FOCUS_PAGES.gw)) return <Gem className={className} aria-hidden />;
  if (href.startsWith(NAME_FOCUS_PAGES.socketable)) return <CircleDot className={className} aria-hidden />;
  if (href.startsWith(NAME_FOCUS_PAGES.unique)) return <Crown className={className} aria-hidden />;
  if (href.startsWith(NAME_FOCUS_PAGES.mythical)) return <Sparkles className={className} aria-hidden />;
  if (href.startsWith('/ascendancies')) return <TrendingUp className={className} aria-hidden />;
  if (href.startsWith('/build') || href.startsWith('/user')) return <Users className={className} aria-hidden />;
  return <ScrollText className={className} aria-hidden />;
}
