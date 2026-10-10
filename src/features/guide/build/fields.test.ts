import { describe, expect, it } from 'vitest';
import { FieldReader, isObject, parseYaml } from './fields.ts';

function reader(object: Record<string, unknown>) {
  const errors: string[] = [];
  return { fields: new FieldReader(object, 'note.md', errors), errors };
}

describe('isObject', () => {
  it('accepts plain mappings only', () => {
    expect(isObject({})).toBe(true);
    expect(isObject([])).toBe(false);
    expect(isObject(null)).toBe(false);
    expect(isObject('x')).toBe(false);
  });
});

describe('parseYaml', () => {
  it('reports the first line of a syntax error and yields undefined', () => {
    const errors: string[] = [];
    expect(parseYaml('a: [', 'x.yml', errors)).toBeUndefined();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^x\.yml: invalid YAML: [^\n]+$/);
  });
});

describe('FieldReader', () => {
  it('trims strings and enforces required and max length', () => {
    const { fields, errors } = reader({ title: '  Forging ', summary: 'too long', empty: '' });
    expect(fields.string('title', { required: true })).toBe('Forging');
    expect(fields.string('missing', { required: true })).toBe('');
    expect(fields.string('missing')).toBeNull();
    expect(fields.string('summary', { max: 3 })).toBe('too long');
    expect(fields.string('empty')).toBeNull();
    expect(errors).toEqual([
      'note.md: missing: is required',
      'note.md: summary: must be at most 3 characters (got 8)',
      'note.md: empty: must be a non-empty string (got "")',
    ]);
  });

  it('validates string lists, choices, lists and unknown keys', () => {
    const { fields, errors } = reader({ tags: [' a ', 'b'], bad: [1], kind: 'hub', other: 'x', list: 'nope' });
    expect(fields.strings('tags')).toEqual(['a', 'b']);
    expect(fields.strings('tags', 1)).toEqual(['a', 'b']);
    expect(fields.strings('bad')).toEqual([]);
    expect(fields.oneOf('kind', ['note', 'hub'], 'note')).toBe('hub');
    expect(fields.oneOf('other', ['note', 'hub'], 'note')).toBe('note');
    expect(fields.list('list')).toEqual([]);
    fields.onlyKeys(['tags', 'bad', 'kind', 'other', 'list']);
    expect(errors).toEqual([
      'note.md: tags: must have at most 1 entries (got 2)',
      'note.md: bad: must be a list of non-empty strings (got [1])',
      'note.md: other: must be one of note | hub (got "x")',
      'note.md: list: must be a list',
    ]);
  });
});
