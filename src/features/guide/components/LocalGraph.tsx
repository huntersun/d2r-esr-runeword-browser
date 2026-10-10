import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { layoutLocalGraph, type LocalGraphEdge, type LocalGraphNode } from '../engine/localGraph';
import type { GuideNote } from '../engine/schema';
import { findNote, truncateLabel } from '../utils/guideUtils';
import { GUIDE_PROSE_FONT } from './GuideBody';
import { useLoadedGuide } from './guideContext';
import { useHoverPopover } from './useHoverPopover';

/** viewBox size; the SVG scales to the column width. Labels use rem sizes, so they follow the text-size setting. */
const SIZE = { width: 400, height: 360 } as const;
const CURRENT_RADIUS = 9;
const NODE_RADIUS = 6;
const LABEL_GAP = 5;
// paint-order: a background-coloured halo keeps labels legible where they cross an edge.
const LABEL_CLASS = 'fill-foreground stroke-background text-[0.75rem] [paint-order:stroke] [stroke-linejoin:round] [stroke-width:3px]';

const radiusOf = (node: LocalGraphNode) => (node.kind === 'current' ? CURRENT_RADIUS : NODE_RADIUS);

function NodeLabel({ node }: { readonly node: LocalGraphNode }) {
  const label = truncateLabel(node.title);
  const r = radiusOf(node);
  if (node.kind === 'knowFirst' || node.kind === 'related' || node.kind === 'backlink') {
    const left = node.kind === 'knowFirst';
    return (
      <text
        x={left ? node.x - r - LABEL_GAP : node.x + r + LABEL_GAP}
        y={node.y}
        dominantBaseline="central"
        textAnchor={left ? 'end' : 'start'}
        className={LABEL_CLASS}
      >
        {label}
      </text>
    );
  }
  return (
    <text
      x={node.x}
      y={node.y + r + LABEL_GAP}
      dominantBaseline="hanging"
      textAnchor="middle"
      className={cn(LABEL_CLASS, node.kind === 'current' && 'font-semibold')}
    >
      {label}
    </text>
  );
}

function NeighbourNode({ node, visited }: { readonly node: LocalGraphNode; readonly visited: boolean }) {
  const { bundle } = useLoadedGuide();
  const target = findNote(bundle, node.slug);
  const peek = useHoverPopover();

  return (
    <Popover open={peek.open && target !== undefined} onOpenChange={peek.setOpen}>
      <PopoverAnchor asChild>
        <Link
          to={`/guide/${node.slug}`}
          aria-label={visited ? `${node.title} (read)` : node.title}
          className="group cursor-pointer outline-none"
          {...peek.triggerProps}
        >
          <title>{node.title}</title>
          {/* Larger invisible hit area */}
          <circle cx={node.x} cy={node.y} r={NODE_RADIUS + 6} fill="transparent" />
          <circle
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS + 3.5}
            fill="none"
            strokeWidth={2}
            className="stroke-ring opacity-0 group-focus-visible:opacity-100"
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS}
            strokeWidth={1.5}
            className={cn(
              'stroke-muted-foreground transition-colors group-hover:stroke-primary',
              visited ? 'fill-muted-foreground' : 'fill-background'
            )}
          />
          <NodeLabel node={node} />
        </Link>
      </PopoverAnchor>
      {target && (
        <PopoverContent side="top" className={cn('w-72 p-3 text-sm', GUIDE_PROSE_FONT)} {...peek.contentProps}>
          <p className="font-semibold">{target.title}</p>
          <p className="mt-1 text-muted-foreground">{target.summary}</p>
        </PopoverContent>
      )}
    </Popover>
  );
}

function Edge({
  edge,
  nodes,
  arrowId,
}: {
  readonly edge: LocalGraphEdge;
  readonly nodes: ReadonlyMap<string, LocalGraphNode>;
  readonly arrowId: string;
}) {
  const from = nodes.get(edge.from);
  const to = nodes.get(edge.to);
  if (from === undefined || to === undefined) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  // Stop the line at the circles' rims (plus room for the arrowhead).
  const start = radiusOf(from) + 1;
  const end = radiusOf(to) + (edge.kind === 'knowFirst' ? 3 : 1);
  return (
    <line
      x1={from.x + (dx / length) * start}
      y1={from.y + (dy / length) * start}
      x2={to.x - (dx / length) * end}
      y2={to.y - (dy / length) * end}
      stroke="currentColor"
      strokeOpacity={edge.kind === 'knowFirst' || edge.kind === 'next' ? 0.55 : 0.3}
      strokeWidth={1.25}
      strokeDasharray={edge.kind === 'next' ? '5 4' : undefined}
      markerEnd={edge.kind === 'knowFirst' ? `url(#${arrowId})` : undefined}
    />
  );
}

/**
 * Desktop-only map of the note's direct neighbours (know first on the left, related and "mentioned in" on the right,
 * next on the path below). Supplementary: every node is also reachable through the chips and the next link.
 */
export function LocalGraph({ note, visited }: { readonly note: GuideNote; readonly visited: ReadonlySet<string> }) {
  const { bundle } = useLoadedGuide();
  const arrowId = `guide-graph-arrow-${useId().replace(/:/g, '')}`;
  const graph = layoutLocalGraph(note, bundle, SIZE);
  if (graph.edges.length === 0) return null;
  const bySlug = new Map(graph.nodes.map((node) => [node.slug, node]));

  return (
    <section aria-labelledby={`${arrowId}-heading`} className="space-y-2">
      <h2 id={`${arrowId}-heading`} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Connections
      </h2>
      <svg
        viewBox={`0 0 ${String(SIZE.width)} ${String(SIZE.height)}`}
        className={cn('h-auto w-full overflow-visible text-foreground', GUIDE_PROSE_FONT)}
      >
        <defs>
          <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" fillOpacity={0.7} />
          </marker>
        </defs>
        <g>
          {graph.edges.map((edge) => (
            <Edge key={`${edge.from}>${edge.to}`} edge={edge} nodes={bySlug} arrowId={arrowId} />
          ))}
        </g>
        {graph.nodes.map((node) =>
          node.kind === 'current' ? (
            <g key={node.slug} aria-current="page">
              <circle cx={node.x} cy={node.y} r={CURRENT_RADIUS} className="fill-primary stroke-primary" />
              <NodeLabel node={node} />
            </g>
          ) : (
            <NeighbourNode key={node.slug} node={node} visited={visited.has(node.slug)} />
          )
        )}
      </svg>
      <p className="text-xs text-muted-foreground">Arrow: know first · dashed: next on your path · filled: read</p>
    </section>
  );
}
