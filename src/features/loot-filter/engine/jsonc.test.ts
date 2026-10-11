import { JsoncSyntaxError, parseJsonc } from './jsonc.ts';

describe('parseJsonc', () => {
  it('keeps // inside strings and strips comments elsewhere', () => {
    const text = '{\n  "url": "https://x.example/a//b", // trailing comment\n  // own line\n  "n": 1\n}\n// after';
    expect(parseJsonc(text)).toEqual({ value: { url: 'https://x.example/a//b', n: 1 }, leadingComments: [] });
  });

  it('captures the comments before the opening brace verbatim', () => {
    const text = '// first\n  //second  \n\n{"a": [1, // one\n 2]}';
    expect(parseJsonc(text)).toEqual({ value: { a: [1, 2] }, leadingComments: ['// first', '//second  '] });
  });

  it('accepts CRLF and a BOM', () => {
    const text = '﻿// hello\r\n{\r\n  "a": "b" // c\r\n}\r\n';
    expect(parseJsonc(text)).toEqual({ value: { a: 'b' }, leadingComments: ['// hello'] });
  });

  it('handles escaped quotes and backslashes in strings', () => {
    expect(parseJsonc('{"a": "q\\" // not a comment", "b": "\\\\"} // c').value).toEqual({ a: 'q" // not a comment', b: '\\' });
  });

  it('reads \\u00ff escapes and literal ÿ alike', () => {
    expect(parseJsonc('["\\u00ffc4", "ÿc4"]').value).toEqual(['ÿc4', 'ÿc4']);
  });

  it('throws a syntax error with the line and column', () => {
    let caught: unknown;
    try {
      parseJsonc('// c\n{\n  "a": 1\n  "b": 2\n}');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(JsoncSyntaxError);
    if (caught instanceof JsoncSyntaxError) {
      expect(caught.line).toBe(4);
      expect(caught.column).toBe(3);
      expect(caught.message).toMatch(/line 4, column 3/);
    }
  });

  it('throws on an empty or unterminated document', () => {
    expect(() => parseJsonc('// only a comment')).toThrow(JsoncSyntaxError);
    expect(() => parseJsonc('{"a": "b')).toThrow(JsoncSyntaxError);
  });
});
