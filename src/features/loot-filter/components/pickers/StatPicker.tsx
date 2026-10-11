import type { LootFilterData } from '../../hooks/useLootFilterData';
import { parseStatInput } from '../../utils/statChecks';
import { SinglePicker } from './MultiPicker';
import type { PickerCustom } from './PickerList';

/** Picker values: a stat name as is, a stat id typed as a number as `#id`. */
const ID_PREFIX = '#';

export interface StatPickerProps {
  readonly data: LootFilterData;
  /** An itemstatcost.txt name or id ('' = none yet). */
  readonly value: string | number | undefined;
  /** A name when picked from the list or typed as text, a number when typed as an id. */
  readonly onChange: (stat: string | number) => void;
  readonly id?: string;
  readonly className?: string;
}

/** One stat by name or id. Keeps the form the file used: a number stays a number until the user picks another stat. */
export function StatPicker({ data, value, onChange, id, className }: StatPickerProps) {
  const custom: PickerCustom = (query) => {
    const parsed = parseStatInput(query);
    if (parsed === null) return null;
    if (typeof parsed === 'number') {
      const name = data.lookup.statName(parsed);
      return { value: `${ID_PREFIX}${String(parsed)}`, label: `Use stat id ${String(parsed)}${name === undefined ? '' : ` (${name})`}` };
    }
    return /^\S+$/.test(parsed) ? { value: parsed, label: `Use stat name “${parsed}”` } : null;
  };

  return (
    <SinglePicker
      id={id}
      aria-label="Stat"
      options={data.options.stats}
      // A number shows as its name when known, so the list marks it.
      value={typeof value === 'number' ? (data.lookup.statName(value) ?? `${ID_PREFIX}${String(value)}`) : value}
      onChange={(picked) => {
        onChange(picked.startsWith(ID_PREFIX) ? Number(picked.slice(ID_PREFIX.length)) : picked);
      }}
      describe={() => {
        if (value === undefined || value === '') return { label: '' };
        const name = data.lookup.statName(value);
        const statId = data.lookup.statId(value);
        const unknown = data.status === 'ready' && statId === undefined;
        if (typeof value === 'number') {
          return {
            label: name ?? `Stat ${String(value)}`,
            detail: `id ${String(value)}`,
            muted: unknown,
            title: unknown ? 'Not in the game data' : undefined,
          };
        }
        return {
          label: value,
          detail: statId === undefined ? undefined : String(statId),
          muted: unknown,
          title: unknown ? 'Not in the game data' : undefined,
        };
      }}
      placeholder="Pick a stat"
      searchPlaceholder="Stat name or id…"
      custom={custom}
      className={className}
    />
  );
}
