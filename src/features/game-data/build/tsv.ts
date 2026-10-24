/**
 * Parser for the TAB-separated `data/global/excel/*.txt` game tables.
 *
 * - LF and CRLF line endings
 * - columns whose header starts with `*` are comments and are dropped
 * - `Expansion` marker rows (first cell `Expansion`, rest empty) are dropped, unless `keepExpansionRows` is set
 *   (the game loads them as rows, so tables addressed by row number need them to keep the numbering)
 * - a blank numeric cell means 0
 */

export class TsvRow {
  readonly #cells: readonly string[];
  readonly #index: ReadonlyMap<string, number>;
  readonly #context: string;
  /** 1-based line number in the file (the header is line 1); 0 when unknown */
  readonly line: number;

  constructor(cells: readonly string[], index: ReadonlyMap<string, number>, context: string, line = 0) {
    this.#cells = cells;
    this.#index = index;
    this.#context = context;
    this.line = line;
  }

  has(column: string): boolean {
    return this.#index.has(column);
  }

  /** Trimmed cell text. Throws on an unknown column (catches typos in column names). */
  str(column: string): string {
    const i = this.#index.get(column);
    if (i === undefined) throw new Error(`${this.#context}: unknown column "${column}"`);
    return (this.#cells[i] ?? '').trim();
  }

  /** Numeric cell; blank → 0. Throws on non-numeric text. */
  num(column: string): number {
    const text = this.str(column);
    if (text === '') return 0;
    const value = Number(text);
    if (Number.isNaN(value)) throw new Error(`${this.#context}: column "${column}" is not a number: "${text}"`);
    return value;
  }

  /** Non-empty values of `${prefix}1` … `${prefix}${n}` in order. */
  list(prefix: string, n: number): string[] {
    const values: string[] = [];
    for (let i = 1; i <= n; i++) {
      const value = this.str(`${prefix}${String(i)}`);
      if (value !== '') values.push(value);
    }
    return values;
  }
}

export interface TsvTable {
  readonly columns: readonly string[];
  readonly rows: readonly TsvRow[];
}

function isExpansionMarker(cells: readonly string[]): boolean {
  return cells[0]?.trim() === 'Expansion' && cells.slice(1).every((cell) => cell.trim() === '');
}

export interface ParseTsvOptions {
  /** Keep `Expansion` marker rows (all their cells read as blank but the first) so row indices match the game's */
  keepExpansionRows?: boolean;
}

export function parseTsv(text: string, fileName = 'table', options: ParseTsvOptions = {}): TsvTable {
  const lines = text.split(/\r?\n/);
  const headerLine = lines[0] ?? '';
  if (headerLine.trim() === '') throw new Error(`${fileName}: missing header row`);

  const header = headerLine.split('\t');
  const index = new Map<string, number>();
  const columns: string[] = [];
  header.forEach((rawName, i) => {
    const name = rawName.trim();
    if (name === '' || name.startsWith('*') || index.has(name)) return;
    index.set(name, i);
    columns.push(name);
  });

  const rows: TsvRow[] = [];
  for (let lineNo = 1; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo] ?? '';
    if (line.trim() === '') continue;
    const cells = line.split('\t');
    if (options.keepExpansionRows !== true && isExpansionMarker(cells)) continue;
    rows.push(new TsvRow(cells, index, `${fileName}:${String(lineNo + 1)}`, lineNo + 1));
  }

  return { columns, rows };
}
