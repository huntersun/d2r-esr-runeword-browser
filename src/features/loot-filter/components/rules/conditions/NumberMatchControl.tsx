import type { NumberMatch } from '../../../engine/types';
import {
  convertNumberMatch,
  isNumberList,
  NUMBER_MATCH_MODES,
  numberMatchMode,
  setRangeBound,
  type NumberMatchMode,
} from '../../../utils/matchValues';
import { NumberInput } from '../../NumberInput';
import { NumberListInput } from './NumberListInput';
import { RequiredNumberInput } from './RequiredNumberInput';
import { SegmentedControl } from './SegmentedControl';

const MODE_LABELS: Readonly<Record<NumberMatchMode, string>> = { any: 'any', exactly: 'exactly', list: 'list', range: 'range' };
const MODE_OPTIONS = NUMBER_MATCH_MODES.map((mode) => ({ value: mode, label: MODE_LABELS[mode] }));

interface NumberMatchControlProps {
  readonly id: string;
  readonly label: string;
  readonly value: NumberMatch | undefined;
  readonly onChange: (value: NumberMatch | undefined) => void;
  /** The number a fresh exactly/list/range starts with. */
  readonly fallback: number;
  readonly min: number;
  readonly max: number;
}

/** any / exactly N / a list / a range (`{ min }` only or `{ max }` only allowed). */
export function NumberMatchControl({ id, label, value, onChange, fallback, min, max }: NumberMatchControlProps) {
  const mode = numberMatchMode(value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        aria-label={`${label}: how to match`}
        value={mode}
        options={MODE_OPTIONS}
        onChange={(next) => {
          onChange(convertNumberMatch(value, next, fallback));
        }}
      />
      {typeof value === 'number' && (
        <RequiredNumberInput
          id={id}
          aria-label={label}
          integer
          min={min}
          max={max}
          className="h-8 w-24"
          value={value}
          onCommit={onChange}
        />
      )}
      {value !== undefined && typeof value === 'object' && isNumberList(value) && (
        <NumberListInput
          id={id}
          aria-label={`${label}: values`}
          className="h-8 w-40"
          placeholder="1, 2, 3"
          value={value}
          onCommit={onChange}
        />
      )}
      {value !== undefined && typeof value === 'object' && !isNumberList(value) && (
        <span className="flex items-center gap-1.5">
          <NumberInput
            id={id}
            aria-label={`${label}: at least`}
            integer
            min={min}
            max={max}
            className="h-8 w-20"
            placeholder="min"
            value={value.min}
            onCommit={(next) => {
              onChange(setRangeBound(value, 'min', next));
            }}
          />
          <span className="text-muted-foreground">to</span>
          <NumberInput
            aria-label={`${label}: at most`}
            integer
            min={min}
            max={max}
            className="h-8 w-20"
            placeholder="max"
            value={value.max}
            onCommit={(next) => {
              onChange(setRangeBound(value, 'max', next));
            }}
          />
        </span>
      )}
    </div>
  );
}
