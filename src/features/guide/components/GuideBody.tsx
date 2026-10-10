/* eslint-disable react-x/no-array-index-key -- the body is a static generated tree that never reorders, so positional keys are stable */
import { cn } from '@/lib/utils';
import type { GuideBlock } from '../engine/schema';
import { GuideDataBlock } from './GuideDataBlock';
import { GuideInlines } from './GuideInlines';
import { GuideTable } from './GuideTable';
import { GUIDE_PROSE_FONT, PROSE_TEXT } from './styles';

interface BlockProps {
  readonly block: GuideBlock;
}

function Block({ block }: BlockProps) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className={cn('text-sm leading-relaxed', PROSE_TEXT)}>
          <GuideInlines nodes={block.children} />
        </p>
      );
    case 'heading':
      return block.depth === 3 ? (
        <h3 className="pt-2 text-base font-semibold text-card-foreground">
          <GuideInlines nodes={block.children} />
        </h3>
      ) : (
        <h4 className="pt-1 text-sm font-semibold text-card-foreground">
          <GuideInlines nodes={block.children} />
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
      return <GuideTable header={block.header} rows={block.rows} renderCell={(cell) => <GuideInlines nodes={cell} />} />;
    case 'thematicBreak':
      return <hr className="border-border" />;
    case 'codeBlock':
      return (
        <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
          <code>{block.value}</code>
        </pre>
      );
    case 'data':
      return <GuideDataBlock block={block.block} />;
  }
}

interface BlocksProps {
  readonly blocks: readonly GuideBlock[];
  readonly className?: string;
}

function Blocks({ blocks, className }: BlocksProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

interface GuideBodyProps {
  readonly blocks: readonly GuideBlock[];
  readonly className?: string;
}

/** Renders a note body (the resolved GuideBlock tree from the bundle). */
export function GuideBody({ blocks, className }: GuideBodyProps) {
  return <Blocks blocks={blocks} className={cn(GUIDE_PROSE_FONT, className)} />;
}
