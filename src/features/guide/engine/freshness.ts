/**
 * How current a note's text is, compared with the ESR version the generated blocks were resolved against.
 *
 * - draft: never verified in-game
 * - old: verified against a different major.minor
 * - review: verified against an older patch AND the build flagged something (staleReasons: changed data blocks, patch
 *   notes that mention the note)
 * - fresh: verified against the current or a newer version, or an older patch with nothing flagged
 */
export type NoteFreshness = 'draft' | 'fresh' | 'review' | 'old';

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

export function noteFreshness(verified: string | null, current: string, staleReasons: readonly string[] = []): NoteFreshness {
  if (verified === null || verified.trim() === '') return 'draft';
  const [vMajor = 0, vMinor = 0] = parseVersion(verified);
  const [cMajor = 0, cMinor = 0] = parseVersion(current);
  if (vMajor !== cMajor || vMinor !== cMinor) return 'old';
  return compareVersions(verified, current) < 0 && staleReasons.length > 0 ? 'review' : 'fresh';
}
