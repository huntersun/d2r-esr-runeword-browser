import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkillDetail } from '@/features/game-data/engine/schema';
import { cn } from '@/lib/utils';
import { SKILL_POINTS_MAX } from '../constants';

interface SkillPointsCounterProps {
  readonly points: number;
  readonly maxLevel: number;
}

/** "n/max": bold with points, muted at 0, amber above the skill's max level. */
export function SkillPointsCounter({ points, maxLevel }: SkillPointsCounterProps) {
  return (
    <span
      className={cn(
        'tabular-nums',
        points > maxLevel ? 'font-medium text-amber-600 dark:text-amber-400' : points > 0 ? 'font-medium' : 'text-muted-foreground'
      )}
    >
      {points}/{maxLevel}
    </span>
  );
}

interface SkillPointControlsProps {
  readonly skill: SkillDetail;
  readonly points: number;
  readonly disabled: boolean;
  readonly onChange: (points: number) => void;
}

/**
 * The editor's point controls of the selected skill: − / + around the counter, a shortcut to the skill's max level and
 * a clear. − stops at 0 and + at SKILL_POINTS_MAX; no level or prerequisite rule is enforced (owner decision).
 */
export function SkillPointControls({ skill, points, disabled, onChange }: SkillPointControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={disabled || points <= 0}
        aria-label={`Remove a point from ${skill.name}`}
        onClick={() => {
          onChange(points - 1);
        }}
      >
        <Minus className="size-4" />
      </Button>
      <span className="min-w-12 text-center">
        <SkillPointsCounter points={points} maxLevel={skill.maxLevel} />
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={disabled || points >= SKILL_POINTS_MAX}
        aria-label={`Add a point to ${skill.name}`}
        onClick={() => {
          onChange(points + 1);
        }}
      >
        <Plus className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || points === skill.maxLevel}
        aria-label={`Set ${skill.name} to ${String(skill.maxLevel)} points`}
        onClick={() => {
          onChange(skill.maxLevel);
        }}
      >
        Set to {skill.maxLevel}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || points === 0}
        aria-label={`Clear the points of ${skill.name}`}
        onClick={() => {
          onChange(0);
        }}
      >
        0
      </Button>
    </div>
  );
}
