import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useManifest } from '../hooks/useManifest';
import { findItemSource, type ItemSourceKind, type SourceIndex } from '../engine/sourceLookup';

interface ItemSourceLineProps {
  /** Index from `useItemSources()`; null/undefined (bundle loading, failed or not provided) renders nothing */
  readonly index: SourceIndex | null | undefined;
  readonly name: string;
  /** Preferred entry kind when the name exists as several kinds (e.g. Ore unique vs Ore material) */
  readonly kind?: ItemSourceKind;
  readonly className?: string;
}

/** "Source: Cube: Ancient Coupon · Gamble" line for item cards, from the game-data sources bundle. */
export function ItemSourceLine({ index, name, kind, className }: ItemSourceLineProps) {
  if (!index) return null;
  const source = findItemSource(index, name, kind);
  if (source === null || source.labels.length === 0) return null;

  return (
    <div className={cn('flex items-start gap-1 text-xs text-muted-foreground', className)}>
      <p className="min-w-0">Source: {source.labels.map((label) => label.text).join(' · ')}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="size-4 shrink-0 text-muted-foreground" aria-label="About item sources">
            <HelpCircle className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 text-sm text-muted-foreground" align="start">
          <SourceHelp />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Popover body; mounted only while the popover is open, so the manifest is not requested per card. */
function SourceHelp() {
  const manifest = useManifest();
  const version = manifest === null ? '' : ` (ESR ${manifest.esrVersion})`;
  return <p>Derived from the ESR game files{version}; qualitative only, may be incomplete.</p>;
}
