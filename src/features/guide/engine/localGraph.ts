/**
 * Layout of the "local graph" beside a note (desktop only): the note in the centre, its direct neighbours around it.
 * Pure and deterministic (no DOM); unit-tested in localGraph.test.ts.
 *
 * Shared code: relative `.ts` imports only, no DOM.
 */
import { findNote, noteTitle } from './notes.ts';
import type { GuideBundle, GuideNote } from './schema.ts';

export type LocalGraphNodeKind = 'current' | 'knowFirst' | 'related' | 'next' | 'backlink';
export type LocalGraphEdgeKind = Exclude<LocalGraphNodeKind, 'current'>;

export interface LocalGraphNode {
  readonly slug: string;
  readonly title: string;
  /** Title truncated so the label fits inside the box (see layoutLocalGraph) */
  readonly label: string;
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

export interface LocalGraphLayout {
  readonly nodes: LocalGraphNode[];
  readonly edges: LocalGraphEdge[];
}

export interface LocalGraphSize {
  readonly width: number;
  readonly height: number;
  /** Label font size in the same units as width/height (default 12) */
  readonly fontSize?: number;
}

/** Most neighbours drawn around the current note. */
export const LOCAL_GRAPH_MAX_NEIGHBOURS = 8;

export const LOCAL_GRAPH_CURRENT_RADIUS = 9;
export const LOCAL_GRAPH_NODE_RADIUS = 6;
/** Distance between a node's rim and its label */
export const LOCAL_GRAPH_LABEL_GAP = 5;
/** Estimated average glyph width in em (sans-serif, mixed case; a little generous) */
const LOCAL_GRAPH_LABEL_EM_FACTOR = 0.56;
/** Longest label before truncation */
export const LOCAL_GRAPH_LABEL_MAX_CHARS = 18;
/** Labels are never cut shorter than this, even when the box is tiny */
const LABEL_MIN_CHARS = 8;
/** Free space kept between a side label and the box edge */
const EDGE_PAD = 4;
/** The side arcs never get closer to the centre than this share of the width */
const MIN_RX = 0.14;
/** Vertical room kept free at the top and bottom (the next node's label sits below it). */
const VERTICAL_ROOM = 0.12;
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

/** `text` cut to at most `max` characters, ending in an ellipsis when cut. */
export function truncateLabel(text: string, max = LOCAL_GRAPH_LABEL_MAX_CHARS): string {
  const chars = Array.from(text);
  return chars.length <= max
    ? text
    : `${chars
        .slice(0, max - 1)
        .join('')
        .trimEnd()}…`;
}

/** Estimated rendered width of a label. */
export function labelWidth(label: string, fontSize: number): number {
  return Array.from(label).length * fontSize * LOCAL_GRAPH_LABEL_EM_FACTOR;
}

/**
 * Horizontal radius of the side arcs and the label truncation length: side labels sit beside their node (left of the
 * left arc, right of the right arc), so the arc radius leaves room for the longest side label present. When that would
 * squeeze the arcs below MIN_RX, the labels are truncated shorter instead.
 */
export function sideLabelFit(sideTitles: readonly string[], width: number, fontSize: number): { rx: number; maxChars: number } {
  const half = width / 2;
  const minRx = width * MIN_RX;
  const fixed = EDGE_PAD + LOCAL_GRAPH_NODE_RADIUS + LOCAL_GRAPH_LABEL_GAP;
  const charWidth = fontSize * LOCAL_GRAPH_LABEL_EM_FACTOR;
  const fitting = Math.floor((half - minRx - fixed) / charWidth);
  const maxChars = Math.max(LABEL_MIN_CHARS, Math.min(LOCAL_GRAPH_LABEL_MAX_CHARS, fitting));
  const longest = Math.max(0, ...sideTitles.map((title) => labelWidth(truncateLabel(title, maxChars), fontSize)));
  return { rx: Math.max(minRx, half - fixed - longest), maxChars };
}

/**
 * Neighbours of `note`, deduplicated (next > knowFirst > related > backlink), without the note itself and without
 * slugs missing from the bundle, capped at LOCAL_GRAPH_MAX_NEIGHBOURS in the order knowFirst, next, related, backlinks.
 */
function neighbours(note: GuideNote, bundle: Pick<GuideBundle, 'notes'>): { slug: string; kind: LocalGraphEdgeKind }[] {
  const kindOf = new Map<string, LocalGraphEdgeKind>();
  const claim = (slugs: readonly string[], kind: LocalGraphEdgeKind) => {
    for (const slug of slugs) if (slug !== note.slug && findNote(bundle, slug) !== undefined && !kindOf.has(slug)) kindOf.set(slug, kind);
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
export function layoutLocalGraph(note: GuideNote, bundle: GuideBundle, size: LocalGraphSize): LocalGraphLayout {
  const cx = size.width / 2;
  const cy = size.height / 2;
  const fontSize = size.fontSize ?? 12;
  const ry = size.height * (0.5 - VERTICAL_ROOM);

  const chosen = neighbours(note, bundle);
  const left = chosen.filter((n) => n.kind === 'knowFirst');
  const right = [...chosen.filter((n) => n.kind === 'related'), ...chosen.filter((n) => n.kind === 'backlink')];
  const bottom = chosen.filter((n) => n.kind === 'next');
  const titleOf = (slug: string) => noteTitle(bundle, slug);
  const { rx, maxChars } = sideLabelFit(
    [...left, ...right].map((n) => titleOf(n.slug)),
    size.width,
    fontSize
  );
  // Centred labels (current, next) may use the whole width.
  const centredChars = Math.max(
    LABEL_MIN_CHARS,
    Math.min(LOCAL_GRAPH_LABEL_MAX_CHARS, Math.floor((size.width - 2 * EDGE_PAD) / (fontSize * LOCAL_GRAPH_LABEL_EM_FACTOR)))
  );

  const place = (slug: string, kind: LocalGraphNodeKind, degrees: number): LocalGraphNode => ({
    slug,
    title: titleOf(slug),
    label: truncateLabel(titleOf(slug), kind === 'next' ? centredChars : maxChars),
    kind,
    x: round(cx + rx * Math.cos(toRadians(degrees))),
    y: round(cy + ry * Math.sin(toRadians(degrees))),
  });

  // Left arc runs from upper-left (230°) down to lower-left (130°); right arc from upper-right (-50°) down to lower-right (50°).
  const leftAngles = arcAngles(left.length, 180, -1);
  const rightAngles = arcAngles(right.length, 0, 1);

  const nodes: LocalGraphNode[] = [
    { slug: note.slug, title: note.title, label: truncateLabel(note.title, centredChars), kind: 'current', x: round(cx), y: round(cy) },
    ...left.map((n, i) => place(n.slug, n.kind, leftAngles[i] ?? 180)),
    ...right.map((n, i) => place(n.slug, n.kind, rightAngles[i] ?? 0)),
    ...bottom.map((n) => place(n.slug, n.kind, 90)),
  ];

  const edges: LocalGraphEdge[] = chosen.map(({ slug, kind }) =>
    kind === 'knowFirst' || kind === 'backlink' ? { from: slug, to: note.slug, kind } : { from: note.slug, to: slug, kind }
  );

  return { nodes, edges };
}
