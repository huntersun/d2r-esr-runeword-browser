import { describe, it, expect } from 'vitest';
import { parseTsv } from './tsv.ts';

describe('parseTsv', () => {
  const text = [
    'name\tcode\t*comment\tlevel\tEquiv1\tEquiv2',
    'Axe\taxe\tignored\t7\tmele\t',
    'Expansion\t\t\t\t\t',
    'Club\tclub\tx\t\tblun\tmele',
    '',
  ].join('\n');

  it('maps headers and drops *-prefixed comment columns', () => {
    const table = parseTsv(text);
    expect(table.columns).toEqual(['name', 'code', 'level', 'Equiv1', 'Equiv2']);
    expect(table.rows[0]?.has('*comment')).toBe(false);
  });

  it('drops Expansion marker rows and trailing blank lines', () => {
    const table = parseTsv(text);
    expect(table.rows.map((row) => row.str('code'))).toEqual(['axe', 'club']);
  });

  it('accepts CRLF line endings', () => {
    const table = parseTsv(text.replace(/\n/g, '\r\n'));
    expect(table.rows).toHaveLength(2);
    expect(table.rows[1]?.str('Equiv2')).toBe('mele');
  });

  it('treats blank numeric cells as 0', () => {
    const table = parseTsv(text);
    expect(table.rows[0]?.num('level')).toBe(7);
    expect(table.rows[1]?.num('level')).toBe(0);
  });

  it('collects non-empty numbered columns with list()', () => {
    const table = parseTsv(text);
    expect(table.rows[0]?.list('Equiv', 2)).toEqual(['mele']);
    expect(table.rows[1]?.list('Equiv', 2)).toEqual(['blun', 'mele']);
  });

  it('throws on unknown columns and non-numeric values', () => {
    const table = parseTsv(text, 'test.txt');
    expect(() => table.rows[0]?.str('nope')).toThrow(/test.txt:2: unknown column "nope"/);
    expect(() => table.rows[0]?.num('name')).toThrow(/not a number/);
  });

  it('keeps a row whose first cell is Expansion but has other data', () => {
    const table = parseTsv('name\tcode\nExpansion\texp\n');
    expect(table.rows).toHaveLength(1);
  });
});
