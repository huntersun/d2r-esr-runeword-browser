/**
 * Cross-note structure: unknown-slug errors, backlinks, spine step, "next on your path" and orphan detection.
 */
import type { GlossaryEntry, GuideSpine } from '../engine/schema.ts';

export interface GraphNote {
  slug: string;
  /** Message prefix, e.g. `notes/forging.md` */
  file: string;
  noteLinks: readonly string[];
  knowFirst: readonly string[];
  related: readonly string[];
  nextOverride: string | null;
}

export interface GuideGraph {
  backlinks: Map<string, string[]>;
  next: Map<string, string | null>;
  spineStep: Map<string, number | null>;
  errors: string[];
}

export function buildGraph(notes: readonly GraphNote[], spine: GuideSpine, glossary: readonly GlossaryEntry[] = []): GuideGraph {
  const known = new Set(notes.map((note) => note.slug));
  const errors: string[] = [];
  const check = (where: string, slug: string): void => {
    if (!known.has(slug)) errors.push(`${where}: unknown note "${slug}"`);
  };

  // Spine order and step per note
  const order: string[] = [];
  const spineStep = new Map<string, number | null>();
  spine.steps.forEach((step, i) => {
    for (const slug of step.notes) {
      check(`spine.yml: steps[${String(i)}] (${step.title})`, slug);
      if (spineStep.has(slug)) errors.push(`spine.yml: note "${slug}" appears more than once on the spine`);
      spineStep.set(slug, i);
      order.push(slug);
    }
  });
  spine.questions.forEach((question, i) => {
    check(`spine.yml: questions[${String(i)}]`, question.note);
  });
  glossary.forEach((entry) => {
    if (entry.note !== null) check(`_glossary.yml: "${entry.term}"`, entry.note);
  });

  // Backlinks: body [[links]], knowFirst and related
  const incoming = new Map<string, Set<string>>();
  const link = (from: string, to: string): void => {
    if (from === to || !known.has(to)) return;
    const set = incoming.get(to) ?? new Set<string>();
    set.add(from);
    incoming.set(to, set);
  };
  for (const note of notes) {
    for (const slug of new Set(note.noteLinks)) check(`${note.file}: [[${slug}]]`, slug);
    for (const slug of note.knowFirst) check(`${note.file}: knowFirst`, slug);
    for (const slug of note.related) check(`${note.file}: related`, slug);
    if (note.nextOverride !== null) check(`${note.file}: next`, note.nextOverride);
    for (const slug of [...note.noteLinks, ...note.knowFirst, ...note.related]) link(note.slug, slug);
  }

  const backlinks = new Map<string, string[]>();
  const next = new Map<string, string | null>();
  for (const note of notes) {
    backlinks.set(note.slug, [...(incoming.get(note.slug) ?? [])].sort());
    const position = order.indexOf(note.slug);
    const spineNext = position === -1 ? null : (order[position + 1] ?? null);
    next.set(note.slug, note.nextOverride ?? spineNext);
    if (!spineStep.has(note.slug)) spineStep.set(note.slug, null);
  }

  // Orphans: not on the spine and nothing points at them (links, next overrides, questions, glossary owners)
  const reachable = new Set<string>([
    ...order,
    ...incoming.keys(),
    ...notes.flatMap((note) => (note.nextOverride === null || note.nextOverride === note.slug ? [] : [note.nextOverride])),
    ...spine.questions.map((question) => question.note),
    ...glossary.flatMap((entry) => (entry.note === null ? [] : [entry.note])),
  ]);
  for (const note of notes) {
    if (!reachable.has(note.slug)) errors.push(`${note.file}: orphan note (not on the spine and not linked from any other note)`);
  }

  return { backlinks, next, spineStep, errors };
}
