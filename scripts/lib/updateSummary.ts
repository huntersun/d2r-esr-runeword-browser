/**
 * Pure formatting helpers for scripts/update-game-data.ts.
 */

export interface ManifestSnapshot {
  esrVersion: string;
  esrTag: string | null;
  esrCommit: string;
  counts: Record<string, number>;
  warnings: string[];
}

/** "a → b", or just "a (unchanged)" when equal. */
export function formatChange(before: string, after: string): string {
  return before === after ? `${after} (unchanged)` : `${before} → ${after}`;
}

export function shortCommit(commit: string | null | undefined): string {
  return commit ? commit.slice(0, 7) : '(none)';
}

/** One line per count that changed (added, removed or different), e.g. "bases: 653 → 660 (+7)". */
export function diffCounts(before: Record<string, number>, after: Record<string, number>): string[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const lines: string[] = [];
  for (const key of keys) {
    const a: number | undefined = key in before ? before[key] : undefined;
    const b: number | undefined = key in after ? after[key] : undefined;
    if (a === b) continue;
    if (a === undefined) lines.push(`${key}: (new) ${String(b)}`);
    else if (b === undefined) lines.push(`${key}: ${String(a)} → (removed)`);
    else lines.push(`${key}: ${String(a)} → ${String(b)} (${b > a ? '+' : ''}${String(b - a)})`);
  }
  return lines;
}

/** Changed paths from `git status --porcelain` output. */
export function parsePorcelain(output: string): string[] {
  return output
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => line.slice(3));
}

export interface SummaryInput {
  before: ManifestSnapshot | null;
  after: ManifestSnapshot | null;
  steps: { name: string; ok: boolean; note?: string }[];
  changedFiles: string[];
}

export function formatSummary({ before, after, steps, changedFiles }: SummaryInput): string[] {
  const out: string[] = [];
  const version = (m: ManifestSnapshot | null) => m?.esrVersion ?? '(none)';
  const tag = (m: ManifestSnapshot | null) => m?.esrTag ?? '(none)';
  out.push(`ESR version: ${formatChange(version(before), version(after))}`);
  out.push(`ESR tag:     ${formatChange(tag(before), tag(after))}`);
  out.push(`ESR commit:  ${formatChange(shortCommit(before?.esrCommit), shortCommit(after?.esrCommit))}`);

  const countLines = diffCounts(
    { ...before?.counts, warnings: before?.warnings.length ?? 0 },
    { ...after?.counts, warnings: after?.warnings.length ?? 0 }
  );
  out.push('', countLines.length > 0 ? 'Changed counts:' : 'Counts: unchanged');
  for (const line of countLines) out.push(`  ${line}`);

  const warnings = after?.warnings ?? [];
  out.push('', `Generator warnings (${String(warnings.length)}):`);
  for (const warning of warnings) out.push(`  - ${warning}`);

  out.push('', 'Steps:');
  for (const step of steps) out.push(`  ${step.ok ? 'OK  ' : 'FAIL'} ${step.name}${step.note ? ` (${step.note})` : ''}`);

  out.push('', changedFiles.length > 0 ? 'Changed files:' : 'Changed files: none (public/game-data is up to date)');
  for (const file of changedFiles) out.push(`  ${file}`);
  return out;
}
