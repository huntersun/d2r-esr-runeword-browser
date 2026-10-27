import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { CharacterClass } from '../constants';
import { useSkillTree } from '../hooks/useSkillTree';
import {
  classTree,
  classView,
  clearSkillPoints,
  levelCap,
  parseLevelText,
  setSkillPoints,
  skillPointTotals,
  skillsForClass,
  skillsOutsideClass,
  type SkillPoints,
} from '../utils/skillTree';
import { BuildSkillTrees } from './BuildSkillTrees';

interface SkillTreeEditorProps {
  readonly characterClass: CharacterClass | '';
  /** The level input's raw text ('' = unset); parsed on submit. */
  readonly levelText: string;
  readonly skillPoints: SkillPoints;
  readonly disabled: boolean;
  readonly onLevelTextChange: (text: string) => void;
  readonly onSkillPointsChange: (next: SkillPoints) => void;
}

/** The form's level input and skill tree allocation (points are only counted, never limited by level or prerequisites). */
export function SkillTreeEditor({
  characterClass,
  levelText,
  skillPoints,
  disabled,
  onLevelTextChange,
  onSkillPointsChange,
}: SkillTreeEditorProps) {
  const skillData = useSkillTree(characterClass !== '');
  const maxLevel = levelCap(skillData.bundle);
  const levelInvalid = levelText.trim() !== '' && parseLevelText(levelText) === undefined;
  const tree = characterClass !== '' ? classTree(skillData.bundle, characterClass) : undefined;
  const cls = characterClass !== '' ? classView(skillData.view, characterClass) : undefined;
  const totals = skillPointTotals(skillPoints, tree);
  const outside = tree !== undefined ? skillsOutsideClass(skillPoints, tree) : [];
  const outsidePoints = outside.reduce((sum, id) => sum + (skillPoints[id] ?? 0), 0);
  const classPoints = totals.total - outsidePoints;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="build-level" className="text-xs text-muted-foreground">
          Level
        </Label>
        <Input
          id="build-level"
          type="number"
          inputMode="numeric"
          min={1}
          max={maxLevel}
          step={1}
          value={levelText}
          placeholder="—"
          className="w-24"
          disabled={disabled}
          aria-invalid={levelInvalid}
          onChange={(event) => {
            onLevelTextChange(event.target.value);
          }}
        />
        {levelInvalid && <p className="text-xs text-destructive">1–{maxLevel}</p>}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Skill tree</span>
          {tree !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {totals.total} {totals.total === 1 ? 'point' : 'points'} spent
              </span>
              {classPoints > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    onSkillPointsChange(clearSkillPoints(skillPoints, skillsForClass(skillPoints, tree)));
                  }}
                >
                  Reset points
                </Button>
              )}
            </div>
          )}
        </div>

        {characterClass === '' ? (
          <p className="text-sm text-muted-foreground">Pick a class to allocate skill points.</p>
        ) : skillData.status === 'error' ? (
          <p className="text-sm text-muted-foreground">Skill tree unavailable</p>
        ) : skillData.status !== 'ready' ? (
          <Skeleton className="h-5 w-48" />
        ) : tree === undefined || cls === undefined ? (
          <p className="text-sm text-muted-foreground">No skill tree for {characterClass} in the current game data.</p>
        ) : (
          <>
            {outside.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm">
                <span>
                  {outsidePoints} {outsidePoints === 1 ? 'point belongs' : 'points belong'} to another class
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    onSkillPointsChange(clearSkillPoints(skillPoints, outside));
                  }}
                >
                  Clear them
                </Button>
              </div>
            )}
            <BuildSkillTrees
              // Remount on a class change so the selection and the tab start afresh on the new class.
              key={tree.code}
              view={skillData.view}
              cls={cls}
              skillPoints={skillPoints}
              tabCounts={totals.byTab}
              disabled={disabled}
              onChange={(id, points) => {
                onSkillPointsChange(setSkillPoints(skillPoints, id, points));
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
