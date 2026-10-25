import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BASE_TIER_LABELS, TIER_BADGE_CLASS, type BaseTier } from '../constants/bases';

/** The base tier badge of the Bases and Best Base cards, shared by the unique and set item cards. */
export function TierBadge({ tier, className }: { readonly tier: BaseTier; readonly className?: string }) {
  return (
    <Badge variant="outline" className={cn(TIER_BADGE_CLASS[tier], className)}>
      {BASE_TIER_LABELS[tier]}
    </Badge>
  );
}

/** One tier badge, or "Normal → Elite" (each label in its tier colour) when the tiers differ. */
export function TierRangeBadge({ from, to }: { readonly from: BaseTier; readonly to: BaseTier }) {
  if (from === to) return <TierBadge tier={from} />;
  return (
    <Badge variant="outline" className="text-muted-foreground" aria-label={`${BASE_TIER_LABELS[from]} to ${BASE_TIER_LABELS[to]}`}>
      <span className={TIER_BADGE_CLASS[from]}>{BASE_TIER_LABELS[from]}</span>
      <span aria-hidden="true">→</span>
      <span className={TIER_BADGE_CLASS[to]}>{BASE_TIER_LABELS[to]}</span>
    </Badge>
  );
}
