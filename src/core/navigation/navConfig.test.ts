import { matchRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { router } from '@/core/router';
import { NAV_ENTRIES, getAllNavItems, getNavEntries, isNavGroupActive, isNavItemActive, type NavGroup } from './navConfig';

const items = getAllNavItems();
const homeLinkPaths = NAV_ENTRIES.flatMap((entry) => (entry.kind === 'link' ? (entry.homeLinks ?? []).map((link) => link.to) : []));

describe('navConfig', () => {
  it.each([...items.map((item) => item.to), ...homeLinkPaths].map((to) => [to] as const))(
    '%s resolves to a real route (not the catch-all)',
    (path) => {
      const matches = matchRoutes(router.routes, path);
      expect(matches).not.toBeNull();
      const deepest = matches?.at(-1);
      expect(deepest?.route.path).not.toBe('*');
    }
  );

  it('has unique labels and keys across groups and items', () => {
    const groups = NAV_ENTRIES.filter((e): e is NavGroup => e.kind === 'group');
    const labels = [...groups.map((g) => g.label), ...items.map((i) => i.label)];
    expect(new Set(labels).size).toBe(labels.length);
    const keys = [...groups.map((g) => g.key), ...items.map((i) => i.key)];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('detects an unknown path (sanity check of the route matcher)', () => {
    expect(matchRoutes(router.routes, '/no-such-page')?.at(-1)?.route.path).toBe('*');
  });

  it('has unique paths and a description for every item', () => {
    expect(new Set(items.map((i) => i.to)).size).toBe(items.length);
    for (const item of items) expect(item.description.trim(), item.label).not.toBe('');
  });

  it('hides Builds unless Supabase is configured', () => {
    const labels = (enabled: boolean) => getAllNavItems(getNavEntries(enabled)).map((i) => i.label);
    expect(labels(false)).not.toContain('Builds');
    expect(labels(true)).toContain('Builds');
  });

  it('marks the item and its group active on its own and child paths, never on the home page', () => {
    const tools = NAV_ENTRIES.find((e): e is NavGroup => e.kind === 'group' && e.key === 'tools');
    const recipes = NAV_ENTRIES.find((e): e is NavGroup => e.kind === 'group' && e.key === 'recipes');
    if (!tools || !recipes) throw new Error('missing group');
    expect(isNavGroupActive('/loot-filters/abc', tools)).toBe(true);
    expect(isNavGroupActive('/game-data/bases', tools)).toBe(false);
    expect(isNavGroupActive('/guide', recipes)).toBe(false);
    expect(isNavGroupActive('/runewords', recipes)).toBe(true);
    expect(isNavGroupActive('/', recipes)).toBe(false);
    const runewords = recipes.items[0];
    expect(isNavItemActive('/gemwords', runewords)).toBe(false);
    expect(isNavItemActive('/loot-filtersx', tools.items[3])).toBe(false);
  });
});
