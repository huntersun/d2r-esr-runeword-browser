/**
 * Lookups into a loaded guide bundle (notes by slug, source refs by id), shared by the screens and the local graph.
 *
 * Shared code: relative `.ts` imports only, no DOM.
 */
import type { GuideBundle, GuideNote, SourceRef } from './schema.ts';

export function findNote(bundle: Pick<GuideBundle, 'notes'>, slug: string): GuideNote | undefined {
  return bundle.notes.find((note) => note.slug === slug);
}

/** Title of the note with that slug, or the slug itself when it is missing (should not happen: the build validates links). */
export function noteTitle(bundle: Pick<GuideBundle, 'notes'>, slug: string): string {
  return findNote(bundle, slug)?.title ?? slug;
}

/** The `_sources.yml` entry with that id; a bare entry titled with the id when it is missing (the build validates ids). */
export function findSourceRef(bundle: Pick<GuideBundle, 'sourceRefs'>, id: string): SourceRef {
  return bundle.sourceRefs.find((ref) => ref.id === id) ?? { id, title: id, url: null, license: null, note: null };
}
