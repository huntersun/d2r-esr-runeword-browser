import { filterPickerOptions, groupPickerOptions, searchText, type PickerOption } from './pickerSearch';

const option = (value: string, label: string, group?: string): PickerOption => ({
  key: value,
  value,
  label,
  group,
  search: searchText(label, value),
});

const OPTIONS = [option('r31', 'Jah Rune'), option('r33', 'Zod Rune'), option('hax', 'Hand Axe'), option('zhb', 'Zakarum Helm')];

describe('searchText', () => {
  it('lowercases and joins the non-empty parts', () => {
    expect(searchText('Zod Rune', 'r33', undefined, '', 7)).toBe('zod rune r33 7');
  });
});

describe('filterPickerOptions', () => {
  it('lists everything in order for an empty query', () => {
    expect(filterPickerOptions(OPTIONS, '  ').matches.map((match) => match.value)).toEqual(['r31', 'r33', 'hax', 'zhb']);
  });

  it('matches every term against name and code, case-insensitively', () => {
    expect(filterPickerOptions(OPTIONS, 'RUNE').matches.map((match) => match.value)).toEqual(['r31', 'r33']);
    expect(filterPickerOptions(OPTIONS, 'rune r33').matches.map((match) => match.value)).toEqual(['r33']);
    expect(filterPickerOptions(OPTIONS, 'nothing').total).toBe(0);
  });

  it('ranks exact and prefix matches first', () => {
    expect(filterPickerOptions(OPTIONS, 'z').matches.map((match) => match.value)).toEqual(['r33', 'zhb']);
    expect(filterPickerOptions(OPTIONS, 'hax').matches.map((match) => match.value)).toEqual(['hax']);
    const codes = [option('ab', 'Thing ab'), option('a', 'Other')];
    expect(filterPickerOptions(codes, 'a').matches.map((match) => match.value)).toEqual(['a', 'ab']);
  });

  it('caps the matches and reports the total', () => {
    const result = filterPickerOptions(OPTIONS, '', 2);
    expect(result.matches).toHaveLength(2);
    expect(result.total).toBe(4);
  });
});

describe('groupPickerOptions', () => {
  it('groups in order of first appearance', () => {
    const groups = groupPickerOptions([option('1', 'A', 'Act 1'), option('40', 'B', 'Act 2'), option('2', 'C', 'Act 1'), option('x', 'D')]);
    expect(groups.map((group) => [group.heading, group.options.map((entry) => entry.value)])).toEqual([
      ['Act 1', ['1', '2']],
      ['Act 2', ['40']],
      ['', ['x']],
    ]);
  });
});
