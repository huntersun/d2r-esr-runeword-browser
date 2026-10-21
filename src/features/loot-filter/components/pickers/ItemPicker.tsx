import type { LootFilterData } from '../../hooks/useLootFilterData';
import { BaseBrowserDialog } from './BaseBrowserDialog';
import { codeCustom } from './customOptions';
import { MultiPicker, SinglePicker, type DescribeValue } from './MultiPicker';

function describeItem(data: LootFilterData): DescribeValue {
  return (code) => {
    const item = data.lookup.item(code);
    if (item === undefined) {
      return { label: code, muted: data.status === 'ready', title: data.status === 'ready' ? 'Not in the game data' : undefined };
    }
    return {
      label: item.name === '' ? code : item.name,
      detail: code,
      muted: !item.spawnable,
      title: item.spawnable ? undefined : 'Shadow base: not spawnable (uniques sit on such bases)',
    };
  };
}

export interface ItemPickerProps {
  /** From `useLootFilterData()`; without loaded data the picker still takes typed codes. */
  readonly data: LootFilterData;
  readonly values: readonly string[];
  readonly onChange: (codes: readonly string[]) => void;
  readonly id?: string;
}

/**
 * Item codes (weapons, armor, misc) as chips with name + code; search by name or code, or by item type (`helm` finds
 * Demonhead, after the names). "Add all" / "Remove all" acts on every match, skipping shadow bases. "Browse bases…" opens
 * the bases by type and tier with checkboxes.
 */
export function ItemPicker({ data, values, onChange, id }: ItemPickerProps) {
  return (
    <MultiPicker
      id={id}
      options={data.options.items}
      values={values}
      onChange={onChange}
      describe={describeItem(data)}
      addLabel="Add item"
      searchPlaceholder="Item name, code or type…"
      custom={codeCustom('item')}
      bulkNouns={['item', 'items']}
      mutedNouns={['shadow base', 'shadow bases']}
      actions={<BaseBrowserDialog values={values} onChange={onChange} />}
    />
  );
}

export interface SingleItemPickerProps {
  readonly data: LootFilterData;
  readonly value: string | undefined;
  readonly onChange: (code: string) => void;
  readonly id?: string;
  readonly placeholder?: string;
  readonly className?: string;
}

/** One item code, as a combobox (for the test-item form). */
export function SingleItemPicker({ data, value, onChange, id, placeholder = 'Pick an item', className }: SingleItemPickerProps) {
  return (
    <SinglePicker
      id={id}
      options={data.options.items}
      value={value}
      onChange={onChange}
      describe={describeItem(data)}
      placeholder={placeholder}
      searchPlaceholder="Item name, code or type…"
      custom={codeCustom('item')}
      className={className}
    />
  );
}
