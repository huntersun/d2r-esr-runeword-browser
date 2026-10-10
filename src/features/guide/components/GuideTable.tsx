/* eslint-disable react-x/no-array-index-key -- the body is a static generated tree that never reorders, so positional keys are stable */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PROSE_TEXT, SCROLL_HINT_STYLE } from './styles';

interface GuideTableProps<Cell> {
  readonly header: readonly Cell[];
  readonly rows: readonly (readonly Cell[])[];
  readonly renderCell: (cell: Cell) => ReactNode;
}

/** A scrollable table on the inset surface: markdown tables (inline cells) and `table` data blocks (text cells). */
export function GuideTable<Cell>({ header, rows, renderCell }: GuideTableProps<Cell>) {
  return (
    // The surface comes from SCROLL_HINT_STYLE (the inset colour).
    <div className="overflow-x-auto rounded-md border" style={SCROLL_HINT_STYLE}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {header.map((cell, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                {renderCell(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b last:border-0">
              {row.map((cell, c) => (
                <td key={c} className={cn('px-3 py-1.5 align-top', PROSE_TEXT)}>
                  {renderCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
