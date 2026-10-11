import { describe, expect, it } from 'vitest';
import { FULL_GRAPH_LABEL_MAX_CHARS, fullGraphEdges, fullGraphNodeBox, layoutFullGraph } from './fullGraph';
import type { GuideBundle, GuideNote } from './schema';
import { makeNote } from './testNote.mock';

type Edges = Partial<Pick<GuideNote, 'knowFirst' | 'related' | 'next'>>;

function bundle(notes: Record<string, Edges>, steps: string[][] = []): Pick<GuideBundle, 'notes' | 'spine'> {
  return {
    notes: Object.entries(notes).map(([slug, edges]) => makeNote({ slug, title: `Title ${slug}`, ...edges })),
    spine: { steps: steps.map((slugs, i) => ({ title: `Step ${String(i)}`, summary: '', notes: slugs })), questions: [] },
  };
}

/** A guide shaped like the real one: 19 notes on five steps, 12 off the spine, long titles, ~80 edges. */
function guideLike(): Pick<GuideBundle, 'notes' | 'spine'> {
  const steps = [3, 4, 4, 3, 5].map((count, step) => Array.from({ length: count }, (_, i) => `s${String(step)}-${String(i)}`));
  const spineSlugs = steps.flat();
  const offSlugs = Array.from({ length: 12 }, (_, i) => `o${String(i)}`);
  const all = [...spineSlugs, ...offSlugs];
  const titles = [
    'Adding and removing sockets',
    'Death, respec and undoing choices',
    'Forging',
    'Cube basics',
    'Tinkering',
    'Unique charms',
  ];
  const notes = all.map((slug, i) => {
    const pick = (offset: number) => all[(i * 7 + offset) % all.length] ?? slug;
    return makeNote({
      slug,
      title: `${titles[i % titles.length] ?? 'Note'} ${String(i)}`,
      knowFirst: i % 3 === 0 ? [pick(3)] : [],
      related: [pick(5), pick(11), pick(13)],
    });
  });
  return { notes, spine: { steps: steps.map((slugs, i) => ({ title: `Step ${String(i)}`, summary: '', notes: slugs })), questions: [] } };
}

describe('fullGraphEdges', () => {
  it('collects knowFirst (pointing at the note), next and related edges', () => {
    const edges = fullGraphEdges(bundle({ a: { knowFirst: ['k'], next: 'n', related: ['r'] }, k: {}, n: {}, r: {} }));
    expect(edges).toEqual([
      { from: 'k', to: 'a', kind: 'knowFirst' },
      { from: 'a', to: 'n', kind: 'next' },
      { from: 'a', to: 'r', kind: 'related' },
    ]);
  });

  it('derives next edges from the spine order, across step boundaries', () => {
    const edges = fullGraphEdges(bundle({ a: {}, b: {}, c: {} }, [['a', 'b'], ['c']]));
    expect(edges).toEqual([
      { from: 'a', to: 'b', kind: 'next' },
      { from: 'b', to: 'c', kind: 'next' },
    ]);
  });

  it('keeps one edge per pair, in either direction, by priority knowFirst > next > related', () => {
    const edges = fullGraphEdges(
      bundle(
        {
          a: { related: ['b', 'c', 'd'], next: 'c' },
          b: { related: ['a'] },
          c: { related: ['a'] },
          d: { knowFirst: ['a'] },
        },
        [['a', 'c']]
      )
    );
    expect(edges).toEqual([
      { from: 'a', to: 'c', kind: 'next' },
      { from: 'a', to: 'b', kind: 'related' },
      { from: 'a', to: 'd', kind: 'knowFirst' },
    ]);
  });

  it('skips self links and slugs missing from the bundle', () => {
    const edges = fullGraphEdges(bundle({ a: { related: ['a', 'ghost', 'b'], next: 'ghost' }, b: {} }, [['ghost', 'a']]));
    expect(edges).toEqual([{ from: 'a', to: 'b', kind: 'related' }]);
  });
});

describe('layoutFullGraph', () => {
  const SIZE = { width: 1100, height: 660, fontSize: 12 };

  it('places every note exactly once, in bundle order, with its spine step', () => {
    const input = bundle({ a: { related: ['x'] }, b: {}, x: {} }, [['a'], ['b']]);
    const graph = layoutFullGraph(input, SIZE);
    expect(graph.nodes.map((n) => [n.slug, n.step])).toEqual([
      ['a', 0],
      ['b', 1],
      ['x', null],
    ]);
    expect(graph.edges).toEqual(fullGraphEdges(input));
  });

  it('truncates long labels and keeps the full title', () => {
    const input = { ...bundle({ a: {} }), notes: [makeNote({ slug: 'a', title: 'D-stoning, gem melding and Mapling' })] };
    const [node] = layoutFullGraph(input, SIZE).nodes;
    expect(node?.title).toBe('D-stoning, gem melding and Mapling');
    expect(Array.from(node?.label ?? '')).toHaveLength(FULL_GRAPH_LABEL_MAX_CHARS);
    expect(node?.label.endsWith('…')).toBe(true);
  });

  it('is deterministic', () => {
    const input = guideLike();
    expect(layoutFullGraph(guideLike(), SIZE)).toEqual(layoutFullGraph(input, SIZE));
  });

  it('keeps the spine steps in left-to-right column order on average', () => {
    const graph = layoutFullGraph(guideLike(), SIZE);
    const meanX = [0, 1, 2, 3, 4].map((step) => {
      const xs = graph.nodes.filter((n) => n.step === step).map((n) => n.x);
      return xs.reduce((sum, x) => sum + x, 0) / xs.length;
    });
    expect([...meanX].sort((a, b) => a - b)).toEqual(meanX);
  });

  it('keeps every node box (circle + label) inside the box, at several sizes and font sizes', () => {
    for (const size of [
      SIZE,
      { width: 900, height: 560, fontSize: 12 },
      { width: 1300, height: 780, fontSize: 16 },
      { width: 400, height: 300, fontSize: 12 },
    ]) {
      for (const node of layoutFullGraph(guideLike(), size).nodes) {
        const box = fullGraphNodeBox(node, size.fontSize);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(size.width);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.bottom).toBeLessThanOrEqual(size.height);
      }
    }
  });

  it('does not overlap labels for a guide-sized bundle at desktop sizes', () => {
    for (const size of [SIZE, { width: 900, height: 560, fontSize: 12 }]) {
      const boxes = layoutFullGraph(guideLike(), size).nodes.map((node) => fullGraphNodeBox(node, size.fontSize));
      const overlapping = boxes.flatMap((a, i) =>
        boxes.slice(i + 1).filter((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
      );
      expect(overlapping).toEqual([]);
    }
  });

  it('handles an empty bundle and a single note', () => {
    expect(layoutFullGraph(bundle({}), SIZE)).toEqual({ nodes: [], edges: [] });
    const [node] = layoutFullGraph(bundle({ a: {} }, [['a']]), SIZE).nodes;
    expect(node?.x).toBeGreaterThan(0);
    expect(node?.y).toBeGreaterThan(0);
  });
});
