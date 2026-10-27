import type { SkillDetail } from '@/features/game-data/engine/schema';
import { Pills } from '@/features/game-data/components/EnhanceParts';
import { cn } from '@/lib/utils';
import type { SkillClassView, SkillTileMark } from '../utils/skills';
import type { SkillTileDecoration } from './SkillTile';
import { SkillTreeTab } from './SkillTreeTab';

interface SkillClassTreesProps {
  readonly cls: SkillClassView;
  /** The tab (page 1..3) shown below `lg`, where the tabs come one at a time like in game */
  readonly tab: number;
  readonly onTabChange: (tab: number) => void;
  readonly markOf: (id: string) => SkillTileMark;
  readonly onSelect: (id: string) => void;
  /** Points per tab in tab order (the builds pages): shown in the card titles and the tab pills when above 0 */
  readonly tabCounts?: readonly number[];
  /** Per-tile badge / dimming (the builds pages' point counts) */
  readonly tileProps?: (skill: SkillDetail) => SkillTileDecoration;
}

/** The three tabs of a class: side by side from `lg`, one at a time behind tab pills below that. */
export function SkillClassTrees({ cls, tab, onTabChange, markOf, onSelect, tabCounts, tileProps }: SkillClassTreesProps) {
  const countOf = (index: number): number | undefined => {
    const count = tabCounts?.[index];
    return count !== undefined && count > 0 ? count : undefined;
  };
  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <Pills
          label="Skill tab"
          options={cls.tabs.map((entry, index) => ({ value: String(entry.page), label: entry.name, count: countOf(index) }))}
          value={String(tab)}
          onChange={(value) => {
            onTabChange(Number(value));
          }}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {cls.tabs.map((entry, index) => (
          <SkillTreeTab
            key={entry.page}
            tab={entry}
            count={countOf(index)}
            markOf={markOf}
            onSelect={onSelect}
            tileProps={tileProps}
            className={cn(entry.page !== tab && 'hidden lg:block')}
          />
        ))}
      </div>
    </div>
  );
}
