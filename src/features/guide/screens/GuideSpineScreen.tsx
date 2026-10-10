import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoadedGuide } from '../engine/browser/loadGuide';
import { findNote, noteTitle } from '../engine/notes';
import type { GuideSpineStep } from '../engine/schema';
import { FreshnessMarker } from '../components/FreshnessBadge';
import { GuideGate } from '../components/GuideGate';
import { GuideSearch } from '../components/GuideSearch';
import { SectionLabel } from '../components/SectionLabel';
import { FOCUS_RING, GUIDE_PROSE_FONT } from '../components/styles';
import { VisitedMark } from '../components/VisitedMark';
import { useVisitedNotes } from '../hooks/useVisitedNotes';

interface SpineStepProps {
  readonly step: GuideSpineStep;
  readonly index: number;
  readonly guide: LoadedGuide;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly visited: ReadonlySet<string>;
}

function SpineStep({ step, index, guide, expanded, onToggle, visited }: SpineStepProps) {
  const panelId = `guide-step-${String(index)}`;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <li className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={cn('flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent/40', FOCUS_RING)}
      >
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
            expanded ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
          aria-hidden
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{step.title}</span>
          <span className={cn('mt-0.5 block text-sm text-muted-foreground', GUIDE_PROSE_FONT)}>{step.summary}</span>
        </span>
        <Chevron className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {expanded && (
        <ul id={panelId} className="space-y-2 px-3 pb-3 sm:pl-13">
          {step.notes.map((slug) => {
            const note = findNote(guide.bundle, slug);
            return (
              <li key={slug}>
                <Link
                  to={`/guide/${slug}`}
                  className={cn(
                    'block rounded-md border bg-background/60 px-3 py-2 transition-colors hover:border-primary/50 hover:bg-accent/40',
                    FOCUS_RING
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 font-medium">
                      {noteTitle(guide.bundle, slug)}
                      {visited.has(slug) && <VisitedMark className="size-3.5" />}
                    </span>
                    {note && <FreshnessMarker verified={note.verified} current={guide.manifest.esrVersion} reasons={note.staleReasons} />}
                  </span>
                  {note && <span className={cn('mt-0.5 block text-sm text-muted-foreground', GUIDE_PROSE_FONT)}>{note.summary}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

interface SpineProps {
  readonly guide: LoadedGuide;
}

function Spine({ guide }: SpineProps) {
  const { spine, notes } = guide.bundle;
  // Indices of the expanded steps; the first step starts open.
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set([0]));
  const { visited, reset: resetVisited } = useVisitedNotes();
  // Only notes that still exist (stored slugs of deleted or renamed notes are ignored).
  const visitedCount = notes.filter((note) => visited.has(note.slug)).length;

  const toggle = (index: number) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Guide</h1>
        <p className="text-sm text-muted-foreground">Your path through Eastern Sun Resurrected</p>
      </div>

      <GuideSearch notes={notes} />

      <section aria-labelledby="guide-path-heading">
        <SectionLabel id="guide-path-heading" className="mb-2">
          Start here
        </SectionLabel>
        <ol className="space-y-2">
          {spine.steps.map((step, index) => (
            <SpineStep
              key={step.title}
              step={step}
              index={index}
              guide={guide}
              expanded={expanded.has(index)}
              visited={visited}
              onToggle={() => {
                toggle(index);
              }}
            />
          ))}
        </ol>
      </section>

      {spine.questions.length > 0 && (
        <section aria-labelledby="guide-questions-heading">
          <SectionLabel id="guide-questions-heading" className="mb-2">
            I found something
          </SectionLabel>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {spine.questions.map((question) => (
              <Link
                key={question.note}
                to={`/guide/${question.note}`}
                className={cn(
                  'inline-flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                  FOCUS_RING
                )}
              >
                {question.label}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}

      {visitedCount > 0 && (
        <p className="text-right text-xs text-muted-foreground">
          {visitedCount} {visitedCount === 1 ? 'note' : 'notes'} read ·{' '}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Forget which guide notes you have read?')) resetVisited();
            }}
            className={cn('underline underline-offset-2 hover:text-foreground', FOCUS_RING)}
          >
            Reset progress
          </button>
        </p>
      )}
    </div>
  );
}

/** `/guide`: the "Start here" journey spine. */
export function GuideSpineScreen() {
  return <GuideGate>{(guide) => <Spine guide={guide} />}</GuideGate>;
}
