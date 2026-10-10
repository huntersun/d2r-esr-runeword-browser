/**
 * How current a note's text is, compared with the ESR version the generated blocks were resolved against.
 *
 * - draft: never verified in-game
 * - fresh: verified against the current version or a newer one
 * - outdated: verified against an older patch of the same major.minor
 * - old: verified against a different major.minor
 */
export type NoteFreshness = 'draft' | 'fresh' | 'outdated' | 'old';

function parseVersion(version: string): number[] {
  return version
    .trim()
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}

/** Negative when a < b, 0 when equal, positive when a > b (missing parts count as 0). */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function noteFreshness(verified: string | null, current: string): NoteFreshness {
  if (verified === null || verified.trim() === '') return 'draft';
  if (compareVersions(verified, current) >= 0) return 'fresh';
  const [vMajor = 0, vMinor = 0] = parseVersion(verified);
  const [cMajor = 0, cMinor = 0] = parseVersion(current);
  return vMajor === cMajor && vMinor === cMinor ? 'outdated' : 'old';
}
