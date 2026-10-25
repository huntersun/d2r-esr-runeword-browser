import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SkillClassTree, SkillInfo } from '@/features/game-data/engine/schema';
import { cn } from '@/lib/utils';
import { SKILL_POINTS_MAX } from '../constants';
import { prerequisiteNames, skillPointTotals, type SkillPoints } from '../utils/skillTree';

interface SkillTreeGridProps {
  readonly tree: SkillClassTree;
  readonly skillPoints: SkillPoints;
  /** Omitted on the read-only detail page. */
  readonly onChange?: (id: string, points: number) => void;
  readonly disabled?: boolean;
}

/**
 * A class skill tree as three tabs, each a 3-column x 6-row grid placed by the skill's row / col.
 * Editable with − / + buttons and a max-points shortcut when `onChange` is given; no budget, level or prerequisite rule is
 * enforced (owner decision), points only count.
 */
export function SkillTreeGrid({ tree, skillPoints, onChange, disabled = false }: SkillTreeGridProps) {
  const totals = skillPointTotals(skillPoints, tree);
  const firstTab = tree.tabs.at(0);
  if (firstTab === undefined) return null;
  return (
    <Tabs defaultValue={String(firstTab.page)} className="gap-2">
      <TabsList className="h-auto w-full flex-wrap">
        {tree.tabs.map((tab, index) => {
          const count = totals.byTab[index] ?? 0;
          return (
            <TabsTrigger key={tab.page} value={String(tab.page)} className="h-auto min-w-0 py-1 text-xs whitespace-normal sm:text-sm">
              {count > 0 ? `${tab.name} · ${String(count)}` : tab.name}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {tree.tabs.map((tab) => (
        <TabsContent key={tab.page} value={String(tab.page)}>
          <div className="grid grid-cols-3 gap-1.5">
            {tab.skills.map((skill) => (
              <SkillCell
                key={skill.id}
                skill={skill}
                tree={tree}
                points={skillPoints[skill.id] ?? 0}
                onChange={onChange}
                disabled={disabled}
              />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface SkillCellProps {
  readonly skill: SkillInfo;
  readonly tree: SkillClassTree;
  readonly points: number;
  readonly onChange: ((id: string, points: number) => void) | undefined;
  readonly disabled: boolean;
}

function SkillCell({ skill, tree, points, onChange, disabled }: SkillCellProps) {
  const needs = prerequisiteNames(skill, tree);
  const title = [skill.name, `Required level ${String(skill.reqLevel)}`, ...(needs.length > 0 ? [`Needs ${needs.join(', ')}`] : [])].join(
    '\n'
  );
  const overMax = points > skill.maxLevel;
  const pointsText = (
    <span
      className={cn(
        'tabular-nums',
        overMax ? 'font-medium text-amber-600 dark:text-amber-400' : points > 0 ? 'font-medium' : 'text-muted-foreground'
      )}
    >
      {points}/{skill.maxLevel}
    </span>
  );
  return (
    <div
      style={{ gridRow: skill.row, gridColumn: skill.col }}
      title={title}
      className={cn(
        'flex min-w-0 flex-col gap-0.5 rounded-md border p-1.5 text-xs',
        points > 0 ? 'border-primary/50 bg-primary/10' : onChange === undefined && 'opacity-50'
      )}
    >
      <span className="truncate font-medium">{skill.name}</span>
      <span className="truncate text-[11px] text-muted-foreground">
        lvl {skill.reqLevel}
        {needs.length > 0 && <span className="hidden sm:inline"> · needs {needs.join(', ')}</span>}
      </span>
      {onChange === undefined ? (
        pointsText
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-6"
            disabled={disabled || points <= 0}
            aria-label={`Remove a point from ${skill.name}`}
            onClick={() => {
              onChange(skill.id, points - 1);
            }}
          >
            <Minus className="size-3" />
          </Button>
          {pointsText}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-6"
            disabled={disabled || points >= SKILL_POINTS_MAX}
            aria-label={`Add a point to ${skill.name}`}
            onClick={() => {
              onChange(skill.id, points + 1);
            }}
          >
            <Plus className="size-3" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-[11px]"
            disabled={disabled || points === skill.maxLevel}
            aria-label={`Set ${skill.name} to ${String(skill.maxLevel)} points`}
            title={`Set to ${String(skill.maxLevel)}`}
            onClick={() => {
              onChange(skill.id, skill.maxLevel);
            }}
          >
            {skill.maxLevel}
          </Button>
        </div>
      )}
    </div>
  );
}
