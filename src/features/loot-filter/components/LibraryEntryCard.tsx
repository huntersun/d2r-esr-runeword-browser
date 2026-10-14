import { Link } from 'react-router-dom';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { LootFilterEntry, LootFilterSource } from '../store/types';
import { summarizeEntry } from '../utils/entrySummary';
import { referencedAssetsOfText } from '../utils/referencedAssets';
import { FilterDownloadMenu } from './FilterDownloadMenu';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const SOURCE_LABELS: Readonly<Record<LootFilterSource, string>> = {
  blank: 'New',
  upload: 'Uploaded',
  template: 'Template',
};

interface LibraryEntryCardProps {
  readonly entry: LootFilterEntry;
  readonly onDuplicate: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

export function LibraryEntryCard({ entry, onDuplicate, onRename, onDelete }: LibraryEntryCardProps) {
  const summary = summarizeEntry(entry.text);
  const byline = [summary.title, summary.author === null ? null : `by ${summary.author}`].filter((part) => part !== null).join(' ');

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/loot-filters/${entry.id}`} className="block truncate font-semibold leading-tight hover:underline">
            {entry.name}
          </Link>
          {byline !== '' && <p className="mt-0.5 truncate text-sm text-muted-foreground">{byline}</p>}
        </div>
        <Badge variant="outline">{SOURCE_LABELS[entry.source]}</Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {summary.readable ? (
          <span>
            {summary.ruleCount} {summary.ruleCount === 1 ? 'rule' : 'rules'}
          </span>
        ) : (
          <span className="text-destructive">Not valid JSON: open it to fix</span>
        )}
        <span>Updated {dateFormatter.format(entry.updatedAt)}</span>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link to={`/loot-filters/${entry.id}`}>Open</Link>
        </Button>
        <FilterDownloadMenu name={entry.name} getText={() => entry.text} assets={referencedAssetsOfText(entry.text)} variant="outline" />
        <Button size="sm" variant="ghost" onClick={onDuplicate} aria-label={`Duplicate ${entry.name}`}>
          <Copy />
          Duplicate
        </Button>
        <Button size="sm" variant="ghost" onClick={onRename} aria-label={`Rename ${entry.name}`}>
          <Pencil />
          Rename
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label={`Delete ${entry.name}`}
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </Card>
  );
}
