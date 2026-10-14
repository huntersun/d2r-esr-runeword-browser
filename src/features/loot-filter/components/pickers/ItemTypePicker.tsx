import type { LootFilterData } from '../../hooks/useLootFilterData';
import { codeCustom } from './customOptions';
import { MultiPicker } from './MultiPicker';

export interface ItemTypePickerProps {
  readonly data: LootFilterData;
  readonly values: readonly string[];
  readonly onChange: (codes: readonly string[]) => void;
  readonly id?: string;
}

/** itemtypes.txt codes as chips with name + code; the list shows each type's parents. */
export function ItemTypePicker({ data, values, onChange, id }: ItemTypePickerProps) {
  return (
    <MultiPicker
      id={id}
      options={data.options.types}
      values={values}
      onChange={onChange}
      describe={(code) => {
        const name = data.lookup.typeName(code);
        const known = data.lookup.itemType(code) !== undefined;
        return {
          label: name === undefined || name === '' ? code : name,
          detail: code,
          muted: data.status === 'ready' && !known,
          title: data.status === 'ready' && !known ? 'Not in the game data' : undefined,
        };
      }}
      addLabel="Add type"
      searchPlaceholder="Type name or code…"
      custom={codeCustom('type')}
      bulkNouns={['type', 'types']}
    />
  );
}
