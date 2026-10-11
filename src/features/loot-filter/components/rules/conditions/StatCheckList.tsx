import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STAT_OPS, type StatCheck, type StatOp } from '../../../engine/types';
import type { LootFilterData } from '../../../hooks/useLootFilterData';
import {
  DEFAULT_STAT_OP,
  newStatCheck,
  removeStatCheck,
  replaceStatCheck,
  setStatOp,
  setStatParam,
  setStatValue,
} from '../../../utils/statChecks';
import { NumberInput } from '../../NumberInput';
import { StatPicker } from '../../pickers';

function toOp(value: string): StatOp | undefined {
  return STAT_OPS.find((op) => op === value);
}

interface StatCheckRowProps {
  readonly id: string;
  readonly data: LootFilterData;
  readonly check: StatCheck;
  readonly onChange: (check: StatCheck) => void;
  readonly onRemove: () => void;
}

function StatCheckRow({ id, data, check, onChange, onRemove }: StatCheckRowProps) {
  const op = check.op ?? DEFAULT_STAT_OP;
  const { value } = check;
  return (
    <li className="flex flex-wrap items-center gap-1.5">
      <StatPicker
        id={id}
        data={data}
        value={check.stat}
        className="w-full sm:w-56"
        onChange={(stat) => {
          onChange({ ...check, stat });
        }}
      />
      <NumberInput
        aria-label="Param"
        integer
        className="h-8 w-20"
        placeholder="param"
        value={check.param}
        onCommit={(param) => {
          onChange(setStatParam(check, param));
        }}
      />
      <Select
        value={op}
        onValueChange={(next) => {
          const parsed = toOp(next);
          if (parsed !== undefined) onChange(setStatOp(check, parsed));
        }}
      >
        <SelectTrigger size="sm" aria-label="Comparison" className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAT_OPS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <NumberInput
        aria-label={typeof value === 'number' ? 'Value' : 'Low end'}
        className="h-8 w-20"
        value={typeof value === 'number' ? value : value[0]}
        onCommit={(next) => {
          if (next !== undefined) onChange(setStatValue(check, 0, next));
        }}
      />
      {typeof value !== 'number' && (
        <>
          <span className="text-xs text-muted-foreground">and</span>
          <NumberInput
            aria-label="High end"
            className="h-8 w-20"
            value={value[1]}
            onCommit={(next) => {
              if (next !== undefined) onChange(setStatValue(check, 1, next));
            }}
          />
        </>
      )}
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove stat check" onClick={onRemove}>
        <X />
      </Button>
    </li>
  );
}

interface StatCheckListProps {
  readonly id: string;
  readonly data: LootFilterData;
  readonly value: readonly StatCheck[] | undefined;
  /** An emptied list is `undefined` (the key goes away). */
  readonly onChange: (value: readonly StatCheck[] | undefined) => void;
}

/** Rows of stat, optional param, op and value (two values for `between`). */
export function StatCheckList({ id, data, value, onChange }: StatCheckListProps) {
  const checks = value ?? [];
  return (
    <div className="space-y-1.5">
      {checks.length > 0 && (
        <ul className="space-y-1.5">
          {checks.map((check, index) => (
            <StatCheckRow
              // Rows have no identity of their own (two can be equal), so the position is the key.
              // eslint-disable-next-line react-x/no-array-index-key
              key={index}
              id={index === 0 ? id : `${id}-${String(index)}`}
              data={data}
              check={check}
              onChange={(next) => {
                onChange(replaceStatCheck(checks, index, next));
              }}
              onRemove={() => {
                onChange(removeStatCheck(checks, index));
              }}
            />
          ))}
        </ul>
      )}
      <Button
        id={checks.length === 0 ? id : undefined}
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => {
          onChange([...checks, newStatCheck()]);
        }}
      >
        <Plus className="size-3.5" aria-hidden />
        Add stat check
      </Button>
    </div>
  );
}
