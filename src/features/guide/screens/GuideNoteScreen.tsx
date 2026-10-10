import { useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LoadedGuide } from '../engine/browser/loadGuide';
import type { GuideNote } from '../engine/schema';
import { AppLinkIcon } from '../components/AppLinkIcon';
import { FreshnessBadge } from '../components/FreshnessBadge';
import { GUIDE_PROSE_FONT, GuideBody } from '../components/GuideBody';
import { GuideGate } from '../components/GuideGate';
import { NoteChip } from '../components/NoteChip';
import { collectAppLinks, findNote, noteTitle } from '../utils/guideUtils';

function NoteNotFound({ slug }: { readonly slug: string }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-xl font-bold">Note Not Found</h1>
        <p className="mb-4 break-words text-muted-foreground">There is no guide note called “{slug}”.</p>
        <Button asChild variant="outline">
          <Link to="/guide">Back to the Guide</Link>
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Chips({ slugs }: { readonly slugs: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {slugs.map((slug) => (
        <NoteChip key={slug} slug={slug} />
      ))}
    </div>
  );
}

function NextOnPath({ guide, next }: { readonly guide: LoadedGuide; readonly next: string }) {
  return (
    // Phone: a sticky bar at the bottom of the viewport (the article reserves space for it); sm+: an inline button.
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <Link
        to={`/guide/${next}`}
        className="flex w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-auto sm:max-w-md"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Next on your path</span>
          <span className="block truncate font-medium">{noteTitle(guide.bundle, next)}</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
      </Link>
    </div>
  );
}

function Note({ guide, note }: { readonly guide: LoadedGuide; readonly note: GuideNote }) {
  const { bundle, manifest } = guide;
  const appLinks = collectAppLinks(note.body);
  const sources = note.sources.map((id) => bundle.sourceRefs.find((ref) => ref.id === id) ?? { id, title: id, url: null });

  // Note-to-note navigation reuses this component; start each note at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [note.slug]);

  return (
    <article className={cn('mx-auto max-w-2xl space-y-6', note.next !== null && 'pb-28 sm:pb-0')}>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <Link to="/guide" className="hover:text-foreground hover:underline">
              Guide
            </Link>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate text-foreground" aria-current="page">
              {note.title}
            </span>
          </nav>
          <FreshnessBadge verified={note.verified} current={manifest.esrVersion} />
        </div>
        <h1 className="text-2xl font-bold">{note.title}</h1>
        <p className={cn('text-base text-muted-foreground', GUIDE_PROSE_FONT)}>{note.summary}</p>
      </header>

      {note.knowFirst.length > 0 && (
        <Section title="Know first">
          <Chips slugs={note.knowFirst} />
        </Section>
      )}

      <GuideBody blocks={note.body} />

      {appLinks.length > 0 && (
        <Section title="In the app">
          <ul className="flex flex-wrap gap-2">
            {appLinks.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <AppLinkIcon href={link.href} className="size-4 text-muted-foreground" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {note.officialDocs.length > 0 && (
        <Section title="Official docs">
          <ul className="space-y-1">
            {note.officialDocs.map((doc) => (
              <li key={doc.href}>
                <a
                  href={doc.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {doc.label}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(note.related.length > 0 || note.backlinks.length > 0) && (
        <Section title="Related">
          {note.related.length > 0 && <Chips slugs={note.related} />}
          {note.backlinks.length > 0 && (
            <details className="group text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
                Mentioned in ({note.backlinks.length})
              </summary>
              <div className="mt-2">
                <Chips slugs={note.backlinks} />
              </div>
            </details>
          )}
        </Section>
      )}

      {note.next !== null && <NextOnPath guide={guide} next={note.next} />}

      {sources.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Sources:{' '}
          {sources.map((ref, i) => (
            <span key={ref.id}>
              {i > 0 && ' · '}
              {ref.url !== null ? (
                <a href={ref.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  {ref.title}
                </a>
              ) : (
                ref.title
              )}
            </span>
          ))}
        </p>
      )}
    </article>
  );
}

function NoteRoute({ guide, slug }: { readonly guide: LoadedGuide; readonly slug: string }) {
  const note = findNote(guide.bundle, slug);
  if (note === undefined) return <NoteNotFound slug={slug} />;
  // Keyed by slug so per-note UI state (open peeks, the expanded backlinks) resets on note-to-note navigation.
  return <Note key={slug} guide={guide} note={note} />;
}

/** `/guide/:slug`: one note. */
export function GuideNoteScreen() {
  const { slug = '' } = useParams();
  return <GuideGate>{(guide) => <NoteRoute guide={guide} slug={slug} />}</GuideGate>;
}
