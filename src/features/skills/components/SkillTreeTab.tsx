import { cn } from '@/lib/utils';
import { SKILL_COLUMNS, SKILL_ROWS, type SkillTabView } from '../utils/skills';
import { SkillTile, type SkillTileMark } from './SkillTile';

interface SkillTreeTabProps {
  readonly tab: SkillTabView;
  readonly markOf: (id: string) => SkillTileMark;
  readonly onSelect: (id: string) => void;
  readonly className?: string;
}

/** One skill tab as the in-game grid: 6 rows × 3 columns, each skill at its skilldesc row / column. */
export function SkillTreeTab({ tab, markOf, onSelect, className }: SkillTreeTabProps) {
  return (
    <section aria-label={`${tab.name} skills`} className={cn('rounded-lg border bg-card p-2', className)}>
      <h3 className="mb-2 px-1 text-sm font-semibold">{tab.name}</h3>
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
          />
        ))}
      </div>
    </section>
  );
}
