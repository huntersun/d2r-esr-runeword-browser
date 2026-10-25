import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BASE_TIERS, BASE_TIER_LABELS } from '@/features/game-data/constants/bases';

/** Mythical uniques have their own page, so that tier never matches anything here */
const UNIQUE_TIERS = BASE_TIERS.filter((tier) => tier !== 'mythical');
import { selectTiers, setTiers, toggleTier } from '../store';

/** Base tier checkboxes (the Bases page tier filter); none checked = every tier, tierless bases included. */
export function TierFilter() {
  const dispatch = useDispatch();
  const tiers = useSelector(selectTiers);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" role="group" aria-label="Base tier">
      <span className="font-medium text-sm">Base tier:</span>
      {UNIQUE_TIERS.map((tier) => (
        <label key={tier} className="flex h-7 cursor-pointer items-center gap-1">
          <Checkbox checked={tiers.includes(tier)} onCheckedChange={() => dispatch(toggleTier(tier))} />
          <span className="text-sm">{BASE_TIER_LABELS[tier]}</span>
        </label>
      ))}
      {tiers.length > 0 && (
        <>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => dispatch(setTiers([]))}>
            Clear
          </Button>
          <span className="text-xs text-muted-foreground">Rings, amulets, charms and jewels have no tier and are hidden.</span>
        </>
      )}
    </div>
  );
}
