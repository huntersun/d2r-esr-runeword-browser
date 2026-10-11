import { SegmentedControl } from './SegmentedControl';

type TriState = 'any' | 'yes' | 'no';

const OPTIONS = [
  { value: 'any', label: 'any' },
  { value: 'yes', label: 'yes' },
  { value: 'no', label: 'no' },
] as const;

interface TriStateControlProps {
  readonly label: string;
  readonly value: boolean | undefined;
  readonly onChange: (value: boolean | undefined) => void;
}

/** any (key absent) / yes (true) / no (false). */
export function TriStateControl({ label, value, onChange }: TriStateControlProps) {
  const state: TriState = value === undefined ? 'any' : value ? 'yes' : 'no';
  return (
    <SegmentedControl
      aria-label={label}
      value={state}
      options={OPTIONS}
      onChange={(next) => {
        onChange(next === 'any' ? undefined : next === 'yes');
      }}
    />
  );
}
