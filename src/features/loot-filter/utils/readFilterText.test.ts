import { checkFilterText, importDescription } from './readFilterText';

describe('checkFilterText', () => {
  it('returns the text notes apart from the diagnostics', () => {
    const check = checkFilterText('{"formatVersion": 1, "title": " T ", "rules": [{"hide": true, "odd": 1},]}');
    expect(check).toMatchObject({ ok: true, title: 'T', diagnostics: [expect.objectContaining({ path: 'rules/0/odd' })] });
    if (check.ok) expect(check.notes).toEqual([expect.objectContaining({ severity: 'warning', path: '' })]);
  });

  it('refuses a syntax error with its position', () => {
    expect(checkFilterText('{"formatVersion": 1,, "rules": []}')).toEqual({
      ok: false,
      message: expect.stringMatching(/line 1, column 21/) as unknown,
    });
  });
});

describe('importDescription', () => {
  it('is empty without problems', () => {
    expect(importDescription(0, [])).toBeUndefined();
  });

  it('counts the problems and spells out the notes', () => {
    const note = { severity: 'warning' as const, path: '', message: '2 comments inside the file are dropped' };
    expect(importDescription(3, [note])).toBe('3 problems to review in the editor. 2 comments inside the file are dropped.');
    expect(importDescription(1, [])).toBe('1 problem to review in the editor.');
  });
});
