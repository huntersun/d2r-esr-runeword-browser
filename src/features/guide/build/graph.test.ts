import { describe, expect, it } from 'vitest';
import { buildGraph, type GraphNote } from './graph.ts';

function graphNote(slug: string, extra: Partial<GraphNote> = {}): GraphNote {
  return { slug, file: `notes/${slug}.md`, noteLinks: [], knowFirst: [], related: [], nextOverride: null, ...extra };
}

const spine = {
  steps: [
    { title: 'One', summary: '', notes: ['a', 'b'] },
    { title: 'Two', summary: '', notes: ['c'] },
  ],
  questions: [{ label: 'Q', note: 'q' }],
};

describe('buildGraph', () => {
  it('computes backlinks from body links, knowFirst and related (deduplicated, no self links)', () => {
    const graph = buildGraph(
      [
        graphNote('a', { noteLinks: ['d', 'd', 'a'] }),
        graphNote('b', { knowFirst: ['d'] }),
        graphNote('c', { related: ['d', 'a'] }),
        graphNote('d'),
        graphNote('q'),
      ],
      spine
    );
    expect(graph.errors).toEqual([]);
    expect(graph.backlinks.get('d')).toEqual(['a', 'b', 'c']);
    expect(graph.backlinks.get('a')).toEqual(['c']);
    expect(graph.backlinks.get('q')).toEqual([]);
  });

  it('derives next from spine order across steps, honours overrides, and sets spineStep', () => {
    const graph = buildGraph([graphNote('a'), graphNote('b', { nextOverride: 'q' }), graphNote('c'), graphNote('q')], spine);
    expect(graph.next.get('a')).toBe('b');
    expect(graph.next.get('b')).toBe('q');
    expect(graph.next.get('c')).toBeNull();
    expect(graph.next.get('q')).toBeNull();
    expect(graph.spineStep.get('c')).toBe(1);
    expect(graph.spineStep.get('q')).toBeNull();
  });

  it('reports unknown slugs, duplicates on the spine and orphans', () => {
    const graph = buildGraph(
      [
        graphNote('a', { noteLinks: ['zz'], knowFirst: ['yy'], related: ['xx'], nextOverride: 'ww' }),
        graphNote('b'),
        graphNote('c'),
        graphNote('orphan'),
      ],
      { steps: [{ title: 'One', summary: '', notes: ['a', 'b', 'c', 'a', 'vv'] }], questions: [{ label: 'Q', note: 'uu' }] },
      [{ term: 'T', definition: 'd', note: 'tt' }]
    );
    expect(graph.errors).toEqual([
      'spine.yml: note "a" appears more than once on the spine',
      'spine.yml: steps[0] (One): unknown note "vv"',
      'spine.yml: questions[0]: unknown note "uu"',
      '_glossary.yml: "T": unknown note "tt"',
      'notes/a.md: [[zz]]: unknown note "zz"',
      'notes/a.md: knowFirst: unknown note "yy"',
      'notes/a.md: related: unknown note "xx"',
      'notes/a.md: next: unknown note "ww"',
      'notes/orphan.md: orphan note (not on the spine and not linked from any other note)',
    ]);
  });

  it('rejects a note that references itself', () => {
    const graph = buildGraph(
      [graphNote('a', { knowFirst: ['a'], related: ['a'], nextOverride: 'a' }), graphNote('b'), graphNote('c'), graphNote('q')],
      spine
    );
    expect(graph.errors).toEqual([
      'notes/a.md: knowFirst: a note cannot reference itself',
      'notes/a.md: related: a note cannot reference itself',
      'notes/a.md: next: a note cannot reference itself',
    ]);
  });

  it('does not count a question, glossary owner or next override as an orphan', () => {
    const graph = buildGraph(
      [graphNote('a', { nextOverride: 'n' }), graphNote('b'), graphNote('c'), graphNote('q'), graphNote('n'), graphNote('g')],
      spine,
      [{ term: 'T', definition: 'd', note: 'g' }]
    );
    expect(graph.errors).toEqual([]);
  });
});
