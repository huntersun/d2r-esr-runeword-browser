import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { noteTitle } from '../engine/notes';
import { useLoadedGuide } from '../hooks/useLoadedGuide';
import { FOCUS_RING } from './styles';
import { VisitedMark } from './VisitedMark';

interface NoteChipProps {
  readonly slug: string;
  readonly visited?: boolean;
}

/** Small rounded link to another note, labelled with its title; a check marks a note the viewer has already read. */
export function NoteChip({ slug, visited = false }: NoteChipProps) {
  const { bundle } = useLoadedGuide();
  return (
    <Link
      to={`/guide/${slug}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border bg-secondary/40 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
        FOCUS_RING
      )}
    >
      {noteTitle(bundle, slug)}
      {visited && <VisitedMark className="size-3" />}
    </Link>
  );
}
