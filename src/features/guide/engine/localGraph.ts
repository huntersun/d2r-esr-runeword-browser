/**
 * Layout of the "local graph" beside a note (desktop only): the note in the centre, its direct neighbours around it.
 * Pure and deterministic (no DOM); unit-tested in localGraph.test.ts.
 *
 * Shared code: relative `.ts` imports only, no DOM.
 */
import type { GuideBundle, GuideNote } from './schema.ts';

export type LocalGraphNodeKind = 'current' | 'knowFirst' | 'related' | 'next' | 'backlink';
export type LocalGraphEdgeKind = Exclude<LocalGraphNodeKind, 'current'>;

export interface LocalGraphNode {
  readonly slug: string;
  readonly title: string;
  readonly kind: LocalGraphNodeKind;
  readonly x: number;
  readonly y: number;
}

/** Directed: knowFirst and backlink edges point at the current note, related and next edges away from it. */
export interface LocalGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: LocalGraphEdgeKind;
}

export interface LocalGraph {
  readonly nodes: LocalGraphNode[];
  readonly edges: LocalGraphEdge[];
}

export interface LocalGraphSize {
  readonly width: number;
  readonly height: number;
}

/** Most neighbours drawn around the current note. */
export const LOCAL_GRAPH_MAX_NEIGHBOURS = 8;

/** Horizontal room kept free on each side for the labels of the left/right arcs (they sit beside their node). */
const LABEL_ROOM = 0.3;
/** Vertical room kept free at the top and bottom (the next node's label sits below it). */
const VERTICAL_ROOM = 0.12;
/** Half the angular span of the left/right arcs, and the widest gap between two nodes of an arc (degrees). */
const ARC_HALF_SPAN = 50;
const ARC_MAX_STEP = 25;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Angles (degrees, SVG orientation: y grows downwards) for `count` nodes spread evenly around `centre`, top first. */
function arcAngles(count: number, centre: number, topFirstSign: 1 | -1): number[] {
  if (count === 0) return [];
  if (count === 1) return [centre];
  const step = Math.min(ARC_MAX_STEP, (2 * ARC_HALF_SPAN) / (count - 1));
  const start = centre - topFirstSign * ((step * (count - 1)) / 2);
  return Array.from({ length: count }, (_, i) => start + topFirstSign * step * i);
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Neighbours of `note`, deduplicated (next > knowFirst > related > backlink), without the note itself and without
 * slugs missing from the bundle, capped at LOCAL_GRAPH_MAX_NEIGHBOURS in the order knowFirst, next, related, backlinks.
 */
function neighbours(note: GuideNote, titles: ReadonlyMap<string, string>): { slug: string; kind: LocalGraphEdgeKind }[] {
  const kindOf = new Map<string, LocalGraphEdgeKind>();
  const claim = (slugs: readonly string[], kind: LocalGraphEdgeKind) => {
    for (const slug of slugs) if (slug !== note.slug && titles.has(slug) && !kindOf.has(slug)) kindOf.set(slug, kind);
  };
  // Priority order for the dedupe…
  claim(note.next === null ? [] : [note.next], 'next');
  claim(note.knowFirst, 'knowFirst');
  claim(note.related, 'related');
  claim(note.backlinks, 'backlink');

  // …and cap order for the selection (each slug once, with the kind it won).
  const ordered = [...note.knowFirst, ...(note.next === null ? [] : [note.next]), ...note.related, ...note.backlinks];
  const result: { slug: string; kind: LocalGraphEdgeKind }[] = [];
  const seen = new Set<string>();
  for (const slug of ordered) {
    const kind = kindOf.get(slug);
    if (kind === undefined || seen.has(slug)) continue;
    seen.add(slug);
    result.push({ slug, kind });
    if (result.length >= LOCAL_GRAPH_MAX_NEIGHBOURS) break;
  }
  return result;
}

/**
 * Positions in a `size` box: the current note in the centre, knowFirst nodes on the left arc, related and backlink nodes
 * on the right arc (related first), the next note at the bottom. Nodes of an arc are spread evenly around its middle.
 */
export function layoutLocalGraph(note: GuideNote, bundle: GuideBundle, size: LocalGraphSize): LocalGraph {
  const titles = new Map(bundle.notes.map((n) => [n.slug, n.title]));
  const cx = size.width / 2;
  const cy = size.height / 2;
  const rx = size.width * (0.5 - LABEL_ROOM);
  const ry = size.height * (0.5 - VERTICAL_ROOM);

  const chosen = neighbours(note, titles);
  const left = chosen.filter((n) => n.kind === 'knowFirst');
  const right = [...chosen.filter((n) => n.kind === 'related'), ...chosen.filter((n) => n.kind === 'backlink')];
  const bottom = chosen.filter((n) => n.kind === 'next');

  const place = (slug: string, kind: LocalGraphNodeKind, degrees: number): LocalGraphNode => ({
    slug,
    title: titles.get(slug) ?? slug,
    kind,
    x: round(cx + rx * Math.cos(toRadians(degrees))),
    y: round(cy + ry * Math.sin(toRadians(degrees))),
  });

  // Left arc runs from upper-left (230°) down to lower-left (130°); right arc from upper-right (-50°) down to lower-right (50°).
  const leftAngles = arcAngles(left.length, 180, -1);
  const rightAngles = arcAngles(right.length, 0, 1);

  const nodes: LocalGraphNode[] = [
    { slug: note.slug, title: note.title, kind: 'current', x: round(cx), y: round(cy) },
    ...left.map((n, i) => place(n.slug, n.kind, leftAngles[i] ?? 180)),
    ...right.map((n, i) => place(n.slug, n.kind, rightAngles[i] ?? 0)),
    ...bottom.map((n) => place(n.slug, n.kind, 90)),
  ];

  const edges: LocalGraphEdge[] = chosen.map(({ slug, kind }) =>
    kind === 'knowFirst' || kind === 'backlink' ? { from: slug, to: note.slug, kind } : { from: note.slug, to: slug, kind }
  );

  return { nodes, edges };
}
