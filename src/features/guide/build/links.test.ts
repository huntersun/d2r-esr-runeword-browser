import { describe, expect, it } from 'vitest';
import { resolveLink } from './links.ts';
import { fixtureContext } from './testContext.mock.ts';

describe('resolveLink', () => {
  const ctx = fixtureContext();

  it.each([
    ['rw:Enigma', 'app', '/?name=Enigma'],
    ['gw:Some%20Gemword', 'app', '/gemwords?name=Some%20Gemword'],
    ['unique:Annihilus', 'app', '/uniques?name=Annihilus'],
    ["unique:Artemis'%20Wrath", 'app', "/uniques?name=Artemis'%20Wrath"],
    ['mythical:Frostmourne', 'app', '/mythicals?name=Frostmourne'],
    ['socketable:El%20Rune', 'app', '/socketables?name=El%20Rune'],
    ['gw:A%26B', 'app', '/gemwords?name=A%26B'],
    ['base:crs', 'app', '/game-data/bases?search=%22Crystal%20Sword%22'],
    ['type:swor', 'app', '/game-data/types?type=swor'],
    ['bestbase:Enigma', 'app', '/game-data/best-base?rw=Enigma'],
    ['affixes:base=7cr&ilvl=85', 'app', '/game-data/affixes?base=7cr&ilvl=85'],
    ['page:/game-data/bases', 'app', '/game-data/bases'],
    ['https://example.com/x', 'external', 'https://example.com/x'],
    [
      'docs:Eastern%20Sun%20Resurrected%20Cube%20Recipes.html#special',
      'external',
      'https://easternsunresurrected.com/Eastern%20Sun%20Resurrected%20Cube%20Recipes.html#special',
    ],
  ])('%s', (url, kind, href) => {
    expect(resolveLink(url, ctx)).toEqual({ kind, href });
  });

  it('rejects unique, mythical and socketable names missing from sources.json, case-insensitively', () => {
    expect(resolveLink('unique:annihilus', ctx)).toEqual({ kind: 'app', href: '/uniques?name=annihilus' });
    expect(resolveLink('unique:Nope', ctx)).toEqual({
      error: 'unknown unique item "Nope" (unique:, checked against sources.json and the ESR item tables)',
    });
    expect(resolveLink('mythical:Nope', ctx)).toHaveProperty('error');
    expect(resolveLink('socketable:Annihilus', ctx)).toEqual({
      error: 'unknown socketable (gem, rune or crystal) "Annihilus" (socketable:, checked against sources.json and the ESR item tables)',
    });
    expect(resolveLink('unique:El%20Rune', ctx)).toHaveProperty('error');
    expect(resolveLink('gw:Anything', ctx)).toEqual({ kind: 'app', href: '/gemwords?name=Anything' });
  });

  it('tells uniques, mythicals and socketables apart with the ESR tables', () => {
    const targets = (name: string) =>
      (['unique', 'mythical', 'socketable'] as const).filter((scheme) => !('error' in resolveLink(`${scheme}:${name}`, ctx)));
    expect(targets('Frostmourne')).toEqual(['mythical']);
    expect(targets('Pelta Lunata')).toEqual(['unique']);
    expect(targets('Zod Rune')).toEqual(['socketable']);
    expect(targets('Anvil Stone')).toEqual([]);
    // Without the clone the kinds cannot be told apart
    const lenient = fixtureContext({ esr: null });
    expect(resolveLink('unique:Frostmourne', lenient)).toHaveProperty('kind', 'app');
    expect(resolveLink('socketable:Anvil Stone', lenient)).toHaveProperty('kind', 'app');
  });

  it('rejects unknown runewords, bases, types and schemes', () => {
    expect(resolveLink('rw:Enigmaa', ctx)).toEqual({ error: 'unknown runeword "Enigmaa" (rw:)' });
    expect(resolveLink('base:zzz', ctx)).toHaveProperty('error');
    expect(resolveLink('type:zzz', ctx)).toHaveProperty('error');
    expect(resolveLink('ftp:x', ctx)).toHaveProperty('error');
    expect(resolveLink('relative/path', ctx)).toHaveProperty('error');
    expect(resolveLink('page:game-data', ctx)).toHaveProperty('error');
    expect(resolveLink('page:/builds', ctx)).toHaveProperty('error');
    expect(resolveLink('page:/game-data/bases?search=x', ctx)).toEqual({ kind: 'app', href: '/game-data/bases?search=x' });
  });

  it('warns about docs files or anchors missing from the clone, and skips the check without one', () => {
    expect(resolveLink('docs:gems.htm#x', ctx)).toMatchObject({ warning: 'docs: file "gems.htm" not found in the ESR clone\'s docs/' });
    expect(resolveLink('docs:Eastern%20Sun%20Resurrected%20Cube%20Recipes.html#nope', ctx)).toHaveProperty('warning');
    expect(resolveLink('docs:gems.htm#x', fixtureContext({ docs: null }))).toEqual({
      kind: 'external',
      href: 'https://easternsunresurrected.com/gems.htm#x',
    });
  });
});
