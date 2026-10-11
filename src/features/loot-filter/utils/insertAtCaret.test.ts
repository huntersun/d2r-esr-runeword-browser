import { insertAtCaret } from './insertAtCaret';

describe('insertAtCaret', () => {
  it('inserts at the caret', () => {
    expect(insertAtCaret('abcd', 'ÿc4', 2, 2)).toEqual({ text: 'abÿc4cd', caret: 5 });
  });

  it('replaces the selection', () => {
    expect(insertAtCaret('Rune Name', '{name}', 5, 9)).toEqual({ text: 'Rune {name}', caret: 11 });
    expect(insertAtCaret('Rune Name', '{name}', 9, 5)).toEqual({ text: 'Rune {name}', caret: 11 });
  });

  it('appends without a selection and clamps out-of-range positions', () => {
    expect(insertAtCaret('ab', 'X', null, null)).toEqual({ text: 'abX', caret: 3 });
    expect(insertAtCaret('ab', 'X', 10, 12)).toEqual({ text: 'abX', caret: 3 });
    expect(insertAtCaret('ab', 'X', -2, 0)).toEqual({ text: 'Xab', caret: 1 });
    expect(insertAtCaret('', 'X', 0, 0)).toEqual({ text: 'X', caret: 1 });
  });
});
