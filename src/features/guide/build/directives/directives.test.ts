import { describe, expect, it } from 'vitest';
import { fixtureContext, fixtureEsr } from '../testContext.mock.ts';
import { formatInput } from './cubeText.ts';
import { LEAF_DIRECTIVES, resolveTerm } from './index.ts';
import { collectSecretRecipes } from './secretRecipes.ts';

function resolve(name: string, arg: string | null, ctx = fixtureContext()) {
  const resolver = LEAF_DIRECTIVES[name];
  if (resolver === undefined) throw new Error(`no resolver ${name}`);
  return resolver(arg, ctx);
}

describe('cube text', () => {
  it('formats quantities, qualities and notes', () => {
    const esr = fixtureEsr();
    expect(formatInput('gem5,qty=2', esr)).toBe('2× Perfect Gem');
    expect(formatInput('ring,mag,nos', esr)).toBe('Magic Ring (no sockets)');
    expect(formatInput('01a', esr)).toBe('Ancient Scroll 1');
    expect(formatInput('zzz', esr)).toBe('zzz');
  });
});

describe('secret recipes', () => {
  it('collapses the variants of one recipe number into one row and skips disabled rows', () => {
    const recipes = collectSecretRecipes(fixtureEsr());
    expect([...recipes.keys()]).toEqual([1, 2]);
    expect(recipes.get(1)).toEqual({
      inputs: ['Crafted Ring', '2× Perfect Gem', 'Ancient Scroll 1'],
      output: 'Ring (Unique) / Unique item of the same type',
      note: '#1: Unique Ring: Crafted Ring + P-Gem',
    });
    expect(recipes.get(2)?.output).toBe('An item of the same type (keeps its stats, 1 socket)');
  });

  it('resolves all recipes and a single recipe', () => {
    const all = resolve('secret-recipes', null);
    expect('kind' in all && all.kind === 'recipes' && all.rows).toHaveLength(2);
    const one = resolve('secret-recipe', '2');
    expect(one).toMatchObject({
      kind: 'recipes',
      caption: 'Secret recipe 2 (the Ancient Scroll is returned)',
      rows: [{ inputs: ['Magic Ring (no sockets)', 'Jewel'] }],
    });
  });

  it('reports bad arguments, unknown numbers and a missing clone', () => {
    expect(resolve('secret-recipe', null)).toHaveProperty('error');
    expect(resolve('secret-recipe', '99')).toEqual({ error: '::secret-recipe[99]: no [SECRET99] rows in cubemain.txt' });
    expect(resolve('secret-recipes', 'x')).toHaveProperty('error');
    expect(resolve('secret-recipes', null, fixtureContext({ esr: null }))).toEqual({
      error: '::secret-recipes needs the ESR clone (not found; pass --esr <dir>)',
    });
  });
});

describe('recipe-output', () => {
  it('lists the distinct outputs of the rows with that description', () => {
    expect(resolve('recipe-output', "Adventurer's Pack")).toEqual({
      kind: 'items',
      caption: "Adventurer's Pack contains",
      items: [
        { label: "Noob's Odd Charm", detail: 'Normal, 1 socket' },
        { label: 'Kill Ledger', detail: null },
      ],
    });
    expect(resolve('recipe-output', 'Nope')).toHaveProperty('error');
  });
});

describe('vendor', () => {
  it('lists what an NPC sells from misc, armor and weapons (case-insensitive NPC name)', () => {
    expect(resolve('vendor', 'gheed')).toEqual({
      kind: 'items',
      caption: 'Sold by Gheed',
      items: [
        { label: 'Jewel', detail: 'magic only' },
        { label: 'Rerolling Orb', detail: null },
        { label: 'Skull Cap', detail: null },
      ],
    });
    expect(resolve('vendor', 'Charsi')).toMatchObject({ items: [{ label: 'Crystal Sword' }] });
  });

  it('rejects unknown NPCs (TMog is not a vendor)', () => {
    expect(resolve('vendor', 'TMog')).toHaveProperty('error');
    expect(resolve('vendor', null)).toHaveProperty('error');
  });
});

describe('difficulty-penalties', () => {
  it('builds a table from difficultylevels.txt', () => {
    expect(resolve('difficulty-penalties', null)).toEqual({
      kind: 'table',
      caption: 'Penalties per difficulty',
      header: ['Difficulty', 'Resistance penalty', 'Experience lost on death', 'Monster skill bonus'],
      rows: [
        ['Normal', '0', '0%', '+0'],
        ['Nightmare', '-40', '5%', '+3'],
        ['Hell', '-100', '10%', '+7'],
      ],
    });
  });
});

describe('source', () => {
  it('returns the labels from sources.json, matching names case-insensitively', () => {
    expect(resolve('source', 'annihilus')).toEqual({
      kind: 'source',
      item: 'Annihilus',
      labels: [{ kind: 'boss', text: 'Drops from Diablo Clone' }],
    });
    expect(resolve('source', 'Nope')).toEqual({ error: '::source[Nope]: no item with that name in sources.json' });
  });

  it('works without the ESR clone', () => {
    expect(resolve('source', 'Annihilus', fixtureContext({ esr: null }))).toHaveProperty('kind', 'source');
  });
});

describe('glossary and term', () => {
  it('lists the glossary sorted by term', () => {
    expect(resolve('glossary', null)).toMatchObject({ kind: 'glossary', entries: [{ term: 'Cube' }, { term: 'Stocker' }] });
  });

  it('resolves terms case-insensitively and keeps the label', () => {
    const ctx = fixtureContext();
    expect(resolveTerm('stocker', 'stockers', ctx)).toEqual({
      type: 'term',
      term: 'Stocker',
      children: [{ type: 'text', value: 'stockers' }],
    });
    expect(resolveTerm('Cube', null, ctx)).toEqual({ type: 'term', term: 'Cube', children: [{ type: 'text', value: 'Cube' }] });
    expect(resolveTerm('Nope', null, ctx)).toHaveProperty('error');
  });
});
