import { Link } from 'react-router-dom';
import { noteTitle } from '../utils/guideUtils';
import { useLoadedGuide } from './guideContext';

/** Small rounded link to another note, labelled with its title. */
export function NoteChip({ slug }: { readonly slug: string }) {
  const { bundle } = useLoadedGuide();
  return (
    <Link
      to={`/guide/${slug}`}
      className="inline-flex items-center rounded-full border bg-secondary/40 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {noteTitle(bundle, slug)}
    </Link>
  );
}
