import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InlineNameProps {
  readonly name: string;
  readonly onRename: (name: string) => void;
}

/** The filter name as a heading; the pencil turns it into a field (Enter or leaving it saves, Escape cancels). */
export function InlineName({ name, onRename }: InlineNameProps) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <h1 className="truncate text-2xl font-bold">{name}</h1>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            setDraft(name);
          }}
          aria-label="Rename filter"
        >
          <Pencil />
        </Button>
      </div>
    );
  }

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== '' && trimmed !== name) onRename(trimmed);
    setDraft(null);
  };

  return (
    <Input
      aria-label="Filter name"
      className="h-10 max-w-md text-lg font-semibold"
      value={draft}
      autoFocus
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') setDraft(null);
      }}
    />
  );
}
