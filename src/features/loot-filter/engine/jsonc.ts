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

/**
 * Thrown for text that is not valid JSON once comments are removed. `line` and `column` are 1-based and only set
 * when the error could be located (some engines' messages carry no position).
 */
export class JsoncSyntaxError extends Error {
  readonly line?: number;
  readonly column?: number;

  constructor(message: string, line?: number, column?: number) {
    super(line === undefined || column === undefined ? message : `${message} (line ${String(line)}, column ${String(column)})`);
    this.name = 'JsoncSyntaxError';
    if (line !== undefined && column !== undefined) {
      this.line = line;
      this.column = column;
    }
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

interface Location {
  readonly line: number;
  readonly column: number;
}

function lineAndColumn(text: string, offset: number): Location {
  const before = text.slice(0, Math.max(0, Math.min(offset, text.length)));
  const lines = before.split('\n');
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

/** Characters that never appear outside a string in valid JSON, so their first such occurrence is the error. */
function isNeverValidOutsideStrings(ch: string): boolean {
  return !/[\s{}[\],:"0-9a-zA-Z+.-]/.test(ch);
}

/** Offset of the first `token` outside a string, or -1. */
function firstOutsideStrings(text: string, token: string): number {
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === token) return i;
  }
  return -1;
}

/** Where `JSON.parse` failed, from its message: V8's `position N`, Firefox's `line L column C`, or a guess. */
function errorLocation(message: string, text: string): Location | undefined {
  const position = /position (\d+)/.exec(message);
  if (position) return lineAndColumn(text, Number(position[1]));
  const lineColumn = /line (\d+) column (\d+)/.exec(message);
  if (lineColumn) return { line: Number(lineColumn[1]), column: Number(lineColumn[2]) };
  if (/end of (JSON )?(input|data)/i.test(message)) return lineAndColumn(text, text.trimEnd().length);
  // V8: `Unexpected token 'x', "…snippet…" is not valid JSON` has no position.
  const token = /^Unexpected token '(.)'/.exec(message)?.[1];
  if (token !== undefined && isNeverValidOutsideStrings(token)) {
    const offset = firstOutsideStrings(text, token);
    if (offset >= 0) return lineAndColumn(text, offset);
  }
  return undefined;
}

/** The engine's message without its position and without V8's copy of the source snippet. */
function errorReason(message: string): string {
  return message
    .replace(/^JSON\.parse: /, '')
    .replace(/, .*is not valid JSON$/s, '')
    .replace(/\s*(in JSON )?at position \d+.*$/s, '')
    .replace(/\s*at line \d+ column \d+ of the JSON data$/, '');
}

/** Parses JSON with `//` comments; throws {@link JsoncSyntaxError} on invalid JSON. */
export function parseJsonc(text: string): JsoncParseResult {
  const source = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const { stripped, leadingComments } = blankComments(source);
  try {
    return { value: JSON.parse(stripped) as unknown, leadingComments };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const location = errorLocation(message, stripped);
    throw new JsoncSyntaxError(`Invalid JSON: ${errorReason(message) || 'unexpected end of input'}`, location?.line, location?.column);
  }
}
