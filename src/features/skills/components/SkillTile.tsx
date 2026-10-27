import type { SkillDetail } from '@/features/game-data/engine/schema';
import { cn } from '@/lib/utils';
import type { SkillTileMark } from '../utils/skills';
import { SkillIcon } from './SkillIcon';

export type { SkillTileMark };

/** Per-tile extras of a tree (the builds pages' point counts) */
export interface SkillTileDecoration {
  /** Corner badge on the icon ("20") */
  readonly badge?: string;
  /** Amber badge (points above the skill's max level) */
  readonly badgeWarning?: boolean;
  /** In-game style for a skill without points: faded icon, muted name; still selectable */
  readonly dimmed?: boolean;
}

interface SkillTileProps extends SkillTileDecoration {
  readonly skill: SkillDetail;
  readonly mark: SkillTileMark;
  readonly onSelect: (id: string) => void;
  /** Extra line under the name (search results: the class) */
  readonly subtitle?: string;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

const MARK_CLASS: Record<Exclude<SkillTileMark, null>, string> = {
  selected: 'border-primary bg-primary/10 ring-2 ring-primary/60',
  prerequisite: 'border-amber-500/70 bg-amber-500/10',
  dependent: 'border-sky-500/60 bg-sky-500/10',
};

/** One skill of a tree: icon, name and required level, a button that selects it. */
export function SkillTile({
  skill,
  mark,
  onSelect,
  subtitle,
  badge,
  badgeWarning = false,
  dimmed = false,
  className,
  style,
}: SkillTileProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onSelect(skill.id);
      }}
      aria-pressed={mark === 'selected'}
      title={skill.name}
      style={style}
      className={cn(
        'flex min-w-0 flex-col items-center gap-1 rounded-md border border-transparent p-1.5 text-center transition-colors',
        'hover:border-border hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        mark !== null && MARK_CLASS[mark],
        className
      )}
    >
      <span className="relative">
        <SkillIcon icon={skill.icon} size={44} dimmed={dimmed} />
        {badge !== undefined && (
          <span
            className={cn(
              'absolute -top-1.5 -right-1.5 min-w-5 rounded-full px-1 text-center text-[0.65rem] leading-5 font-semibold tabular-nums shadow-sm',
              badgeWarning ? 'bg-amber-500 text-amber-950' : 'bg-primary text-primary-foreground'
            )}
          >
            {badge}
          </span>
        )}
      </span>
      <span
        className={cn('line-clamp-2 w-full text-xs leading-tight font-medium break-words hyphens-auto', dimmed && 'text-muted-foreground')}
      >
        {skill.name}
      </span>
      <span className="line-clamp-2 text-[0.65rem] leading-tight text-muted-foreground">{subtitle ?? `Lvl ${String(skill.reqLevel)}`}</span>
    </button>
  );
}
