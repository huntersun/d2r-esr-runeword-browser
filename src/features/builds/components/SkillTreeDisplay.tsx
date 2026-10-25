import { Skeleton } from '@/components/ui/skeleton';
import type { SkillTreeState } from '../hooks/useSkillTree';
import { classTree, skillName, skillPointTotals, type SkillPoints } from '../utils/skillTree';
import { SkillTreeGrid } from './SkillTreeGrid';

interface SkillTreeDisplayProps {
  readonly characterClass: string;
  readonly skillPoints: SkillPoints;
  readonly skillData: SkillTreeState;
}

/** Read-only skill tree allocation for the detail page; falls back to a raw list so the data is never hidden. */
export function SkillTreeDisplay({ characterClass, skillPoints, skillData }: SkillTreeDisplayProps) {
  if (skillData.status === 'loading' || skillData.status === 'idle') return <Skeleton className="h-40 w-full" />;
  const tree = classTree(skillData.bundle, characterClass);
  const totals = skillPointTotals(skillPoints, tree);

  if (tree === undefined) {
    // Bundle failed to load, or the class has no tree in it: show the stored allocation as is.
    return (
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-medium">
          {totals.total} {totals.total === 1 ? 'point' : 'points'} spent
        </p>
        {skillData.status === 'error' && <p className="text-xs text-muted-foreground">Skill tree unavailable</p>}
        <ul className="space-y-0.5">
          {Object.entries(skillPoints).map(([id, points]) => (
            <li key={id}>
              {skillName(skillData.bundle, id)}: {points}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {totals.total} {totals.total === 1 ? 'point' : 'points'} spent
      </p>
      <SkillTreeGrid tree={tree} skillPoints={skillPoints} />
      {totals.unknown.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Other skills: {totals.unknown.map(({ id, points }) => `${skillName(skillData.bundle, id)} (${String(points)})`).join(', ')}
        </p>
      )}
    </div>
  );
}
