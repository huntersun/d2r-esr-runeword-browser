import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { NamedMatch, NamedRange, NamedValue } from '../../../engine/types';
import {
  convertNamedMatch,
  isNamedList,
  NAMED_MATCH_MODES,
  namedListHas,
  namedMatchMode,
  namedValueName,
  setNamedRangeBound,
  toggleNamedValue,
  type NamedMatchMode,
  type NamedScale,
} from '../../../utils/matchValues';
import { SegmentedControl } from './SegmentedControl';

const MODE_LABELS: Readonly<Record<NamedMatchMode, string>> = { any: 'any', one: 'one', several: 'several', range: 'range' };
const MODE_OPTIONS = NAMED_MATCH_MODES.map((mode) => ({ value: mode, label: MODE_LABELS[mode] }));

/** Select value for "no bound" and for a number that is not on the scale. */
const NONE = '__none';
const UNKNOWN = '__unknown';

interface NamedMatchControlProps<N extends string> {
  readonly id: string;
  readonly label: string;
  readonly value: NamedMatch<N> | undefined;
  readonly onChange: (value: NamedMatch<N> | undefined) => void;
  readonly scale: NamedScale<N>;
}

function isRange<N extends string>(value: NamedMatch<N> | undefined): value is NamedRange<N> {
  return value !== undefined && typeof value === 'object' && !isNamedList(value);
}

/** The scale name for a select's value, if it is one. */
function pickName<N extends string>(selected: string, scale: NamedScale<N>): N | undefined {
  return scale.names.find((name) => name === selected);
}

interface NameSelectProps<N extends string> {
  readonly id?: string;
  readonly ariaLabel: string;
  readonly value: NamedValue<N> | undefined;
  readonly scale: NamedScale<N>;
  readonly allowNone: boolean;
  readonly onChange: (name: N | undefined) => void;
}

/** A select over the names; a number shows as its name, a number off the scale as "unknown N". */
function NameSelect<N extends string>({ id, ariaLabel, value, scale, allowNone, onChange }: NameSelectProps<N>) {
  const name = value === undefined ? undefined : namedValueName(value, scale);
  const selected = value === undefined ? NONE : (name ?? UNKNOWN);
  return (
    <Select
      value={selected}
      onValueChange={(next) => {
        if (next === UNKNOWN) return;
        onChange(next === NONE ? undefined : pickName(next, scale));
      }}
    >
      <SelectTrigger id={id} size="sm" aria-label={ariaLabel} className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE}>—</SelectItem>}
        {value !== undefined && name === undefined && <SelectItem value={UNKNOWN}>unknown {String(value)}</SelectItem>}
        {scale.names.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * any / one name / several names / a range of names. Picks are stored as names; numbers from the file stay
 * as they are until that part is changed.
 */
export function NamedMatchControl<N extends string>({ id, label, value, onChange, scale }: NamedMatchControlProps<N>) {
  const mode = namedMatchMode(value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        aria-label={`${label}: how to match`}
        value={mode}
        options={MODE_OPTIONS}
        onChange={(next) => {
          onChange(convertNamedMatch(value, next, scale));
        }}
      />
      {(typeof value === 'string' || typeof value === 'number') && (
        <NameSelect
          id={id}
          ariaLabel={label}
          value={value}
          scale={scale}
          allowNone={false}
          onChange={(name) => {
            if (name !== undefined) onChange(name);
          }}
        />
      )}
      {value !== undefined && typeof value === 'object' && isNamedList(value) && (
        <div className="flex flex-wrap gap-1" role="group" aria-label={`${label}: values`}>
          {scale.names.map((name) => {
            const on = namedListHas(value, name, scale);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => {
                  onChange(toggleNamedValue(value, name, scale));
                }}
              >
                {name}
              </button>
            );
          })}
          {value.some((item) => namedValueName(item, scale) === undefined) && (
            <span className="text-xs text-amber-700 dark:text-amber-400">
              + unknown {value.filter((item) => namedValueName(item, scale) === undefined).join(', ')}
            </span>
          )}
        </div>
      )}
      {isRange(value) && (
        <span className="flex items-center gap-1.5">
          <NameSelect
            id={id}
            ariaLabel={`${label}: from`}
            value={value.min}
            scale={scale}
            allowNone
            onChange={(name) => {
              onChange(setNamedRangeBound(value, 'min', name));
            }}
          />
          <span className="text-muted-foreground">to</span>
          <NameSelect
            ariaLabel={`${label}: to`}
            value={value.max}
            scale={scale}
            allowNone
            onChange={(name) => {
              onChange(setNamedRangeBound(value, 'max', name));
            }}
          />
        </span>
      )}
    </div>
  );
}
