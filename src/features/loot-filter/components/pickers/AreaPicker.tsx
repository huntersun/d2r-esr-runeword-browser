import type { LootFilterData } from '../../hooks/useLootFilterData';
import { idCustom, idsToValues, valuesToIds } from './customOptions';
import { MultiPicker } from './MultiPicker';

export interface AreaPickerProps {
  readonly data: LootFilterData;
  readonly values: readonly number[];
  readonly onChange: (ids: readonly number[]) => void;
  readonly id?: string;
}

/** levels.txt ids, grouped by act; chips show the area name and id. */
export function AreaPicker({ data, values, onChange, id }: AreaPickerProps) {
  return (
    <MultiPicker
      id={id}
      options={data.options.areas}
      values={idsToValues(values)}
      onChange={(next) => {
        onChange(valuesToIds(next));
      }}
      describe={(value) => {
        const name = data.lookup.areaName(Number(value));
        return { label: name ?? `Area ${value}`, detail: value, muted: data.status === 'ready' && name === undefined };
      }}
      addLabel="Add area"
      searchPlaceholder="Area name or id…"
      custom={idCustom('area')}
    />
  );
}
