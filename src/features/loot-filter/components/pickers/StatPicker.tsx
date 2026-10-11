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
  /** Trigger text when no stat is picked (default "Pick a stat"). */
  readonly placeholder?: string;
  /** Default "Stat". */
  readonly 'aria-label'?: string;
  readonly onCloseAutoFocus?: (event: Event) => void;
}

/** One stat by name or id. Keeps the form the file used: a number stays a number until the user picks another stat. */
export function StatPicker({
  data,
  value,
  onChange,
  id,
  className,
  placeholder = 'Pick a stat',
  'aria-label': ariaLabel = 'Stat',
  onCloseAutoFocus,
}: StatPickerProps) {
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
      aria-label={ariaLabel}
      options={data.options.stats}
      // A number shows as its name when known, so the list marks it.
      value={typeof value === 'number' ? (data.lookup.statName(value) ?? `${ID_PREFIX}${String(value)}`) : value}
      onChange={(picked) => {
        onChange(picked.startsWith(ID_PREFIX) ? Number(picked.slice(ID_PREFIX.length)) : picked);
      }}
      describe={(shown) => {
        // The list's values: a stat name, or `#id` for an id the game data does not name.
        const stat = shown.startsWith(ID_PREFIX) ? Number(shown.slice(ID_PREFIX.length)) : shown;
        const name = data.lookup.statName(stat);
        const statId = data.lookup.statId(stat);
        const unknown = data.status === 'ready' && statId === undefined;
        const title = unknown ? 'Not in the game data' : undefined;
        if (typeof stat === 'number') return { label: name ?? `Stat ${String(stat)}`, detail: `id ${String(stat)}`, muted: unknown, title };
        return { label: stat, detail: statId === undefined ? undefined : String(statId), muted: unknown, title };
      }}
      placeholder={placeholder}
      searchPlaceholder="Stat name or id…"
      custom={custom}
      className={className}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  );
}
