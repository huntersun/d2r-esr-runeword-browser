import { describe, it, expect } from 'vitest';
import {
  classifyPath,
  compactKeys,
  diffStrings,
  diffTsv,
  docKind,
  formatReleaseDiff,
  listWithMore,
  newChangelogEntries,
  parseChangelogEntries,
  parseChanges,
  patchNoteVersion,
  type ReleaseDiff,
} from './releaseDiff.ts';

const EXCEL = 'Eastern_Sun_Resurrected.mpq/data/global/excel';
const STRINGS = 'Eastern_Sun_Resurrected.mpq/data/local/lng/strings';

const entryHtml = (version: string, label: string, href: string) => `
  <div style="text-align: center;"><b><span style="color: #c8b478;">Eastern
      Sun Resurrected ${version} -
      06/08/2026</span></b></div>
  <div style="text-align: center;"><br><a
      href="${href}">${label}</a><br><br><br></div>`;

describe('releaseDiff', () => {
  it('classifies paths into sections', () => {
    expect(classifyPath('patchnotes/3.2.12.md')).toBe('patchNotes');
    expect(classifyPath('docs/changelogs.html')).toBe('changelog');
    expect(classifyPath(`${EXCEL}/skills.txt`)).toBe('tables');
    expect(classifyPath(`${EXCEL}/base/skills.txt`)).toBe('tablesBase');
    expect(classifyPath(`${STRINGS}/skills.json`)).toBe('strings');
    expect(classifyPath('docs/runewords.htm')).toBe('docs');
    expect(classifyPath('d2rloader/metadata.json')).toBe('launcher');
    expect(classifyPath('Eastern_Sun_Resurrected.mpq/data/hd/items/uniques.json')).toBe('other');
  });

  it('merges name-status and numstat output', () => {
    const nameStatus = 'M\tdocs/a.htm\nA\td2rloader/x.dll\nD\tgone.txt\n';
    const numstat = '3\t1\tdocs/a.htm\n-\t-\td2rloader/x.dll\n0\t7\tgone.txt\n';
    expect(parseChanges(nameStatus, numstat)).toEqual([
      { status: 'M', path: 'docs/a.htm', added: 3, removed: 1 },
      { status: 'A', path: 'd2rloader/x.dll', added: null, removed: null },
      { status: 'D', path: 'gone.txt', added: 0, removed: 7 },
    ]);
  });

  it('reads the version from a patch notes file name', () => {
    expect(patchNoteVersion('patchnotes/3.2.12.md')).toBe('3.2.12');
  });

  it('extracts changelog entries and finds the new ones', () => {
    const old = entryHtml('3.2.01', 'Bug fixes', 'https://docs.google.com/document/d/A');
    const html = entryHtml('3.2.02', 'New  <b>class</b>', 'https://docs.google.com/document/d/B') + old;
    expect(parseChangelogEntries(html)).toEqual([
      { version: '3.2.02', date: '06/08/2026', label: 'New class', href: 'https://docs.google.com/document/d/B' },
      { version: '3.2.01', date: '06/08/2026', label: 'Bug fixes', href: 'https://docs.google.com/document/d/A' },
    ]);
    expect(newChangelogEntries(old, html).map((entry) => entry.version)).toEqual(['3.2.02']);
    expect(newChangelogEntries(html, html)).toEqual([]);
  });

  it('diffs TSV rows by first column and position', () => {
    const before = 'name\tvalue\r\nA\t1\r\nB\t2\r\nB\t3\r\nC\t4\r\n';
    const after = 'name\tvalue\tnew\nA\t1\t\nB\t2\t\nD\t5\t\nD\t6\t\n';
    const diff = diffTsv('t.txt', 'M', before, after);
    expect(diff).toMatchObject({
      rowsBefore: 4,
      rowsAfter: 4,
      added: 2,
      removed: 2,
      changed: 2,
      addedKeys: ['D', 'D'],
      removedKeys: ['B', 'C'],
      addedColumns: ['new'],
      removedColumns: [],
      columnsReordered: false,
    });
    expect(diffTsv('t.txt', 'M', 'a\tb\nx\t1\n', 'b\ta\n1\tx\n').columnsReordered).toBe(true);
    expect(diffTsv('t.txt', 'A', '', 'a\nx\n')).toMatchObject({ rowsBefore: 0, rowsAfter: 1, added: 1, addedColumns: [] });
  });

  it('diffs string files by Key', () => {
    const before = JSON.stringify([
      { id: 1, Key: 'a', enUS: 'Alpha', deDE: 'A' },
      { id: 2, Key: 'b', enUS: 'Beta', deDE: 'B' },
      { id: 3, Key: 'c', enUS: 'Gamma' },
    ]);
    const after =
      '\uFEFF' +
      JSON.stringify([
        { id: 1, Key: 'a', enUS: 'Alpha', deDE: 'AA' },
        { id: 2, Key: 'b', enUS: 'Beta!', deDE: 'B' },
        { id: 4, Key: 'd', enUS: 'Delta' },
      ]);
    expect(diffStrings('s.json', 'M', before, after)).toEqual({
      path: 's.json',
      status: 'M',
      added: 1,
      removed: 1,
      changed: 2,
      addedKeys: ['d'],
      removedKeys: ['c'],
      enUSChanges: [{ key: 'b', before: 'Beta', after: 'Beta!' }],
    });
  });

  it('marks hand-written docs pages', () => {
    expect(docKind('docs/vessel_of_souls.htm')).toBe('hand-written');
    expect(docKind('docs/Eastern Sun Resurrected Cube Recipes.html')).toBe('hand-written');
    expect(docKind('docs/Eastern Sun Resurrected Maps.html')).toBe('hand-written');
    expect(docKind('docs/endgame_maps.htm')).toBe('hand-written');
    expect(docKind('docs/runewords.htm')).toBe('generated');
    expect(docKind('docs/images/x.png')).toBe('asset');
  });

  it('caps and compacts lists', () => {
    expect(listWithMore(['a', 'b', 'c'], 2)).toBe('a, b, … and 1 more');
    expect(listWithMore(['a'], 2)).toBe('a');
    expect(compactKeys(['a', 'b', 'a'])).toEqual(['a ×2', 'b']);
  });

  const revision = (commit: string, describe: string) => ({ rev: describe, commit, describe, date: '2026-10-10' });
  const empty: ReleaseDiff = {
    from: revision('aaaaaaaaaa', '3.2.10'),
    to: revision('bbbbbbbbbb', '3.2.12'),
    patchNotes: [],
    changelog: null,
    tables: [],
    tablesBaseIgnored: 0,
    strings: [],
    docs: [],
    launcher: [],
    other: [],
  };

  it('formats an empty diff', () => {
    expect(formatReleaseDiff(empty)).toEqual([
      'From: aaaaaaaa (3.2.10, 2026-10-10)',
      'To:   bbbbbbbb (3.2.12, 2026-10-10)',
      '',
      'No changes between aaaaaaaa and bbbbbbbb.',
    ]);
  });

  it('formats every section in order', () => {
    const lines = formatReleaseDiff({
      ...empty,
      patchNotes: [{ path: 'patchnotes/3.2.12.md', status: 'A', version: '3.2.12', text: '**Fixes**\n\n* One\n', diff: null }],
      changelog: [{ version: '3.2.12', date: '10/10/2026', label: 'Bug fixes', href: 'https://x' }],
      tables: [diffTsv(`${EXCEL}/skills.txt`, 'M', 'skill\tx\nAxe Swarm\t1\n', 'skill\tx\nWarpath\t1\n')],
      tablesBaseIgnored: 1,
      strings: [diffStrings(`${STRINGS}/skills.json`, 'M', '[{"Key":"k","enUS":"old"}]', '[{"Key":"k","enUS":"new"}]')],
      docs: [{ path: 'docs/vessel_of_souls.htm', status: 'M', kind: 'hand-written', bytesBefore: 100, bytesAfter: 90 }],
      launcher: [{ status: 'A', path: 'd2rloader/plugins/x.dll', added: null, removed: null, diff: null }],
      other: [{ status: 'M', path: 'data/hd/items/uniques.json', added: 2, removed: 1 }],
    });
    expect(lines.slice(2)).toEqual([
      '',
      '=== 1. Patch notes (patchnotes/) ===',
      '',
      '--- patchnotes/3.2.12.md [A] version 3.2.12',
      '    **Fixes**',
      '    ',
      '    * One',
      '',
      '',
      '=== 2. Changelog page (docs/changelogs.html) ===',
      '',
      '3.2.12 (10/10/2026): Bug fixes → https://x',
      '',
      '=== 3. Game tables (excel/*.txt) ===',
      '',
      'skills.txt [M]: rows 1 → 1 (+1 added, -1 removed, ~0 changed)',
      '    added rows: Warpath',
      '    removed rows: Axe Swarm',
      '(1 changed files under excel/base/ ignored: duplicate of excel/)',
      '',
      '=== 4. Strings ===',
      '',
      'skills.json [M]: +0 added, -0 removed, ~1 changed',
      '    k: "old" → "new" (enUS)',
      '',
      '=== 5. Official docs pages (docs/) ===',
      '',
      '[M] docs/vessel_of_souls.htm (-10 bytes) [HAND-WRITTEN]',
      '',
      '=== 6. Launcher configs (d2rloader/) ===',
      '',
      '[A] d2rloader/plugins/x.dll (binary)',
      '',
      '=== 7. Everything else ===',
      '',
      '[M] data/hd/items/uniques.json (+2 -1 lines)',
    ]);
  });
});
