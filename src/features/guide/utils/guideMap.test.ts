import { describe, expect, it } from 'vitest';
import type { GuideBundle } from '../engine/schema';
import { makeNote } from '../engine/testNote.mock';
import { groupNotesForMap } from './guideMap';

function bundle(slugs: Record<string, string>, steps: string[][]): Pick<GuideBundle, 'notes' | 'spine'> {
  return {
    notes: Object.entries(slugs).map(([slug, title]) => makeNote({ slug, title })),
    spine: { steps: steps.map((notes, i) => ({ title: `Step ${String(i)}`, summary: `Summary ${String(i)}`, notes })), questions: [] },
  };
}

const slugsOf = (notes: readonly { slug: string }[]) => notes.map((note) => note.slug);

describe('groupNotesForMap', () => {
  it('groups spine notes by step in spine order, then the other notes alphabetically with the glossary last', () => {
    const groups = groupNotesForMap(
      bundle({ glossary: 'Glossary', c: 'Cube', zeta: 'Zeta', a: 'Alpha', b: 'Beta', alpha2: 'alpha two', s: 'Start' }, [['c', 'a'], ['b']])
    );
    expect(groups.map((g) => (g.kind === 'step' ? [g.kind, g.index, g.step.title, slugsOf(g.notes)] : [g.kind, slugsOf(g.notes)]))).toEqual(
      [
        ['step', 0, 'Step 0', ['c', 'a']],
        ['step', 1, 'Step 1', ['b']],
        ['other', ['alpha2', 's', 'zeta', 'glossary']],
      ]
    );
  });

  it('lists every note exactly once, skips unknown spine slugs and keeps a duplicate on its first step', () => {
    const notes = { a: 'A', b: 'B', c: 'C', d: 'D' };
    const groups = groupNotesForMap(
      bundle(notes, [
        ['a', 'ghost', 'b'],
        ['b', 'c'],
      ])
    );
    const all = groups.flatMap((g) => slugsOf(g.notes));
    expect(all.sort()).toEqual(Object.keys(notes).sort());
    expect(slugsOf(groups[1]?.notes ?? [])).toEqual(['c']);
  });

  it('leaves out the other group when every note is on the spine, and keeps empty steps', () => {
    const groups = groupNotesForMap(bundle({ a: 'A' }, [['a'], []]));
    expect(groups.map((g) => g.kind)).toEqual(['step', 'step']);
    expect(groups[1]?.notes).toEqual([]);
  });
});
