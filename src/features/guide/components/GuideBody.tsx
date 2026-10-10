/* eslint-disable react-x/no-array-index-key -- the body is a static generated tree that never reorders, so positional keys are stable */
import { lazy, Suspense, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DataBlock, GuideBlock, GuideInline } from '../engine/schema';
import { findNote, sourceCells } from '../utils/guideUtils';
import { AppLinkIcon } from './AppLinkIcon';
import { GuideCardBoundary } from './GuideCardBoundary';
import { GuideCardFailed, GuideCardLoading } from './GuideCardPlaceholder';
import { useLoadedGuide } from './guideContext';
import { useHoverPopover } from './useHoverPopover';

/**
 * Long-form guide text always uses the default sans font: the optional Diablo font (`.diablo-font *` on html) is a
 * decorative display face that is tiring to read in paragraphs. Tailwind utilities sit in a later cascade layer than
 * the base-layer `.diablo-font *` rule, so these win without !important. Code elements are excluded so their
 * `font-mono` still applies.
 */
export const GUIDE_PROSE_FONT = 'font-sans [&_*:not(code):not(pre)]:font-sans';

/**
 * Inset surface for data blocks inside the note's reading panel (a `bg-card` panel): `bg-background/40` reads as a
 * recessed box in both themes. INSET_COLOR is the same colour as one opaque value, for the table scroll hint below.
 */
const INSET = 'border bg-background/40';
const INSET_COLOR = 'color-mix(in oklch, var(--background) 40%, var(--card))';

/** Body text at ~90% of the card foreground (softer contrast for long reading); headings and bold stay at full strength. */
const PROSE_TEXT = 'text-card-foreground/90';

/**
 * CSS-only scroll hint for wide tables: shadows at the edges that can still scroll (the "local" cover gradients
 * scroll with the content and hide the "scroll" shadows once an edge is reached), so nothing shows without overflow.
 * The cover colour matches the inset surface.
 */
const SCROLL_HINT_STYLE: CSSProperties = {
  background: [
    `linear-gradient(to right, ${INSET_COLOR} 30%, transparent) left center / 2.5rem 100% no-repeat local`,
    `linear-gradient(to left, ${INSET_COLOR} 30%, transparent) right center / 2.5rem 100% no-repeat local`,
    'radial-gradient(farthest-side at 0 50%, color-mix(in oklch, var(--foreground) 22%, transparent), transparent) left center / 0.75rem 100% no-repeat scroll',
    `radial-gradient(farthest-side at 100% 50%, color-mix(in oklch, var(--foreground) 22%, transparent), transparent) right center / 0.75rem 100% no-repeat scroll ${INSET_COLOR}`,
  ].join(', '),
};

/** Lazy: the item cards (and the Dexie/game-data hooks behind them) are only fetched by notes that embed a card. */
const GuideItemCard = lazy(() => import('./GuideItemCard'));

const LINK_CLASS = 'font-medium text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary';
const TABLE_WRAP = 'overflow-x-auto rounded-md border'; // surface comes from SCROLL_HINT_STYLE (the inset colour)
const TH = 'px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground';
const TD = cn('px-3 py-1.5 align-top', PROSE_TEXT);

function NoteLink({ slug, children }: { readonly slug: string; readonly children: GuideInline[] }) {
  const { bundle } = useLoadedGuide();
  const target = findNote(bundle, slug);
  const peek = useHoverPopover();

  return (
    <Popover open={peek.open && target !== undefined} onOpenChange={peek.setOpen}>
      <PopoverAnchor asChild>
        <Link to={`/guide/${slug}`} className={LINK_CLASS} {...peek.triggerProps}>
          <Inlines nodes={children} />
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

function Term({ term, children }: { readonly term: string; readonly children: GuideInline[] }) {
  const { bundle } = useLoadedGuide();
  const entry = bundle.glossary.find((g) => g.term === term);
  const peek = useHoverPopover();

  if (entry === undefined) return <Inlines nodes={children} />;

  return (
    <Popover open={peek.open} onOpenChange={peek.setOpen}>
      <PopoverAnchor asChild>
        {/* A tap (touch) opens it too; tapping outside closes it. */}
        <button
          type="button"
          className="cursor-help underline decoration-dotted decoration-muted-foreground underline-offset-4"
          aria-label={`${term}: show definition`}
          onClick={() => {
            peek.setOpen(true);
          }}
          {...peek.triggerProps}
        >
          <Inlines nodes={children} />
        </button>
      </PopoverAnchor>
      <PopoverContent side="top" className={cn('w-72 p-3 text-sm', GUIDE_PROSE_FONT)} {...peek.contentProps}>
        <p className="font-semibold">{entry.term}</p>
        <p className="mt-1 text-muted-foreground">{entry.definition}</p>
        {entry.note !== null && (
          <Link to={`/guide/${entry.note}`} className={cn(LINK_CLASS, 'mt-2 inline-block text-xs')}>
            Read more
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Inline({ node }: { readonly node: GuideInline }) {
  switch (node.type) {
    case 'text':
      return node.value;
    case 'strong':
      return (
        <strong className="font-semibold text-card-foreground">
          <Inlines nodes={node.children} />
        </strong>
      );
    case 'emphasis':
      return (
        <em>
          <Inlines nodes={node.children} />
        </em>
      );
    case 'code':
      return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{node.value}</code>;
    case 'break':
      return <br />;
    case 'term':
      return <Term term={node.term}>{node.children}</Term>;
    case 'link': {
      if (node.kind === 'note') return <NoteLink slug={node.href}>{node.children}</NoteLink>;
      if (node.kind === 'app') {
        return (
          <Link to={node.href} className={LINK_CLASS}>
            <AppLinkIcon href={node.href} className="mr-0.5 inline size-[0.9em] align-[-0.1em]" />
            <Inlines nodes={node.children} />
          </Link>
        );
      }
      return (
        <a href={node.href} target="_blank" rel="noreferrer" className={LINK_CLASS}>
          <Inlines nodes={node.children} />
          <ArrowUpRight className="ml-0.5 inline size-[0.9em] align-[-0.1em]" aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    }
  }
}

function Inlines({ nodes }: { readonly nodes: readonly GuideInline[] }) {
  return nodes.map((node, i) => <Inline key={i} node={node} />);
}

function Caption({ children }: { readonly children: string }) {
  return <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>;
}

function SourceBlock({ item, labels }: { readonly item: string; readonly labels: Extract<DataBlock, { kind: 'source' }>['labels'] }) {
  return (
    <section className={cn('rounded-md p-3', INSET)} aria-label={`Where ${item} comes from`}>
      <p className="mb-2 text-sm font-semibold">
        Where it comes from: <span className="text-foreground">{item}</span>
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sourceCells(labels).map((cell) => (
          <div key={cell.key} className="rounded border bg-card/70 p-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{cell.title}</p>
            {cell.labels.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-sm">
                {cell.labels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Derived from the game files; may be incomplete.</p>
    </section>
  );
}

function DataBlockView({ block }: { readonly block: DataBlock }) {
  switch (block.kind) {
    case 'table':
      return (
        <figure>
          <Caption>{block.caption}</Caption>
          <div className={TABLE_WRAP} style={SCROLL_HINT_STYLE}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {block.header.map((cell, i) => (
                    <th key={i} className={TH}>
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-b last:border-0">
                    {row.map((cell, c) => (
                      <td key={c} className={TD}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case 'items':
      return (
        <figure>
          <Caption>{block.caption}</Caption>
          <ul className={cn('divide-y rounded-md text-sm', INSET)}>
            {block.items.map((item, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-1.5">
                <span className="font-medium">{item.label}</span>
                {item.detail !== null && <span className="text-xs text-muted-foreground">{item.detail}</span>}
              </li>
            ))}
          </ul>
        </figure>
      );
    case 'recipes':
      return (
        <figure>
          <Caption>{block.caption}</Caption>
          <ul className={cn('divide-y rounded-md text-sm', INSET)}>
            {block.rows.map((row, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2 px-3 py-2 break-words">
                <ul className="space-y-0.5">
                  {row.inputs.map((input, j) => (
                    <li key={j}>{input}</li>
                  ))}
                </ul>
                <span className="text-muted-foreground" aria-label="gives">
                  →
                </span>
                <div>
                  <p className="font-medium">{row.output}</p>
                  {row.note !== null && <p className="text-xs text-muted-foreground">{row.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </figure>
      );
    case 'card':
      return (
        <GuideCardBoundary fallback={<GuideCardFailed name={block.name} href={block.href} />}>
          <Suspense fallback={<GuideCardLoading name={block.name} />}>
            <GuideItemCard block={block} />
          </Suspense>
        </GuideCardBoundary>
      );
    case 'source':
      return <SourceBlock item={block.item} labels={block.labels} />;
    case 'glossary':
      return (
        <dl className={cn('divide-y rounded-md text-sm', INSET)}>
          {block.entries.map((entry) => (
            <div key={entry.term} id={`term-${entry.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="px-3 py-2">
              <dt className="font-semibold">
                {entry.note !== null ? (
                  <Link to={`/guide/${entry.note}`} className={LINK_CLASS}>
                    {entry.term}
                  </Link>
                ) : (
                  entry.term
                )}
              </dt>
              <dd className="mt-0.5 text-muted-foreground">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

function Block({ block }: { readonly block: GuideBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className={cn('text-sm leading-relaxed', PROSE_TEXT)}>
          <Inlines nodes={block.children} />
        </p>
      );
    case 'heading':
      return block.depth === 3 ? (
        <h3 className="pt-2 text-base font-semibold text-card-foreground">
          <Inlines nodes={block.children} />
        </h3>
      ) : (
        <h4 className="pt-1 text-sm font-semibold text-card-foreground">
          <Inlines nodes={block.children} />
        </h4>
      );
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag className={cn('space-y-1 pl-5 text-sm leading-relaxed', PROSE_TEXT, block.ordered ? 'list-decimal' : 'list-disc')}>
          {block.items.map((item, i) => (
            <li key={i} className="pl-1">
              <Blocks blocks={item} className="space-y-1" />
            </li>
          ))}
        </ListTag>
      );
    }
    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-primary/50 pl-3 text-card-foreground/80">
          <Blocks blocks={block.children} />
        </blockquote>
      );
    case 'table':
      return (
        <div className={TABLE_WRAP} style={SCROLL_HINT_STYLE}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {block.header.map((cell, i) => (
                  <th key={i} className={TH}>
                    <Inlines nodes={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b last:border-0">
                  {row.map((cell, c) => (
                    <td key={c} className={TD}>
                      <Inlines nodes={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'thematicBreak':
      return <hr className="border-border" />;
    case 'codeBlock':
      return (
        <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
          <code>{block.value}</code>
        </pre>
      );
    case 'data':
      return <DataBlockView block={block.block} />;
  }
}

function Blocks({ blocks, className }: { readonly blocks: readonly GuideBlock[]; readonly className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

/** Renders a note body (the resolved GuideBlock tree from the bundle). */
export function GuideBody({ blocks, className }: { readonly blocks: readonly GuideBlock[]; readonly className?: string }) {
  return <Blocks blocks={blocks} className={cn(GUIDE_PROSE_FONT, className)} />;
}
