/** guide:report: the plain-text maintainer report (notes by freshness state, volatile notes, drafts). */
import type { GuideNote } from '../engine/schema.ts';
import { noteFreshness, type NoteFreshness } from '../engine/freshness.ts';

function wrapList(items: readonly string[], indent = '  ', width = 116): string[] {
  const lines: string[] = [];
  let line = '';
  for (const item of items) {
    const next = line === '' ? item : `${line}, ${item}`;
    if (line !== '' && indent.length + next.length > width) {
      lines.push(`${indent}${line},`);
      line = item;
    } else {
      line = next;
    }
  }
  if (line !== '') lines.push(`${indent}${line}`);
  return lines;
}

const STATE_HEADINGS: Record<NoteFreshness, string> = { review: 'Review', old: 'Old', fresh: 'Fresh', draft: 'Drafts' };

/** Plain-text maintainer report: notes by freshness state with their reasons, volatile notes, drafts. */
export function formatGuideReport(notes: readonly GuideNote[], current: string): string[] {
  const states = notes.map((note) => ({ note, state: noteFreshness(note.verified, current, note.staleReasons) }));
  const count = (state: NoteFreshness) => states.filter((entry) => entry.state === state).length;
  const lines = [
    `Guide report against ESR ${current}: ${String(notes.length)} notes`,
    `  review ${String(count('review'))} · old ${String(count('old'))} · fresh ${String(count('fresh'))} · draft ${String(count('draft'))}`,
  ];
  for (const state of ['review', 'old', 'fresh'] as const) {
    const group = states.filter((entry) => entry.state === state);
    if (group.length === 0) continue;
    lines.push('', `${STATE_HEADINGS[state]} (${String(group.length)}):`);
    for (const { note } of group) {
      lines.push(`  ${note.slug} (verified ${note.verified ?? ''})`);
      for (const reason of note.staleReasons) lines.push(`    - ${reason}`);
    }
  }
  const volatile = states.filter((entry) => entry.note.volatility === 'high');
  lines.push('', `Volatility high (${String(volatile.length)}): re-check these after every patch`);
  lines.push(...wrapList(volatile.map(({ note, state }) => `${note.slug} [${state}]`)));
  const drafts = states.filter((entry) => entry.state === 'draft');
  lines.push('', `Drafts (${String(drafts.length)}): verify in-game, then npm run guide:verify -- <slug>`);
  lines.push(...wrapList(drafts.map(({ note }) => note.slug)));
  return lines;
}
