import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { noteTitle } from '../utils/guideUtils';
import { useLoadedGuide } from './guideContext';

/** Small rounded link to another note, labelled with its title; a check marks a note the viewer has already read. */
export function NoteChip({ slug, visited = false }: { readonly slug: string; readonly visited?: boolean }) {
  const { bundle } = useLoadedGuide();
  return (
    <Link
      to={`/guide/${slug}`}
      className="inline-flex items-center gap-1 rounded-full border bg-secondary/40 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {noteTitle(bundle, slug)}
      {visited && (
        <>
          <Check className="size-3 shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only"> (read)</span>
        </>
      )}
    </Link>
  );
}
