import { describe, expect, it } from 'vitest';
import { findNote, findSourceRef, noteTitle } from './notes';
import type { GuideBundle } from './schema';
import { makeNote } from './testNote.mock';

const bundle: GuideBundle = {
  notes: [makeNote({ slug: 'forging', title: 'Forging' })],
  spine: { steps: [], questions: [] },
  glossary: [],
  sourceRefs: [{ id: 'wiki', title: 'Wiki', url: 'https://example.org', license: null, note: null }],
};

describe('findNote / noteTitle', () => {
  it('finds a note by slug and falls back to the slug for its title', () => {
    expect(findNote(bundle, 'forging')?.title).toBe('Forging');
    expect(findNote(bundle, 'missing-note')).toBeUndefined();
    expect(noteTitle(bundle, 'forging')).toBe('Forging');
    expect(noteTitle(bundle, 'missing-note')).toBe('missing-note');
  });
});

describe('findSourceRef', () => {
  it('returns the entry, or a bare one titled with the id', () => {
    expect(findSourceRef(bundle, 'wiki').url).toBe('https://example.org');
    expect(findSourceRef(bundle, 'gone')).toEqual({ id: 'gone', title: 'gone', url: null, license: null, note: null });
  });
});
