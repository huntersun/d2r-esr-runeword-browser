import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LootFilterData } from '../../hooks/useLootFilterData';
import { newStatRow, type StatRow } from '../../utils/testItemForm';
import { NumberInput } from '../NumberInput';
import { StatPicker } from '../pickers';

interface StatRowsEditorProps {
  readonly data: LootFilterData;
  readonly idPrefix: string;
  readonly rows: readonly StatRow[];
  readonly onChange: (rows: readonly StatRow[]) => void;
  readonly addLabel: string;
}

/** Stat rows (stat, optional param, value) with add and remove; a row without stat or value is ignored by the test. */
export function StatRowsEditor({ data, idPrefix, rows, onChange, addLabel }: StatRowsEditorProps) {
  const update = (key: number, patch: Partial<Omit<StatRow, 'key'>>) => {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, index) => (
        <div key={row.key} className="flex flex-wrap items-center gap-1.5">
          <StatPicker
            data={data}
            id={`${idPrefix}-${String(index)}-stat`}
            value={row.stat}
            onChange={(stat) => {
              update(row.key, { stat });
            }}
            className="min-w-0 flex-1 basis-40"
          />
          <NumberInput
            integer
            aria-label="Param"
            placeholder="param"
            className="h-8 w-20"
            value={row.param}
            onCommit={(param) => {
              update(row.key, { param });
            }}
          />
          <NumberInput
            aria-label="Value"
            placeholder="value"
            className="h-8 w-24"
            value={row.value}
            onCommit={(value) => {
              update(row.key, { value });
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8"
            aria-label="Remove the stat"
            onClick={() => {
              onChange(rows.filter((candidate) => candidate.key !== row.key));
            }}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-fit px-2 text-xs"
        onClick={() => {
          onChange([...rows, newStatRow()]);
        }}
      >
        <Plus className="size-3.5" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}
