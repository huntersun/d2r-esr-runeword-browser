import { vi } from 'vitest';
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
    const text = '\uFEFF// hello\r\n{\r\n  "a": "b" // c\r\n}\r\n';
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

  it('locates a single-quoted value and does not repeat the source in the message', () => {
    let caught: unknown;
    try {
      parseJsonc('{\n  "a": 1,\n  "b": \'x\'\n}');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(JsoncSyntaxError);
    if (caught instanceof JsoncSyntaxError) {
      expect(caught.line).toBe(3);
      expect(caught.column).toBe(8);
      expect(caught.message).toMatch(/line 3, column 8/);
      expect(caught.message).not.toMatch(/is not valid JSON/);
      expect(caught.message.match(/"b"/g)).toBeNull();
    }
  });

  it('omits the location when the engine gives none and it cannot be found', () => {
    const parse = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw new SyntaxError('Unexpected token \'}\', "{"a": }" is not valid JSON');
    });
    try {
      let caught: unknown;
      try {
        parseJsonc('{"a": }');
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(JsoncSyntaxError);
      if (caught instanceof JsoncSyntaxError) {
        expect(caught.line).toBeUndefined();
        expect(caught.message).toBe("Invalid JSON: Unexpected token '}'");
      }
    } finally {
      parse.mockRestore();
    }
  });

  it("reads Firefox's line and column", () => {
    const parse = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw new SyntaxError('JSON.parse: unexpected character at line 2 column 5 of the JSON data');
    });
    try {
      expect(() => parseJsonc('{\n  x}')).toThrow('Invalid JSON: unexpected character (line 2, column 5)');
    } finally {
      parse.mockRestore();
    }
  });

  it('throws on an empty or unterminated document', () => {
    expect(() => parseJsonc('// only a comment')).toThrow(JsoncSyntaxError);
    expect(() => parseJsonc('{"a": "b')).toThrow(JsoncSyntaxError);
  });
});
