/**
 * A minimal JSON-with-comments reader for loot filter files: `//` line comments anywhere outside
 * strings, an optional BOM and CRLF line ends. Block comments and trailing commas are not accepted
 * (the guide allows `//` comments only).
 */

export interface JsoncParseResult {
  readonly value: unknown;
  /** The `//` comment lines before the opening value, verbatim (including `//`, without the line break). */
  readonly leadingComments: string[];
}

/** Thrown for text that is not valid JSON once comments are removed; `line` and `column` are 1-based. */
export class JsoncSyntaxError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(`${message} (line ${String(line)}, column ${String(column)})`);
    this.name = 'JsoncSyntaxError';
    this.line = line;
    this.column = column;
  }
}

/** Replaces every `//` comment outside strings with spaces, so offsets stay those of the source. */
function blankComments(text: string): { readonly stripped: string; readonly leadingComments: string[] } {
  const leadingComments: string[] = [];
  let out = '';
  let inString = false;
  let seenValue = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (ch === '\\' && i + 1 < text.length) {
        out += text[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      let end = text.indexOf('\n', i);
      if (end === -1) end = text.length;
      const comment = text.slice(i, end).replace(/\r$/, '');
      if (!seenValue) leadingComments.push(comment);
      out += ' '.repeat(end - i);
      i = end;
      continue;
    }
    if (ch === '"') inString = true;
    if (ch !== ' ' && ch !== '\t' && ch !== '\r' && ch !== '\n') seenValue = true;
    out += ch;
    i++;
  }
  return { stripped: out, leadingComments };
}

function lineAndColumn(text: string, offset: number): { readonly line: number; readonly column: number } {
  const before = text.slice(0, Math.max(0, Math.min(offset, text.length)));
  const lines = before.split('\n');
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

/** Parses JSON with `//` comments; throws {@link JsoncSyntaxError} on invalid JSON. */
export function parseJsonc(text: string): JsoncParseResult {
  const source = text.startsWith('﻿') ? text.slice(1) : text;
  const { stripped, leadingComments } = blankComments(source);
  try {
    return { value: JSON.parse(stripped) as unknown, leadingComments };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const position = /position (\d+)/.exec(message);
    const offset = position ? Number(position[1]) : stripped.trimEnd().length;
    const { line, column } = lineAndColumn(stripped, offset);
    const reason = message.replace(/\s*(in JSON )?at position \d+.*$/s, '').replace(/^JSON\.parse: /, '');
    throw new JsoncSyntaxError(`Invalid JSON: ${reason || 'unexpected end of input'}`, line, column);
  }
}
