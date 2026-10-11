import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DiagnosticSeverity, LootFilterRule } from '../../engine/types';
import { levelsBadge, locationBadge } from '../../utils/ruleSummary';

export interface RuleRowProps {
  readonly index: number;
  readonly rule: LootFilterRule;
  readonly summary: string;
  readonly selected: boolean;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  /** The worst diagnostic of the rule, if any. */
  readonly severity: DiagnosticSeverity | undefined;
  readonly onSelect: (index: number) => void;
  readonly onMove: (from: number, to: number) => void;
  readonly onDuplicate: (index: number) => void;
  readonly onDelete: (index: number) => void;
}

/** One rule: number, summary, badges and a problem dot; move, duplicate and delete on hover/focus (always on touch). */
export function RuleRow({
  index,
  rule,
  summary,
  selected,
  isFirst,
  isLast,
  severity,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
}: RuleRowProps) {
  const levels = levelsBadge(rule.activeInLevels);
  const location = locationBadge(rule.location);
  const number = String(index + 1);
  const hasBadges = rule.hide === true || rule.useStyle !== undefined || levels !== undefined || location !== undefined;

  return (
    <li
      data-rule-index={index}
      className={cn(
        'group relative flex items-stretch border-l-2',
        selected ? 'border-l-primary bg-accent' : 'border-l-transparent hover:bg-muted/50'
      )}
    >
      <button
        type="button"
        aria-current={selected ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-start gap-2 px-2 py-1.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        onClick={() => {
          onSelect(index);
        }}
      >
        <span className="w-7 shrink-0 pt-px text-right font-mono text-xs text-muted-foreground tabular-nums">{number}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm" title={summary}>
              {summary}
            </span>
            {severity !== undefined && (
              <span
                className={cn('size-2 shrink-0 rounded-full', severity === 'error' ? 'bg-destructive' : 'bg-amber-500')}
                role="img"
                aria-label={severity === 'error' ? 'Has errors' : 'Has warnings'}
                title={severity === 'error' ? 'Has errors' : 'Has warnings'}
              />
            )}
          </span>
          {(hasBadges || rule.comment !== undefined) && (
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              {rule.hide === true && (
                <Badge variant="outline" className="border-destructive/50 px-1.5 py-0 text-[0.7rem] text-destructive">
                  hide
                </Badge>
              )}
              {rule.useStyle !== undefined && (
                <Badge variant="secondary" className="max-w-40 px-1.5 py-0 text-[0.7rem]">
                  <span className="truncate">{rule.useStyle}</span>
                </Badge>
              )}
              {levels !== undefined && (
                <Badge variant="outline" className="px-1.5 py-0 text-[0.7rem]" title="Active at these filter levels">
                  {levels}
                </Badge>
              )}
              {location !== undefined && (
                <Badge variant="outline" className="px-1.5 py-0 text-[0.7rem]" title="Location">
                  {location}
                </Badge>
              )}
              {rule.comment !== undefined && <span className="truncate text-xs text-muted-foreground italic">{rule.comment}</span>}
            </span>
          )}
        </span>
      </button>
      <div
        className={cn(
          'flex shrink-0 items-start gap-0.5 py-1 pr-1 transition-opacity',
          // With a mouse the buttons float over the row's end, so a hidden toolbar takes no room from the summary.
          'pointer-fine:absolute pointer-fine:top-0.5 pointer-fine:right-0.5 pointer-fine:rounded-md pointer-fine:bg-card pointer-fine:py-0.5 pointer-fine:pl-0.5 pointer-fine:shadow-xs',
          !selected && 'pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100'
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7"
          disabled={isFirst}
          aria-label={`Move rule ${number} up`}
          onClick={() => {
            onMove(index, index - 1);
          }}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7"
          disabled={isLast}
          aria-label={`Move rule ${number} down`}
          onClick={() => {
            onMove(index, index + 1);
          }}
        >
          <ArrowDown />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7"
          aria-label={`Duplicate rule ${number}`}
          onClick={() => {
            onDuplicate(index);
          }}
        >
          <Copy />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 hover:text-destructive"
          aria-label={`Delete rule ${number}`}
          onClick={() => {
            onDelete(index);
          }}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
