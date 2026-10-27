import type { SkillDetail } from '@/features/game-data/engine/schema';
import { cn } from '@/lib/utils';
import { SKILL_COLUMNS, SKILL_ROWS, type SkillTabView, type SkillTileMark } from '../utils/skills';
import { SkillTile, type SkillTileDecoration } from './SkillTile';

interface SkillTreeTabProps {
  readonly tab: SkillTabView;
  readonly markOf: (id: string) => SkillTileMark;
  readonly onSelect: (id: string) => void;
  /** Shown after the tab name when above 0 (the builds pages' points in the tab) */
  readonly count?: number;
  /** Per-tile badge / dimming */
  readonly tileProps?: (skill: SkillDetail) => SkillTileDecoration;
  readonly className?: string;
}

/** One skill tab as the in-game grid: 6 rows × 3 columns, each skill at its skilldesc row / column. */
export function SkillTreeTab({ tab, markOf, onSelect, count, tileProps, className }: SkillTreeTabProps) {
  return (
    <section aria-label={`${tab.name} skills`} className={cn('rounded-lg border bg-card p-2', className)}>
      <h3 className="mb-2 px-1 text-sm font-semibold">
        {tab.name}
        {count !== undefined && count > 0 && <span className="font-normal text-muted-foreground"> · {count}</span>}
      </h3>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${String(SKILL_COLUMNS)}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${String(SKILL_ROWS)}, minmax(5.5rem, auto))`,
        }}
      >
        {tab.cells.map((cell) => (
          <SkillTile
            key={cell.detail.id}
            skill={cell.detail}
            mark={markOf(cell.detail.id)}
            onSelect={onSelect}
            style={{ gridRow: cell.row, gridColumn: cell.col }}
            {...tileProps?.(cell.detail)}
          />
        ))}
      </div>
    </section>
  );
}
