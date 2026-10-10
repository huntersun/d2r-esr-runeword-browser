import { describe, expect, it } from 'vitest';
import { parseNote, splitFrontmatter } from './parseNote.ts';
import { fixtureContext } from './testContext.mock.ts';

function note(frontmatter: string, body = 'Body text.') {
  return parseNote('notes/forging.md', `---\n${frontmatter}\n---\n${body}`, fixtureContext());
}

describe('splitFrontmatter', () => {
  it('splits the YAML block and counts the body offset', () => {
    expect(splitFrontmatter('---\ntitle: A\n---\nbody')).toEqual({ yaml: 'title: A', body: 'body', bodyLine: 3 });
    expect(splitFrontmatter('﻿---\r\ntitle: A\r\n---\r\n')).toEqual({ yaml: 'title: A', body: '', bodyLine: 3 });
    expect(splitFrontmatter('no frontmatter')).toBeNull();
  });
});

describe('parseNote', () => {
  it('parses a complete note with defaults', () => {
    const parsed = note(
      [
        'title: Forging',
        'summary: Add one removable bonus.',
        'tags: [crafting]',
        'knowFirst: [cube-basics]',
        'related: [d-stoning]',
        'next: enhancement-order',
        'verified: 3.2.12',
        'mentions: [Forging Hammer]',
        'officialDocs:',
        '  - label: Cube Recipes',
        '    href: docs:Eastern Sun Resurrected Cube Recipes.html#special',
        'sources: [official-cube]',
      ].join('\n'),
      'See [[cube-basics]].'
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.note).toMatchObject({
      slug: 'forging',
      title: 'Forging',
      kind: 'note',
      volatility: 'low',
      tags: ['crafting'],
      aliases: [],
      verified: '3.2.12',
      knowFirst: ['cube-basics'],
      related: ['d-stoning'],
      officialDocs: [
        { label: 'Cube Recipes', href: 'https://easternsunresurrected.com/Eastern%20Sun%20Resurrected%20Cube%20Recipes.html#special' },
      ],
      sources: ['official-cube'],
      words: 1,
      backlinks: [],
      next: null,
      spineStep: null,
    });
    expect(parsed.nextOverride).toBe('enhancement-order');
    expect(parsed.mentions).toEqual(['Forging Hammer']);
    expect(parsed.noteLinks).toEqual(['cube-basics']);
  });

  it('reports every frontmatter problem with the file and field', () => {
    const parsed = note(
      [
        `summary: ${'x'.repeat(141)}`,
        'kind: page',
        'knowFirst: [a, b, c, d]',
        'related: [a, b, c, d, e, f]',
        'verified: 3.2',
        'volatility: medium',
        'tags: crafting',
        'nxet: typo',
        'officialDocs:',
        '  - label: Bad',
        '    href: /relative',
      ].join('\n')
    );
    expect(parsed.errors).toEqual([
      'notes/forging.md: nxet: unknown field (allowed: title, kind, summary, tags, aliases, knowFirst, related, next, verified, volatility, mentions, officialDocs, sources)',
      'notes/forging.md: kind: must be one of note | link | hub (got "page")',
      'notes/forging.md: volatility: must be one of low | high (got "medium")',
      'notes/forging.md: title: is required',
      'notes/forging.md: summary: must be at most 140 characters (got 141)',
      'notes/forging.md: tags: must be a list of non-empty strings (got "crafting")',
      "notes/forging.md: verified: quote the version so YAML keeps it as text: verified: '3.2'",
      'notes/forging.md: knowFirst: must have at most 3 entries (got 4)',
      'notes/forging.md: related: must have at most 5 entries (got 6)',
      'notes/forging.md: officialDocs[0]: href must be docs:<file>#<anchor> or an http(s) URL (got "/relative")',
    ]);
  });

  it('treats a missing verified as a draft and rejects invalid slugs and missing frontmatter', () => {
    expect(note('title: A\nsummary: B').note.verified).toBeNull();
    expect(note('title: A\nsummary: B\nknowFirst: [Not A Slug]').errors).toEqual([
      'notes/forging.md: knowFirst: "Not A Slug" is not a valid slug (kebab-case a-z, 0-9)',
    ]);
    expect(parseNote('notes/Bad_Name.md', '---\ntitle: A\nsummary: B\n---\n', fixtureContext()).errors).toEqual([
      'notes/Bad_Name.md: file name "Bad_Name" is not a valid slug (kebab-case a-z, 0-9)',
    ]);
    expect(parseNote('notes/x.md', 'just text', fixtureContext()).errors[0]).toBe(
      'notes/x.md: missing frontmatter (the file must start with a --- block)'
    );
    expect(note('title: [unclosed').errors[0]).toMatch(/^notes\/forging.md: invalid YAML/);
  });

  it('reports body errors with the line number in the file', () => {
    expect(note('title: A\nsummary: B', 'ok\n\n## Bad').errors).toEqual([
      "notes/forging.md:7: only ### and #### headings are allowed (the title is the note's h1, got ##)",
    ]);
  });
});
