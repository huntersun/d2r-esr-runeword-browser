import { describe, expect, it } from 'vitest';
import type { GuideBlock, GuideBundle, GuideInline, GuideNote } from '../engine/schema';
import { collectAppLinks, inlineText, noteTitle, searchNotes, sourceCells, truncateLabel } from './guideUtils';

const text = (value: string): GuideInline => ({ type: 'text', value });
const appLink = (href: string, label: string): GuideInline => ({ type: 'link', kind: 'app', href, children: [text(label)] });

function note(slug: string, title: string, summary = '', aliases: string[] = []): GuideNote {
  return {
    slug,
    title,
    kind: 'note',
    summary,
    tags: [],
    aliases,
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
  };
}

describe('inlineText', () => {
  it('flattens nested inline nodes', () => {
    expect(
      inlineText([
        text('a '),
        { type: 'strong', children: [{ type: 'term', term: 'X', children: [text('b')] }] },
        { type: 'break' },
        { type: 'code', value: 'c' },
      ])
    ).toBe('a b c');
  });
});

describe('collectAppLinks', () => {
  it('collects app links from every block kind in order, deduplicated by href, capped', () => {
    const body: GuideBlock[] = [
      {
        type: 'paragraph',
        children: [appLink('/?search="Enigma"', 'Enigma'), { type: 'link', kind: 'note', href: 'forging', children: [text('n')] }],
      },
      {
        type: 'list',
        ordered: false,
        items: [[{ type: 'paragraph', children: [{ type: 'emphasis', children: [appLink('/uniques', 'Uniques')] }] }]],
      },
      { type: 'blockquote', children: [{ type: 'paragraph', children: [appLink('/?search="Enigma"', 'again')] }] },
      { type: 'table', header: [[text('h')]], rows: [[[appLink('/game-data/bases', 'Bases')]]] },
      { type: 'heading', depth: 3, children: [appLink('/gemwords', 'Gemwords')] },
      {
        type: 'paragraph',
        children: [appLink('/socketables', 'Socketables'), { type: 'link', kind: 'external', href: 'https://x', children: [] }],
      },
    ];
    expect(collectAppLinks(body)).toEqual([
      { href: '/?search="Enigma"', label: 'Enigma' },
      { href: '/uniques', label: 'Uniques' },
      { href: '/game-data/bases', label: 'Bases' },
      { href: '/gemwords', label: 'Gemwords' },
    ]);
    expect(collectAppLinks(body, 10)).toHaveLength(5);
  });

  it('returns nothing for a body without app links', () => {
    expect(
      collectAppLinks([
        { type: 'paragraph', children: [text('plain')] },
        { type: 'codeBlock', value: '/x' },
      ])
    ).toEqual([]);
  });
});

describe('searchNotes', () => {
  const notes = [
    note('forging', 'Forging', 'Add one removable bonus to an item.', ['forge']),
    note('cube-basics', 'Cube basics', 'How the Horadric Cube works; forging needs it.'),
    note('stockers', 'Stockers', 'Containers that hold materials.', ['stocker box']),
  ];
  const slugs = (query: string) => searchNotes(notes, query).map((n) => n.slug);

  it('returns every note for an empty query', () => {
    expect(slugs('  ')).toEqual(['forging', 'cube-basics', 'stockers']);
  });

  it('matches title, aliases and summary case-insensitively, title hits first', () => {
    expect(slugs('FORGING')).toEqual(['forging', 'cube-basics']);
    expect(slugs('box')).toEqual(['stockers']);
    expect(slugs('materials')).toEqual(['stockers']);
  });

  it('requires all words to match and supports quoted phrases', () => {
    expect(slugs('cube horadric')).toEqual(['cube-basics']);
    expect(slugs('cube stockers')).toEqual([]);
    expect(slugs('"removable bonus"')).toEqual(['forging']);
    expect(slugs('"bonus removable"')).toEqual([]);
  });
});

describe('sourceCells', () => {
  it('always returns the four cells in order', () => {
    expect(sourceCells([]).map((c) => [c.key, c.title, c.labels])).toEqual([
      ['drop', 'Drop', []],
      ['cube', 'Cube', []],
      ['buy', 'Buy', []],
      ['gamble', 'Gamble', []],
    ]);
  });

  it('groups drop, boss, maps and plugin as Drop and ignores unknown', () => {
    const cells = sourceCells([
      { kind: 'cube', text: 'Cube: Ancient Coupon' },
      { kind: 'boss', text: 'Drops from Diablo Clone' },
      { kind: 'maps', text: 'Drops in Endgame Maps' },
      { kind: 'drop', text: 'Drops (random)' },
      { kind: 'plugin', text: 'Boss drop (launcher plugin)' },
      { kind: 'buy', text: 'Buy: Gheed' },
      { kind: 'buy', text: 'Buy: Gheed' },
      { kind: 'gamble', text: 'Gamble' },
      { kind: 'unknown', text: '?' },
    ]);
    expect(Object.fromEntries(cells.map((c) => [c.key, c.labels]))).toEqual({
      drop: ['Drops from Diablo Clone', 'Drops in Endgame Maps', 'Drops (random)', 'Boss drop (launcher plugin)'],
      cube: ['Cube: Ancient Coupon'],
      buy: ['Buy: Gheed'],
      gamble: ['Gamble'],
    });
  });
});

describe('noteTitle', () => {
  const bundle: GuideBundle = { notes: [note('forging', 'Forging')], spine: { steps: [], questions: [] }, glossary: [], sourceRefs: [] };

  it('returns the title of a known note and the slug for an unknown one', () => {
    expect(noteTitle(bundle, 'forging')).toBe('Forging');
    expect(noteTitle(bundle, 'missing-note')).toBe('missing-note');
  });
});

describe('truncateLabel', () => {
  it('keeps short labels and cuts long ones with an ellipsis', () => {
    expect(truncateLabel('Forging')).toBe('Forging');
    expect(truncateLabel('Exactly eighteen c')).toBe('Exactly eighteen c');
    expect(truncateLabel('Enhancement order and more')).toBe('Enhancement order…');
    expect(truncateLabel('Cube basics and stuff', 12)).toBe('Cube basics…');
  });
});
