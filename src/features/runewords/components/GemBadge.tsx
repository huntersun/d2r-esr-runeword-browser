import { useLiveQuery } from 'dexie-react-hooks';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { db } from '@/core/db';
import { GemTooltip } from './GemTooltip';

const GEM_BG_COLORS: Record<string, string> = {
  RED: 'bg-red-600/30 dark:bg-red-600/30',
  PURPLE: 'bg-purple-600/30 dark:bg-purple-500/30',
  YELLOW: 'bg-yellow-400/30 dark:bg-yellow-200/30',
  ORANGE: 'bg-orange-700/30 dark:bg-orange-500/30',
  GREEN: 'bg-green-600/30 dark:bg-green-500/30',
  GOLD: 'bg-[#908858]/30 dark:bg-[#b8ae78]/30',
  WHITE: 'bg-slate-600/20 dark:bg-slate-300/20',
  BLUE: 'bg-blue-600/30 dark:bg-blue-500/30',
};

interface GemBadgeProps {
  readonly gemName: string;
}

export function GemBadge({ gemName }: GemBadgeProps) {
  const gem = useLiveQuery(() => db.gems.get(gemName), [gemName]);

  const bgColorClass = gem ? (GEM_BG_COLORS[gem.color] ?? '') : '';

  return (
    <GemTooltip gemName={gemName}>
      <Badge variant="outline" className={cn('cursor-pointer opacity-100 hover:opacity-75', bgColorClass)}>
        {gemName}
      </Badge>
    </GemTooltip>
  );
}
