/**
 * Socket filter of the runeword and gemword screens: an inclusive `[min, max]`
 * range within the possible socket counts. Exact counts are ranges with
 * `min === max`. `null` means "no socket filter".
 *
 * Text form (typed by the user and used in the `sockets` share-URL param):
 * `4` (exactly 4), `2-4` (2 to 4), `-4` (up to 4), `4-` (4 or more).
 */
export interface SocketRange {
  readonly min: number;
  readonly max: number;
}

export const SOCKET_COUNT_RANGE = { min: 1, max: 6 } as const;

const SOCKET_RANGE_PATTERN = /^(\d*)(-?)(\d*)$/;

function parseBound(digits: string, fallback: number): number {
  return digits === '' ? fallback : parseInt(digits, 10);
}

/** Parses the text form; `null` for empty, malformed or out-of-range input. */
export function parseSocketRange(text: string): SocketRange | null {
  const match = SOCKET_RANGE_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, minDigits, dash, maxDigits] = match;
  if (minDigits === '' && maxDigits === '') return null;

  const min = parseBound(minDigits, SOCKET_COUNT_RANGE.min);
  const max = dash === '' ? min : parseBound(maxDigits, SOCKET_COUNT_RANGE.max);
  if (min < SOCKET_COUNT_RANGE.min || max > SOCKET_COUNT_RANGE.max || min > max) return null;
  return { min, max };
}

/** Canonical text form: `4` for an exact count, `2-4` for a range; `''` for no filter. */
export function formatSocketRange(range: SocketRange | null): string {
  if (range === null) return '';
  return range.min === range.max ? String(range.min) : `${String(range.min)}-${String(range.max)}`;
}

/** Whether a recipe whose socket count spans `[sockets, socketsMax]` can be made with a count inside the filter range. */
export function socketRangeOverlaps(range: SocketRange | null, sockets: number, socketsMax: number = sockets): boolean {
  if (range === null) return true;
  return range.min <= socketsMax && range.max >= sockets;
}
