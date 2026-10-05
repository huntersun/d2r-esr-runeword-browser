import { useLiveQuery } from 'dexie-react-hooks';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { db } from '@/core/db';
import type { Gem } from '@/core/db/models';
import { useSocketableLookup } from '@/core/hooks/useSocketableLookup';
import { GemTooltip } from './GemTooltip';
import { GEM_BG_COLORS } from '../constants/gemColors';

interface GemBadgeProps {
  readonly gemName: string;
}

export function GemBadge({ gemName }: GemBadgeProps) {
  const lookup = useSocketableLookup();
  // Without a screen-level lookup (e.g. a card rendered on its own), query the gem directly
  if (lookup === null) return <StandaloneGemBadge gemName={gemName} />;
  return <GemBadgeView gemName={gemName} gem={lookup?.gems.get(gemName)} />;
}

function StandaloneGemBadge({ gemName }: GemBadgeProps) {
  const gem = useLiveQuery(() => db.gems.get(gemName), [gemName]);
  return <GemBadgeView gemName={gemName} gem={gem} />;
}

function GemBadgeView({ gemName, gem }: { readonly gemName: string; readonly gem: Gem | undefined }) {
  const bgColorClass = gem ? (GEM_BG_COLORS[gem.color] ?? '') : '';

  return (
    <GemTooltip gem={gem}>
      <Badge asChild variant="outline" className={cn('cursor-pointer opacity-100 hover:opacity-75', bgColorClass)}>
        <button type="button">{gemName}</button>
      </Badge>
    </GemTooltip>
  );
}
