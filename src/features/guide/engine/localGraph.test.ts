import { describe, expect, it } from 'vitest';
import {
  LOCAL_GRAPH_LABEL_MAX_CHARS,
  LOCAL_GRAPH_LABEL_GAP,
  LOCAL_GRAPH_MAX_NEIGHBOURS,
  LOCAL_GRAPH_NODE_RADIUS,
  labelWidth,
  layoutLocalGraph,
  sideLabelFit,
  truncateLabel,
} from './localGraph';
import type { GuideBundle, GuideNote } from './schema';
import { makeNote } from './testNote.mock';

function note(slug: string, edges: Partial<Pick<GuideNote, 'knowFirst' | 'related' | 'backlinks' | 'next'>> = {}): GuideNote {
  return makeNote({ slug, title: `Title ${slug}`, ...edges });
}

function bundle(notes: GuideNote[], extraSlugs: string[] = []): GuideBundle {
  return { notes: [...notes, ...extraSlugs.map((slug) => note(slug))], spine: { steps: [], questions: [] }, glossary: [], sourceRefs: [] };
}

const SIZE = { width: 400, height: 360 };
const letters = (count: number, prefix: string) => Array.from({ length: count }, (_, i) => `${prefix}${String(i)}`);

describe('layoutLocalGraph', () => {
  it('returns only the current node, centred, when there are no neighbours', () => {
    const current = note('alone');
    const graph = layoutLocalGraph(current, bundle([current]), SIZE);
    expect(graph.nodes).toEqual([{ slug: 'alone', title: 'Title alone', label: 'Title alone', kind: 'current', x: 200, y: 180 }]);
    expect(graph.edges).toEqual([]);
  });

  it('puts knowFirst on the left, related/backlinks on the right and next at the bottom', () => {
    const current = note('c', { knowFirst: ['k'], related: ['r'], backlinks: ['b'], next: 'n' });
    const graph = layoutLocalGraph(current, bundle([current], ['k', 'r', 'b', 'n']), SIZE);
    const at = (slug: string) => graph.nodes.find((n) => n.slug === slug);

    expect(at('k')?.x).toBeLessThan(200);
    expect(at('k')?.y).toBe(180);
    expect(at('r')?.x).toBeGreaterThan(200);
    expect(at('b')?.x).toBeGreaterThan(200);
    // Related above backlinks on the right arc
    expect(at('r')?.y ?? 0).toBeLessThan(at('b')?.y ?? 0);
    expect(at('n')).toMatchObject({ kind: 'next', x: 200 });
    expect(at('n')?.y).toBeGreaterThan(180);

    expect(graph.edges).toEqual([
      { from: 'k', to: 'c', kind: 'knowFirst' },
      { from: 'c', to: 'n', kind: 'next' },
      { from: 'c', to: 'r', kind: 'related' },
      { from: 'b', to: 'c', kind: 'backlink' },
    ]);
  });

  it('is deterministic and spreads an arc symmetrically top to bottom', () => {
    const current = note('c', { related: ['r0', 'r1', 'r2'] });
    const all = bundle([current], ['r0', 'r1', 'r2']);
    const first = layoutLocalGraph(current, all, SIZE);
    expect(layoutLocalGraph(current, all, SIZE)).toEqual(first);

    const [r0, r1, r2] = first.nodes.slice(1);
    expect(r1?.y).toBe(180);
    expect(r0?.y ?? 0).toBeLessThan(180);
    expect((r0?.y ?? 0) + (r2?.y ?? 0)).toBeCloseTo(360, 1);
    expect(r0?.x).toBe(r2?.x);
  });

  it('dedupes: next beats knowFirst beats related beats backlink', () => {
    const current = note('c', { knowFirst: ['a', 'b'], related: ['a', 'b', 'd'], backlinks: ['b', 'd', 'e'], next: 'a' });
    const graph = layoutLocalGraph(current, bundle([current], ['a', 'b', 'd', 'e']), SIZE);
    expect(graph.nodes.map((n) => [n.slug, n.kind])).toEqual([
      ['c', 'current'],
      ['b', 'knowFirst'],
      ['d', 'related'],
      ['e', 'backlink'],
      ['a', 'next'],
    ]);
    expect(new Set(graph.edges.map((e) => `${e.from}>${e.to}`)).size).toBe(graph.edges.length);
  });

  it('skips self references and slugs missing from the bundle', () => {
    const current = note('c', { related: ['c', 'ghost', 'r'], backlinks: ['c'] });
    const graph = layoutLocalGraph(current, bundle([current], ['r']), SIZE);
    expect(graph.nodes.map((n) => n.slug)).toEqual(['c', 'r']);
  });

  it('caps the neighbours: knowFirst, next and related first, then backlinks', () => {
    const knowFirst = letters(3, 'k');
    const related = letters(5, 'r');
    const backlinks = letters(4, 'b');
    const current = note('c', { knowFirst, related, backlinks, next: 'n' });
    const graph = layoutLocalGraph(current, bundle([current], [...knowFirst, ...related, ...backlinks, 'n']), SIZE);

    expect(graph.nodes).toHaveLength(LOCAL_GRAPH_MAX_NEIGHBOURS + 1);
    expect(graph.edges).toHaveLength(LOCAL_GRAPH_MAX_NEIGHBOURS);
    const slugs = graph.nodes.map((n) => n.slug);
    expect(slugs).toEqual(['c', 'k0', 'k1', 'k2', 'r0', 'r1', 'r2', 'r3', 'n']);
    expect(slugs.some((s) => s.startsWith('b'))).toBe(false);
  });

  it('fills the cap with backlinks when there are few other neighbours', () => {
    const backlinks = letters(10, 'b');
    const current = note('c', { related: ['r'], backlinks });
    const graph = layoutLocalGraph(current, bundle([current], ['r', ...backlinks]), SIZE);
    expect(graph.nodes.map((n) => n.slug)).toEqual(['c', 'r', ...backlinks.slice(0, 7)]);
    // All inside the box
    for (const n of graph.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(SIZE.width);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeLessThanOrEqual(SIZE.height);
    }
  });
});

describe('truncateLabel', () => {
  it('keeps short labels and cuts long ones with an ellipsis', () => {
    expect(truncateLabel('Forging')).toBe('Forging');
    expect(truncateLabel('Exactly eighteen c')).toBe('Exactly eighteen c');
    expect(truncateLabel('Enhancement order and more')).toBe('Enhancement order…');
    expect(truncateLabel('Cube basics and stuff', 12)).toBe('Cube basics…');
  });
});

describe('side label fit', () => {
  const LONG = 'Adding and removing sockets';
  const offset = LOCAL_GRAPH_NODE_RADIUS + LOCAL_GRAPH_LABEL_GAP;

  /** Every side label's estimated extent stays inside [0, width]. */
  function expectLabelsInside(width: number, fontSize: number, titles: string[]) {
    const current = note('c', { knowFirst: titles.slice(0, 2), related: titles.slice(2) });
    const graph = layoutLocalGraph(current, bundle([current], titles), { width, height: 360, fontSize });
    for (const node of graph.nodes) {
      const w = labelWidth(node.label, fontSize);
      if (node.kind === 'knowFirst') expect(node.x - offset - w).toBeGreaterThanOrEqual(0);
      else if (node.kind === 'related' || node.kind === 'backlink') expect(node.x + offset + w).toBeLessThanOrEqual(width);
      else expect(w).toBeLessThanOrEqual(width);
    }
    return graph;
  }

  it('keeps full 18-char labels inside a wide box and spreads the arcs wider for short titles', () => {
    expect(sideLabelFit([LONG], 420, 12).maxChars).toBe(LOCAL_GRAPH_LABEL_MAX_CHARS);
    expect(sideLabelFit(['Ab'], 420, 12).rx).toBeGreaterThan(sideLabelFit([LONG], 420, 12).rx);
    expect(sideLabelFit([], 420, 12).rx).toBe(420 / 2 - offset - 4);
  });

  it('truncates harder instead of squeezing the arcs in a narrow box or with a large font', () => {
    const narrow = sideLabelFit([LONG], 300, 12);
    expect(narrow.maxChars).toBeLessThan(LOCAL_GRAPH_LABEL_MAX_CHARS);
    expect(narrow.rx).toBeGreaterThanOrEqual(300 * 0.14);
    expect(sideLabelFit([LONG], 400, 16).maxChars).toBeLessThan(sideLabelFit([LONG], 400, 12).maxChars);
  });

  it('places every label inside the box', () => {
    const titles = ['Adding and removing sockets', 'The Starter Pack', 'Runewords and gemwords', 'Unique charms', 'Wide WWWWWW title'];
    for (const [width, fontSize] of [
      [300, 12],
      [352, 12],
      [400, 12],
      [400, 16],
      [260, 18],
    ] as const) {
      expectLabelsInside(width, fontSize, titles);
    }
  });
});
