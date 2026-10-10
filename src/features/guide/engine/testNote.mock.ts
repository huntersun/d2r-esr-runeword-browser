/** Shared GuideNote factory for the guide tests: an empty draft note; tests override what they need. */
import type { GuideNote } from './schema.ts';

export function makeNote(overrides: Partial<GuideNote> = {}): GuideNote {
  return {
    slug: 'note',
    title: 'Note',
    kind: 'note',
    summary: '',
    tags: [],
    aliases: [],
    verified: null,
    staleReasons: [],
    volatility: 'low',
    knowFirst: [],
    related: [],
    backlinks: [],
    next: null,
    spineStep: null,
    officialDocs: [],
    sources: [],
    words: 0,
    body: [],
    ...overrides,
  };
}
