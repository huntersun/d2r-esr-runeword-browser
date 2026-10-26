import type { LootFilterData } from '../../hooks/useLootFilterData';
import { ItemBrowserDialog } from './ItemBrowserDialog';
import { codeCustom } from './customOptions';
import { MultiPicker, SinglePicker, type DescribeValue } from './MultiPicker';
import { itemMutedState } from '../../utils/lookup';

function describeItem(data: LootFilterData): DescribeValue {
  return (code) => {
    const item = data.lookup.item(code);
    if (item === undefined) {
      return { label: code, muted: data.status === 'ready', title: data.status === 'ready' ? 'Not in the game data' : undefined };
    }
    const { muted, title } = itemMutedState(item);
    return { label: item.name === '' ? code : item.name, detail: code, muted, title };
  };
}

const MUTED_NOUNS = { 'shadow base': ['shadow base', 'shadow bases'], 'never drops': ['never-drop item', 'never-drop items'] } as const;

export interface ItemPickerProps {
  /** From `useLootFilterData()`; without loaded data the picker still takes typed codes. */
  readonly data: LootFilterData;
  readonly values: readonly string[];
  readonly onChange: (codes: readonly string[]) => void;
  readonly id?: string;
}

/**
 * Item codes (weapons, armor, misc) as chips with name + code; search by name or code, or by item type (`helm` finds
 * Demonhead, after the names). "Add all" / "Remove all" acts on every match, skipping shadow bases and misc items that
 * never drop. "Browse items…" opens
 * the bases by type and tier and the misc items by group, with checkboxes.
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
      mutedNouns={MUTED_NOUNS}
      actions={<ItemBrowserDialog values={values} onChange={onChange} />}
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
