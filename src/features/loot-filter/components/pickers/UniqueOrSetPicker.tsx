import type { LootFilterData } from '../../hooks/useLootFilterData';
import { idCustom, idsToValues, valuesToIds } from './customOptions';
import { MultiPicker } from './MultiPicker';
import { UniqueSetBrowserDialog } from './UniqueSetBrowserDialog';

export interface UniqueOrSetPickerProps {
  readonly data: LootFilterData;
  readonly values: readonly number[];
  readonly onChange: (ids: readonly number[]) => void;
  readonly id?: string;
}

/**
 * uniqueitems.txt / setitems.txt row ids. The list groups uniques and sets with their base item; a unique and
 * a set item can share an id, so a chip names both when they do. "Browse uniques and sets…" opens the uniques by base
 * type and tier and the set items by set, with checkboxes.
 */
export function UniqueOrSetPicker({ data, values, onChange, id }: UniqueOrSetPickerProps) {
  return (
    <MultiPicker
      id={id}
      options={data.options.uniquesAndSets}
      values={idsToValues(values)}
      onChange={(next) => {
        onChange(valuesToIds(next));
      }}
      describe={(value) => {
        const name = data.lookup.uniqueOrSetName(Number(value));
        return { label: name ?? `#${value}`, detail: value, muted: data.status === 'ready' && name === undefined };
      }}
      addLabel="Add unique or set item"
      searchPlaceholder="Name, base item or id…"
      custom={idCustom('row')}
      actions={<UniqueSetBrowserDialog values={values} onChange={onChange} />}
    />
  );
}
