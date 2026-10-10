/** Plain UTF-16 code-unit order: identical on every machine, unlike localeCompare (keeps --check deterministic). */
export function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
