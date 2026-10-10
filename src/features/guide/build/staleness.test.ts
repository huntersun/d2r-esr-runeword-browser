import { describe, expect, it } from 'vitest';
import type { DataBlock, GuideNote } from '../engine/schema.ts';
import {
  capReasons,
  compareBlockHashes,
  formatGuideReport,
  hashDataBlocks,
  keyDataBlocks,
  mentionsTerm,
  noteSearchTerms,
  noteStaleReasons,
  parseVerifyLock,
  scanPatchNotes,
  serializeVerifyLock,
  setVerifiedInFrontmatter,
  versionFromPatchNoteFile,
} from './staleness.ts';
import { directiveKey } from './markdown.ts';

const gheed: DataBlock = { kind: 'items', caption: 'Gheed sells', items: [{ label: 'Stocker', detail: null }] };
const shard: DataBlock = { kind: 'source', item: 'Worldstone Shard', labels: [] };

function note(overrides: Partial<GuideNote>): GuideNote {
  return {
    slug: 'stockers',
    title: 'Stockers',
    kind: 'note',
    summary: '',
    tags: [],
    aliases: [],
    verified: '3.2.10',
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

describe('block keys and hashes', () => {
  it('builds the key from the directive source', () => {
    expect(directiveKey('source', 'Worldstone Shard', { item: 'misc' })).toBe('source:Worldstone Shard{item=misc}');
    expect(directiveKey('vendor', 'Gheed', {})).toBe('vendor:Gheed');
    expect(directiveKey('secret-recipes', null, {})).toBe('secret-recipes');
    expect(directiveKey('x', 'a', { z: '1', b: '2' })).toBe('x:a{b=2 z=1}');
  });

  it('suffixes repeated keys and captions every block', () => {
    const keyed = keyDataBlocks([
      { key: 'vendor:Gheed', block: gheed },
      { key: 'vendor:Gheed', block: gheed },
      { key: 'source:Worldstone Shard{item=misc}', block: shard },
    ]);
    expect(keyed.map(({ key, caption }) => [key, caption])).toEqual([
      ['vendor:Gheed', 'Gheed sells'],
      ['vendor:Gheed#2', 'Gheed sells #2'],
      ['source:Worldstone Shard{item=misc}', 'Where it comes from: Worldstone Shard'],
    ]);
    expect(keyed[0]?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(keyed[0]?.hash).toBe(keyed[1]?.hash);
  });

  it('reports changed, added and removed blocks', () => {
    const recorded = hashDataBlocks([
      { key: 'vendor:Gheed', block: gheed },
      { key: 'gone', block: shard },
    ]);
    const changed = { ...gheed, items: [{ label: 'Gem Can', detail: null }] };
    expect(compareBlockHashes(keyDataBlocks([{ key: 'vendor:Gheed', block: gheed }]), recorded, '3.2.10')).toEqual([
      "Data in 'gone' changed since 3.2.10",
    ]);
    expect(
      compareBlockHashes(
        keyDataBlocks([
          { key: 'vendor:Gheed', block: changed },
          { key: 'gone', block: shard },
          { key: 'secret-recipes', block: { kind: 'recipes', caption: 'Secret recipes', rows: [] } },
        ]),
        recorded,
        '3.2.10'
      )
    ).toEqual(["Data in 'Gheed sells' changed since 3.2.10", "Data in 'Secret recipes' changed since 3.2.10"]);
  });
});

describe('lock file', () => {
  it('round-trips sorted and parses a missing file as empty', () => {
    const errors: string[] = [];
    const text = serializeVerifyLock({ b: { verified: '3.2.12', blocks: { z: '1', a: '2' } }, a: { verified: '3.2.11', blocks: {} } });
    expect(text).toBe(
      '{\n  "a": {\n    "verified": "3.2.11",\n    "blocks": {}\n  },\n  "b": {\n    "verified": "3.2.12",\n    "blocks": {\n      "a": "2",\n      "z": "1"\n    }\n  }\n}\n'
    );
    expect(parseVerifyLock(text, 'lock', errors)).toEqual({
      a: { verified: '3.2.11', blocks: {} },
      b: { verified: '3.2.12', blocks: { a: '2', z: '1' } },
    });
    expect(parseVerifyLock(null, 'lock', errors)).toEqual({});
    expect(errors).toEqual([]);
  });

  it('reports malformed entries', () => {
    const errors: string[] = [];
    expect(parseVerifyLock('{"a": {"verified": 3}}', 'lock', errors)).toEqual({});
    expect(errors).toEqual(['lock: "a" must be { verified: string, blocks: { key: hash } }']);
  });
});

describe('patch notes', () => {
  it('reads the version from the file name', () => {
    expect(versionFromPatchNoteFile('3.2.11.md')).toBe('3.2.11');
    expect(versionFromPatchNoteFile('patchnotes/3.2.04.md')).toBe('3.2.04');
    expect(versionFromPatchNoteFile('README.md')).toBeNull();
    expect(versionFromPatchNoteFile('3.2.11.txt')).toBeNull();
  });

  it('matches whole words case-insensitively', () => {
    expect(mentionsTerm('Fixed the STOCKER bug.', 'Stocker')).toBe(true);
    expect(mentionsTerm('Multistocker reworked', 'Stocker')).toBe(false);
    expect(mentionsTerm('Stockers reworked', 'Stocker')).toBe(false);
    expect(mentionsTerm("Starter's Pack (new)", "starter's pack")).toBe(true);
    expect(mentionsTerm('anything', ' ')).toBe(false);
    expect(mentionsTerm('Fixed Ore-shards dropping', 'Ore')).toBe(false);
    expect(mentionsTerm('Fixed pre-Stocker items', 'Stocker')).toBe(false);
    expect(mentionsTerm('Stocker: fixed', 'Stocker')).toBe(true);
  });

  it('only scans patches newer than verified, oldest first', () => {
    const patches = [
      { version: '3.2.12', text: 'Gem cans and the Stocker' },
      { version: '3.2.10', text: 'Stocker' },
      { version: '3.2.11', text: 'stocker' },
    ];
    expect(scanPatchNotes(patches, '3.2.10', ['Stocker', 'Gem Can'])).toEqual([
      "Patch notes 3.2.11 mention 'Stocker'",
      "Patch notes 3.2.12 mention 'Stocker'",
    ]);
  });

  it('searches only the title and the glossary terms the note owns, once each, ignoring short terms', () => {
    const glossary = [
      { term: 'Stocker', definition: '', note: 'stockers' },
      { term: 'stockers', definition: '', note: 'stockers' },
      { term: 'Can opener', definition: '', note: 'stockers' },
      { term: 'Key', definition: '', note: 'stockers' },
      { term: 'Rune', definition: '', note: 'runes' },
    ];
    expect(noteSearchTerms(note({ aliases: ['gem can'] }), glossary)).toEqual(['Stockers', 'Stocker', 'Can opener']);
    expect(noteSearchTerms(note({ title: 'Ore' }), [])).toEqual([]);
  });

  it('caps the reasons', () => {
    expect(capReasons(['a', 'b'], 2)).toEqual(['a', 'b']);
    expect(capReasons(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b', '… and 2 more']);
  });
});

describe('noteStaleReasons', () => {
  const input = { dataBlocks: [{ key: 'vendor:Gheed', block: gheed }], glossary: [], patchNotes: [] };
  const lock = { stockers: { verified: '3.2.10', blocks: hashDataBlocks(input.dataBlocks) } };

  it('gives drafts no reasons', () => {
    expect(noteStaleReasons({ ...input, note: note({ verified: null }), lock: {} })).toEqual({ reasons: [], unrecorded: false });
  });

  it('is empty when nothing changed', () => {
    expect(noteStaleReasons({ ...input, note: note({}), lock })).toEqual({ reasons: [], unrecorded: false });
  });

  it('flags a missing lock entry, or one recorded for another version', () => {
    const expected = { reasons: ['Verified, but the data behind this note was not recorded; it may have changed'], unrecorded: true };
    expect(noteStaleReasons({ ...input, note: note({}), lock: {} })).toEqual(expected);
    expect(noteStaleReasons({ ...input, note: note({ verified: '3.2.11' }), lock })).toEqual(expected);
  });

  it('combines block and patch-note reasons, capped at 5', () => {
    const patchNotes = ['3.2.11', '3.2.12', '3.2.13', '3.2.14', '3.2.15'].map((version) => ({ version, text: 'stockers' }));
    const changed = [{ key: 'vendor:Gheed', block: { ...gheed, caption: 'Gheed sells (new)' } }];
    expect(noteStaleReasons({ ...input, dataBlocks: changed, patchNotes, note: note({}), lock }).reasons).toEqual([
      "Data in 'Gheed sells (new)' changed since 3.2.10",
      "Patch notes 3.2.11 mention 'Stockers'",
      "Patch notes 3.2.12 mention 'Stockers'",
      "Patch notes 3.2.13 mention 'Stockers'",
      "Patch notes 3.2.14 mention 'Stockers'",
      '… and 1 more',
    ]);
  });
});

describe('setVerifiedInFrontmatter', () => {
  it('replaces the verified line and keeps every other byte', () => {
    const text = '---\ntitle: Forging # the title\nverified: 3.2.10 # old\nvolatility: high\n---\nBody\n\n---\nverified: body\n';
    expect(setVerifiedInFrontmatter(text, '3.2.12')).toBe(
      "---\ntitle: Forging # the title\nverified: '3.2.12' # old\nvolatility: high\n---\nBody\n\n---\nverified: body\n"
    );
  });

  it('keeps a trailing comment and accepts a space before the colon', () => {
    expect(setVerifiedInFrontmatter("---\nverified: '3.2.10' # checked on a sorc\ntitle: A\n---\n", '3.2.12')).toBe(
      "---\nverified: '3.2.12' # checked on a sorc\ntitle: A\n---\n"
    );
    expect(setVerifiedInFrontmatter('---\nverified : 3.2.10\r\ntitle: A\n---\n', '3.2.12')).toBe(
      "---\nverified: '3.2.12'\r\ntitle: A\n---\n"
    );
    expect(setVerifiedInFrontmatter('---\nverified :\n---\n', '3.2.12')).toBe("---\nverified: '3.2.12'\n---\n");
  });

  it('adds the field before the closing fence when missing', () => {
    expect(setVerifiedInFrontmatter('---\ntitle: A\n---\nBody', '3.2.12')).toBe("---\ntitle: A\nverified: '3.2.12'\n---\nBody");
    expect(setVerifiedInFrontmatter('---\n---\n', '3.2.12')).toBe("---\nverified: '3.2.12'\n---\n");
  });

  it('keeps CRLF line endings and a BOM', () => {
    expect(setVerifiedInFrontmatter('﻿---\r\ntitle: A\r\n---\r\nBody\r\n', '3.2.12')).toBe(
      "﻿---\r\ntitle: A\r\nverified: '3.2.12'\r\n---\r\nBody\r\n"
    );
    expect(setVerifiedInFrontmatter("---\r\nverified: '3.2.1'\r\n---\r\n", '3.2.12')).toBe("---\r\nverified: '3.2.12'\r\n---\r\n");
  });

  it('fails without frontmatter', () => {
    expect(setVerifiedInFrontmatter('Body', '3.2.12')).toEqual({ error: 'missing frontmatter (the file must start with a --- block)' });
    expect(setVerifiedInFrontmatter('---\ntitle: A\n', '3.2.12')).toEqual({ error: 'frontmatter is not closed with ---' });
  });
});

describe('formatGuideReport', () => {
  it('groups notes by state with reasons, volatile notes and drafts', () => {
    const lines = formatGuideReport(
      [
        note({ slug: 'a', staleReasons: ["Data in 'X' changed since 3.2.10"], volatility: 'high' }),
        note({ slug: 'b', verified: '3.1.0' }),
        note({
          slug: 'c',
          verified: '3.2.12',
          staleReasons: ['Verified, but the data behind this note was not recorded; it may have changed'],
        }),
        note({ slug: 'd', verified: null, volatility: 'high' }),
      ],
      '3.2.12'
    );
    expect(lines).toEqual([
      'Guide report against ESR 3.2.12: 4 notes',
      '  review 1 · old 1 · fresh 1 · draft 1',
      '',
      'Review (1):',
      '  a (verified 3.2.10)',
      "    - Data in 'X' changed since 3.2.10",
      '',
      'Old (1):',
      '  b (verified 3.1.0)',
      '',
      'Fresh (1):',
      '  c (verified 3.2.12)',
      '    - Verified, but the data behind this note was not recorded; it may have changed',
      '',
      'Volatility high (2): re-check these after every patch',
      '  a [review], d [draft]',
      '',
      'Drafts (1): verify in-game, then npm run guide:verify -- <slug>',
      '  d',
    ]);
  });
});
