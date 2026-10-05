import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSocketableLookup } from '@/core/hooks/useSocketableLookup';
import { resolveRune } from '@/core/utils/socketableLookup';
import { RuneTooltip } from './RuneTooltip';

// Background colors for ESR tiers — same hue as tier text colors, dimmed to 70%
const ESR_TIER_BG_COLORS: Partial<Record<number, string>> = {
  1: 'bg-slate-600/40 dark:bg-slate-300/40', // WHITE
  2: 'bg-red-600/60 dark:bg-red-600/60', // RED
  3: 'bg-yellow-500/60 dark:bg-yellow-300/60', // YELLOW
  4: 'bg-orange-700/60 dark:bg-orange-500/60', // ORANGE
  5: 'bg-green-600/60 dark:bg-green-500/60', // GREEN
  6: 'bg-[#908858]/60 dark:bg-[#b8ae78]/60', // GOLD
  7: 'bg-purple-600/60 dark:bg-purple-500/60', // PURPLE
};

// Background colors for LoD and Kanji categories
const CATEGORY_BG_COLORS: Partial<Record<string, string>> = {
  lodRunes: 'bg-[#908858]/60 dark:bg-[#b8ae78]/60', // GOLD
  kanjiRunes: 'bg-blue-600/60 dark:bg-blue-500/60',
};

interface RuneBadgeProps {
  readonly runeName: string;
  /** Whether this rune belongs to a LoD runeword (affects lookup order for shared runes like Ko) */
  readonly isLod?: boolean;
}

export function RuneBadge({ runeName, isLod }: RuneBadgeProps) {
  // Strip " Rune" suffix for display
  const displayName = runeName.replace(' Rune', '');

  // Resolved from the screen-level lookup (LoD runewords check LoD first, see resolveRune)
  const lookup = useSocketableLookup();
  const rune = lookup ? resolveRune(lookup, runeName, isLod ?? false) : null;

  // Get background color class based on tier/category
  let bgColorClass = '';
  if (rune) {
    bgColorClass = (rune.category === 'esrRunes' ? ESR_TIER_BG_COLORS[rune.rune.tier] : CATEGORY_BG_COLORS[rune.category]) ?? '';
  }

  return (
    <RuneTooltip rune={rune}>
      <Badge asChild variant="outline" className={cn('cursor-pointer opacity-100 hover:opacity-75', bgColorClass)}>
        <button type="button">{displayName}</button>
      </Badge>
    </RuneTooltip>
  );
}
