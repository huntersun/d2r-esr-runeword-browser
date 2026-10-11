import { useEffect, useRef } from 'react';
import type { DiagnosticSeverity, LootFilterRule } from '../../engine/types';
import { RuleRow } from './RuleRow';

export interface RuleListEntry {
  readonly index: number;
  readonly rule: LootFilterRule;
  readonly summary: string;
  readonly severity: DiagnosticSeverity | undefined;
}

interface RuleListProps {
  /** The rules to show (after the search), with their position in the filter. */
  readonly entries: readonly RuleListEntry[];
  readonly ruleCount: number;
  /** False while a search filters the list: moving next to a hidden rule would be confusing. */
  readonly canMove: boolean;
  readonly selectedRule: number | null;
  readonly onSelect: (index: number) => void;
  readonly onMove: (from: number, to: number) => void;
  readonly onDuplicate: (index: number) => void;
  readonly onDelete: (index: number) => void;
  readonly className?: string;
}

/** The rules in file order; keeps the selected row in view when the selection changes (e.g. from the JSON tab). */
export function RuleList({ entries, ruleCount, canMove, selectedRule, onSelect, onMove, onDuplicate, onDelete, className }: RuleListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Rows are keyed by position, so after a move the focused button belongs to the other rule: follow the moved one.
  const handleMove = (from: number, to: number) => {
    onMove(from, to);
    requestAnimationFrame(() => {
      const row = listRef.current?.querySelector(`[data-rule-index="${String(to)}"]`);
      const move = row?.querySelector<HTMLButtonElement>(`[data-move="${to < from ? 'up' : 'down'}"]`);
      (move?.disabled === false ? move : row?.querySelector<HTMLElement>('[data-rule-main]'))?.focus();
    });
  };

  useEffect(() => {
    if (selectedRule === null) return;
    listRef.current?.querySelector(`[data-rule-index="${String(selectedRule)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedRule]);

  return (
    <ul ref={listRef} className={className} aria-label="Rules">
      {entries.map((entry) => (
        <RuleRow
          key={entry.index}
          index={entry.index}
          rule={entry.rule}
          summary={entry.summary}
          severity={entry.severity}
          selected={entry.index === selectedRule}
          isFirst={entry.index === 0}
          isLast={entry.index === ruleCount - 1}
          canMove={canMove}
          onSelect={onSelect}
          onMove={handleMove}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
