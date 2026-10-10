import { describe, expect, it } from 'vitest';
import type { DataBlock, GuideNote } from '../engine/schema.ts';
import { makeNote } from '../engine/testNote.mock.ts';
import {
  capReasons,
  compareBlockHashes,
  hashDataBlocks,
  keyDataBlocks,
  mentionsTerm,
  noteSearchTerms,
  noteStaleReasons,
  scanPatchNotes,
  versionFromPatchNoteFile,
} from './staleness.ts';
import { directiveKey } from './markdown.ts';

const gheed: DataBlock = { kind: 'items', caption: 'Gheed sells', items: [{ label: 'Stocker', detail: null }] };
const shard: DataBlock = { kind: 'source', item: 'Worldstone Shard', labels: [] };

function note(overrides: Partial<GuideNote>): GuideNote {
  return makeNote({ slug: 'stockers', title: 'Stockers', verified: '3.2.10', ...overrides });
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

  it('keys and captions recipe family and card blocks', () => {
    const keyed = keyDataBlocks([
      { key: 'recipes:dstone-cycle', block: { kind: 'recipes', caption: 'Dragon Stone cycle', rows: [] } },
      { key: 'card:rw:Enigma', block: { kind: 'card', item: 'runeword', name: 'Enigma', href: '/?name=Enigma' } },
    ]);
    expect(keyed.map(({ key, caption }) => [key, caption])).toEqual([
      ['recipes:dstone-cycle', 'Dragon Stone cycle'],
      ['card:rw:Enigma', 'Card: Enigma'],
    ]);
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
