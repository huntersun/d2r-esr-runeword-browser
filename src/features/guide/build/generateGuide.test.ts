import { describe, expect, it } from 'vitest';
import { generateGuide, type GuideContentFiles } from './generateGuide.ts';
import { serializeVerifyLock, type PatchNote, type VerifyLock } from './staleness.ts';
import { DOCS, fixtureEsr, fixtureGameData } from './testContext.mock.ts';

const SPINE = `steps:
  - title: Start
    summary: First things.
    notes: [starter-pack, cube-basics]
questions:
  - label: I found a scroll
    note: secret-recipes
`;

const GLOSSARY = `- term: Stocker
  definition: Holds many copies of one material.
  note: cube-basics
`;

const SOURCES = `- id: official-cube
  title: Official cube page
  url: https://easternsunresurrected.com/
`;

function content(notes: Record<string, string>): GuideContentFiles {
  return {
    notes: Object.entries(notes).map(([slug, text]) => ({ file: `notes/${slug}.md`, text })),
    spine: SPINE,
    glossary: GLOSSARY,
    sources: SOURCES,
  };
}

const NOTES = {
  'starter-pack': `---
title: Starter's Pack
summary: Open it first.
verified: 3.2.12
sources: [official-cube]
mentions: [Kill Ledger, Not An Item]
---
Read [[cube-basics]] and use a :term[Stocker].

::recipe-output[Adventurer's Pack]
`,
  'cube-basics': `---
title: Cube basics
summary: How the cube works.
related: [starter-pack]
---
The cube.
`,
  'secret-recipes': `---
title: Secret recipes
summary: Scrolls unlock recipes.
next: starter-pack
---
::secret-recipe[1]
`,
};

function generate(notes: Record<string, string>, esr = fixtureEsr(), extra: { verifyLock?: string; patchNotes?: PatchNote[] } = {}) {
  return generateGuide({
    content: { ...content(notes), verifyLock: extra.verifyLock ?? null },
    gameData: fixtureGameData(),
    esr,
    docs: DOCS,
    patchNotes: extra.patchNotes,
  });
}

describe('generateGuide', () => {
  it('builds the bundle with resolved links, graph fields and counts', () => {
    const result = generate(NOTES);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      'notes/starter-pack.md: mentions: "Not An Item" not found in the game data',
      'notes/starter-pack.md: verified 3.2.12 is not recorded in .verify-lock.json (run npm run guide:verify -- starter-pack)',
    ]);
    const [cube, secret, starter] = result.bundle.notes;
    expect(result.bundle.notes.map((note) => note.slug)).toEqual(['cube-basics', 'secret-recipes', 'starter-pack']);
    expect(starter).toMatchObject({ backlinks: ['cube-basics'], next: 'cube-basics', spineStep: 0, words: 7 });
    const paragraph = starter?.body[0];
    expect(paragraph?.type === 'paragraph' && paragraph.children[1]).toEqual({
      type: 'link',
      kind: 'note',
      href: 'cube-basics',
      children: [{ type: 'text', value: 'Cube basics' }],
    });
    expect(cube).toMatchObject({ backlinks: ['starter-pack'], next: null, spineStep: 0 });
    expect(secret).toMatchObject({ backlinks: [], next: 'starter-pack', spineStep: null });
    expect(result.bundle.glossary).toEqual([{ term: 'Stocker', definition: 'Holds many copies of one material.', note: 'cube-basics' }]);
    expect(result.bundle.sourceRefs).toEqual([
      { id: 'official-cube', title: 'Official cube page', url: 'https://easternsunresurrected.com/', license: null, note: null },
    ]);
    expect(result.counts).toEqual({
      notes: 3,
      drafts: 2,
      words: 9,
      dataBlocks: 2,
      spineSteps: 1,
      questions: 1,
      glossary: 1,
      sourceRefs: 1,
    });
  });

  it('collects every error instead of stopping at the first', () => {
    const result = generate({
      ...NOTES,
      'cube-basics': NOTES['cube-basics'].replace('related: [starter-pack]', 'related: [nope]\nsources: [missing]'),
      orphan: '---\ntitle: Orphan\nsummary: Nobody links here.\n---\n[x](rw:Nope)\n',
    });
    expect(result.errors).toEqual([
      'notes/cube-basics.md: sources: unknown id "missing" (add it to _sources.yml)',
      'notes/orphan.md:5: unknown runeword "Nope" (rw:)',
      'notes/cube-basics.md: related: unknown note "nope"',
      'notes/orphan.md: orphan note (not on the spine and not linked from any other note)',
    ]);
  });

  it('warns about long notes and a missing clone, and fails ESR directives without it', () => {
    const long = { ...NOTES, 'cube-basics': NOTES['cube-basics'].replace('The cube.', 'word '.repeat(401)) };
    expect(generate(long).warnings).toContain('notes/cube-basics.md: 401 words (target 150–250, warning above 400)');
    const result = generateGuide({ content: content(NOTES), gameData: fixtureGameData(), esr: null, docs: null });
    expect(result.warnings[0]).toBe('ESR clone missing: directives that read the txt files cannot resolve');
    expect(result.errors).toEqual([
      'notes/secret-recipes.md:6: ::secret-recipe needs the ESR clone (not found; pass --esr <dir>)',
      'notes/starter-pack.md:10: ::recipe-output needs the ESR clone (not found; pass --esr <dir>)',
    ]);
  });
});

describe('generateGuide staleness', () => {
  const verified = {
    ...NOTES,
    'starter-pack': NOTES['starter-pack'].replace('verified: 3.2.12', "verified: '3.2.10'"),
    'secret-recipes': NOTES['secret-recipes'].replace('next: starter-pack', "next: starter-pack\nverified: '3.2.10'"),
  };

  function lockFor(slugs: string[], change: (lock: VerifyLock) => void = () => undefined): string {
    const hashes = generate(verified).blockHashes;
    const lock: VerifyLock = {};
    for (const slug of slugs) lock[slug] = { verified: '3.2.10', blocks: { ...hashes.get(slug) } };
    change(lock);
    return serializeVerifyLock(lock);
  }

  const reasons = (result: ReturnType<typeof generate>) => new Map(result.bundle.notes.map((note) => [note.slug, note.staleReasons]));

  it('keys data blocks by directive source', () => {
    const hashes = generate(verified).blockHashes;
    expect(Object.keys(hashes.get('starter-pack') ?? {})).toEqual(["recipe-output:Adventurer's Pack"]);
    expect(Object.keys(hashes.get('secret-recipes') ?? {})).toEqual(['secret-recipe:1']);
    expect(hashes.get('cube-basics')).toEqual({});
  });

  it('flags changed blocks, leaves unchanged and draft notes alone', () => {
    const lock = lockFor(['starter-pack', 'secret-recipes'], (entries) => {
      const entry = entries['secret-recipes'];
      if (entry) entry.blocks['secret-recipe:1'] = 'old-hash';
    });
    const result = generate(verified, fixtureEsr(), { verifyLock: lock });
    expect(result.errors).toEqual([]);
    const stale = reasons(result);
    expect(stale.get('starter-pack')).toEqual([]);
    expect(stale.get('cube-basics')).toEqual([]);
    expect(stale.get('secret-recipes')).toEqual([expect.stringMatching(/^Data in '.+' changed since 3\.2\.10$/)]);
  });

  it('flags a missing lock entry with a reason and a build warning', () => {
    const result = generate(verified, fixtureEsr(), { verifyLock: lockFor(['starter-pack']) });
    expect(reasons(result).get('secret-recipes')).toEqual([
      'Verified, but the data behind this note was not recorded; it may have changed',
    ]);
    expect(result.warnings).toContain(
      'notes/secret-recipes.md: verified 3.2.10 is not recorded in .verify-lock.json (run npm run guide:verify -- secret-recipes)'
    );
    expect(result.warnings.filter((warning) => warning.includes('starter-pack.md: verified'))).toEqual([]);
  });

  it('flags newer patch notes that mention the note, glossary terms it owns included', () => {
    const patchNotes = [
      { version: '3.2.09', text: "Starter's Pack reworked." },
      { version: '3.2.11', text: "* The starter's pack now holds a stocker. Kill Ledgers are cheaper." },
    ];
    const notes = { ...verified, 'cube-basics': NOTES['cube-basics'].replace('related:', "verified: '3.2.10'\nrelated:") };
    const lock = lockFor(['starter-pack', 'secret-recipes'], (entries) => {
      entries['cube-basics'] = { verified: '3.2.10', blocks: {} };
    });
    const stale = reasons(generate(notes, fixtureEsr(), { verifyLock: lock, patchNotes }));
    expect(stale.get('starter-pack')).toEqual(["Patch notes 3.2.11 mention 'Starter's Pack'"]);
    expect(stale.get('cube-basics')).toEqual(["Patch notes 3.2.11 mention 'Stocker'"]);
    expect(stale.get('secret-recipes')).toEqual([]);
  });

  it('reports an invalid lock file as a build error', () => {
    expect(generate(NOTES, fixtureEsr(), { verifyLock: '{ nope' }).errors[0]).toMatch(/^\.verify-lock\.json: invalid JSON/);
  });
});
