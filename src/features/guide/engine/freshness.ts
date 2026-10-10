/**
 * How current a note's text is, compared with the ESR version the generated blocks were resolved against.
 *
 * - draft: never verified in-game
 * - old: verified against a different major.minor
 * - review: verified against an older patch AND the build flagged something (staleReasons: changed data blocks, patch
 *   notes that mention the note)
 * - fresh: verified against the current or a newer version, or an older patch with nothing flagged
 *
 * Shared code: relative `.ts` imports only, no DOM.
 */
import { compareVersions } from '../../../core/utils/versionUtils.ts';

export type NoteFreshness = 'draft' | 'fresh' | 'review' | 'old';

function majorMinor(version: string): [number, number] {
  const [major = 0, minor = 0] = version
    .trim()
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
  return [major, minor];
}

export function noteFreshness(verified: string | null, current: string, staleReasons: readonly string[] = []): NoteFreshness {
  if (verified === null || verified.trim() === '') return 'draft';
  const [vMajor, vMinor] = majorMinor(verified);
  const [cMajor, cMinor] = majorMinor(current);
  if (vMajor !== cMajor || vMinor !== cMinor) return 'old';
  return compareVersions(verified, current) < 0 && staleReasons.length > 0 ? 'review' : 'fresh';
}
