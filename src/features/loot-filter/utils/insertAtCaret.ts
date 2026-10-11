export interface CaretInsert {
  readonly text: string;
  /** Where the caret goes after the insert: right after the inserted text. */
  readonly caret: number;
}

/**
 * Puts `insert` into `text` in place of the selection `start`–`end` (both clamped to the text; a reversed
 * selection is swapped). A missing selection (`null`, as from an input that was never focused) appends.
 */
export function insertAtCaret(text: string, insert: string, start: number | null, end: number | null): CaretInsert {
  const clamp = (value: number) => Math.min(text.length, Math.max(0, value));
  const from = clamp(start ?? text.length);
  const to = clamp(end ?? start ?? text.length);
  const [low, high] = from <= to ? [from, to] : [to, from];
  return { text: text.slice(0, low) + insert + text.slice(high), caret: low + insert.length };
}
