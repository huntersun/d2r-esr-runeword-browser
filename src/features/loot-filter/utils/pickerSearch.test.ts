import { bulkPick, filterPickerOptions, groupPickerOptions, searchText, type PickerOption } from './pickerSearch';

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

  it('ranks matches through searchMore (an item found by its type) below name and code matches', () => {
    const helms = [
      { ...option('usk', 'Demonhead'), searchMore: 'helm helm armor armo' },
      option('zhb', 'Zakarum Helm'),
      { ...option('hlm', 'Full Helm'), searchMore: 'helm helm' },
    ];
    expect(filterPickerOptions(helms, 'helm').matches.map((match) => match.value)).toEqual(['zhb', 'hlm', 'usk']);
    expect(filterPickerOptions(helms, 'demon armor').matches.map((match) => match.value)).toEqual(['usk']);
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

describe('bulkPick', () => {
  const items = [
    { ...option('hlm', 'Full Helm'), searchMore: 'helm' },
    { ...option('usk', 'Demonhead'), searchMore: 'helm', muted: true },
    { ...option('cap', 'Cap'), searchMore: 'helm' },
    option('hax', 'Hand Axe'),
  ];

  it('adds every unpicked match beyond the shown ones, skipping muted options', () => {
    expect(bulkPick(items, 'helm', ['cap'])).toEqual({ action: 'add', values: ['hlm'], skipped: 1 });
    const many = Array.from({ length: 250 }, (_, index) => option(`c${String(index)}`, `Charm ${String(index)}`));
    expect(bulkPick(many, 'charm', [])?.values).toHaveLength(250);
  });

  it('removes the picked matches (muted ones too) once every unmuted match is picked', () => {
    expect(bulkPick(items, 'helm', ['hlm', 'cap', 'usk', 'hax'])).toEqual({ action: 'remove', values: ['hlm', 'usk', 'cap'], skipped: 0 });
  });

  it('offers nothing for an empty query or when nothing can be added or removed', () => {
    expect(bulkPick(items, '  ', [])).toBeNull();
    expect(bulkPick(items, 'demonhead', [])).toBeNull();
    expect(bulkPick(items, 'nothing', [])).toBeNull();
  });

  it('counts a value shared by two options once', () => {
    expect(bulkPick([option('5', 'Crest'), { ...option('5', 'Ward'), key: 'Set:5' }], '', [])).toBeNull();
    expect(
      bulkPick(
        [
          { ...option('5', 'Crest'), search: 'x' },
          { ...option('5', 'Ward'), key: 'Set:5', search: 'x' },
        ],
        'x',
        []
      )?.values
    ).toEqual(['5']);
  });
});
