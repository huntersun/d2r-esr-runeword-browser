import { describe, expect, it } from 'vitest';
import { generateGuide, type GuideContentFiles } from './generateGuide.ts';
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

function generate(notes: Record<string, string>, esr = fixtureEsr()) {
  return generateGuide({ content: content(notes), gameData: fixtureGameData(), esr, docs: DOCS });
}

describe('generateGuide', () => {
  it('builds the bundle with resolved links, graph fields and counts', () => {
    const result = generate(NOTES);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(['notes/starter-pack.md: mentions: "Not An Item" not found in the game data']);
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
