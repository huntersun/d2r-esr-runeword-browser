import { useState } from 'react';
import type { SkillDetail } from '@/features/game-data/engine/schema';
import { SkillClassTrees } from '@/features/skills/components/SkillClassTrees';
import { SkillDetailCard } from '@/features/skills/components/SkillDetailCard';
import type { SkillTileDecoration } from '@/features/skills/components/SkillTile';
import { SkillTreesLayout } from '@/features/skills/components/SkillTreesLayout';
import { useDetailScroll } from '@/features/skills/hooks/useDetailScroll';
import { useMythicalNames } from '@/features/skills/hooks/useMythicalNames';
import { selectionMarks, type SkillClassView, type SkillsView } from '@/features/skills/utils/skills';
import type { SkillPoints } from '../utils/skillTree';
import { SkillPointControls, SkillPointsCounter } from './SkillPointControls';

interface BuildSkillTreesProps {
  readonly view: SkillsView;
  readonly cls: SkillClassView;
  readonly skillPoints: SkillPoints;
  /** Points per tab, in tab order */
  readonly tabCounts: readonly number[];
  /** Omitted on the read-only detail page */
  readonly onChange?: (id: string, points: number) => void;
  readonly disabled?: boolean;
}

/**
 * A build's skill allocation as the Skills page trees: icon tiles with a point badge (amber above the skill's max
 * level), the selected skill's detail card beside them with the point controls (editor) or the counter (read-only).
 * Without `onChange`, skills without points are dimmed like in game. The selection is local state.
 */
export function BuildSkillTrees({ view, cls, skillPoints, tabCounts, onChange, disabled = false }: BuildSkillTreesProps) {
  const readOnly = onChange === undefined;
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState(cls.tabs[0]?.page ?? 1);
  const mythicals = useMythicalNames();
  const { ref, requestScroll } = useDetailScroll(selected);
  // The editor remounts on a class change; a selection from another class is dropped all the same.
  const detail = selected === null ? undefined : view.byId.get(selected);
  const current = detail !== undefined && detail.cls === cls.code ? detail : undefined;
  const markOf = selectionMarks(view, current?.id ?? null);
  const pointsOf = (id: string) => skillPoints[id] ?? 0;

  const select = (id: string) => {
    const target = view.byId.get(id);
    if (target === undefined || target.cls !== cls.code) return;
    requestScroll();
    setSelected(id);
    if (target.page !== null) setTab(target.page);
  };
  const tileProps = (skill: SkillDetail): SkillTileDecoration => {
    const points = pointsOf(skill.id);
    return { badge: points > 0 ? String(points) : undefined, badgeWarning: points > skill.maxLevel, dimmed: readOnly && points === 0 };
  };

  const card =
    current === undefined ? null : (
      <div ref={ref} className="scroll-mt-20">
        <SkillDetailCard
          key={current.id}
          view={view}
          skill={current}
          mythicals={mythicals}
          onSelect={select}
          onClose={() => {
            setSelected(null);
          }}
        >
          {onChange === undefined ? (
            <p>
              <span className="text-muted-foreground">Points: </span>
              <SkillPointsCounter points={pointsOf(current.id)} maxLevel={current.maxLevel} />
            </p>
          ) : (
            <SkillPointControls
              skill={current}
              points={pointsOf(current.id)}
              disabled={disabled}
              onChange={(points) => {
                onChange(current.id, points);
              }}
            />
          )}
        </SkillDetailCard>
      </div>
    );

  return (
    <SkillTreesLayout aside={card} placeholder={readOnly ? 'Pick a skill to see its details.' : 'Pick a skill to allocate points.'}>
      <SkillClassTrees
        cls={cls}
        tab={tab}
        onTabChange={setTab}
        markOf={markOf}
        onSelect={select}
        tabCounts={tabCounts}
        tileProps={tileProps}
      />
    </SkillTreesLayout>
  );
}
