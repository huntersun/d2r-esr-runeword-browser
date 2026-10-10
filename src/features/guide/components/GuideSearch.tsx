import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { GuideNote } from '../engine/schema';
import { searchNotes } from '../utils/guideUtils';

/** Search trigger (looks like an input) that opens a cmdk palette over the notes; Enter opens the selected note. */
export function GuideSearch({ notes }: { readonly notes: readonly GuideNote[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = searchNotes(notes, query);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="flex h-10 w-full items-center gap-2 rounded-md border bg-background px-3 text-left text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Search className="size-4 shrink-0 opacity-60" aria-hidden />
        <span className="truncate">Search the guide…</span>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="top-[10%] translate-y-0 overflow-hidden p-0 sm:top-[15%]" showCloseButton={false}>
          <DialogTitle className="sr-only">Search the guide</DialogTitle>
          <DialogDescription className="sr-only">Search notes by title, alias or summary. Enter opens the selected note.</DialogDescription>
          {/* Filtering is ours (searchNotes: every word must match), not cmdk's fuzzy scorer. */}
          <Command shouldFilter={false} className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-item]]:py-2">
            <CommandInput value={query} onValueChange={setQuery} placeholder="Search notes…" className="h-12 text-base sm:text-sm" />
            <CommandList className="max-h-[60svh]">
              <CommandEmpty>No notes match.</CommandEmpty>
              {results.map((note) => (
                <CommandItem
                  key={note.slug}
                  value={note.slug}
                  onSelect={() => {
                    handleOpenChange(false);
                    void navigate(`/guide/${note.slug}`);
                  }}
                  className="flex-col items-start gap-0.5 data-[selected=true]:bg-accent data-[selected=true]:ring-1 data-[selected=true]:ring-primary/50 data-[selected=true]:ring-inset"
                >
                  <span className="font-medium">{note.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{note.summary}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
