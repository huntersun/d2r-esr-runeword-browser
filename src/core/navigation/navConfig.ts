/**
 * Header navigation config: the grouped desktop menus and the mobile accordion both render from `NAV_ENTRIES`.
 * `navConfig.test.ts` checks every path against the router and that labels are unique.
 */

export const ESR_DOCS_URL = 'https://easternsunresurrected.com/';
export const ESR_CHANGELOG_URL = 'https://easternsunresurrected.com/changelogs.html';
export const GITHUB_URL = 'https://github.com/istvan-panczel/d2r-esr-runeword-browser';

export interface NavItem {
  readonly key: string;
  readonly to: string;
  readonly label: string;
  /** One line shown under the label in the desktop dropdown. */
  readonly description: string;
  /** Active only on the exact path (the home route); otherwise also on every child path. */
  readonly end?: boolean;
}

export interface NavGroup {
  readonly kind: 'group';
  readonly key: string;
  readonly label: string;
  readonly items: readonly NavItem[];
}

export interface NavLinkEntry {
  readonly kind: 'link';
  readonly item: NavItem;
  /** Shown only when the Supabase backend is configured. */
  readonly requiresSupabase?: boolean;
}

export type NavEntry = NavGroup | NavLinkEntry;

export const NAV_ENTRIES: readonly NavEntry[] = [
  {
    kind: 'group',
    key: 'recipes',
    label: 'Recipes',
    items: [
      { key: 'runewords', to: '/', label: 'Runewords', description: 'Rune recipes by base, sockets and level', end: true },
      { key: 'gemwords', to: '/gemwords', label: 'Gemwords', description: 'Gem and jewel socket recipes' },
      { key: 'socketables', to: '/socketables', label: 'Socketables', description: 'Runes, gems and jewels with their bonuses' },
    ],
  },
  {
    kind: 'group',
    key: 'items',
    label: 'Items',
    items: [
      { key: 'uniques', to: '/uniques', label: 'Uniques', description: 'Unique items by category and coupon' },
      { key: 'mythicals', to: '/mythicals', label: 'Mythicals', description: 'Mythical unique items' },
      { key: 'ascendancies', to: '/ascendancies', label: 'Ascendancies', description: 'Ascendancies and their tier bonuses' },
      { key: 'bases', to: '/game-data/bases', label: 'Bases', description: 'Base items from the game files' },
    ],
  },
  {
    kind: 'group',
    key: 'tools',
    label: 'Tools',
    items: [
      { key: 'best-base', to: '/game-data/best-base', label: 'Best Base', description: 'Best base for a runeword and character' },
      { key: 'affixes', to: '/game-data/affixes', label: 'Affixes', description: 'Affixes and what can roll on a base' },
      { key: 'item-types', to: '/game-data/types', label: 'Item Types', description: 'Item type tree and socket caps' },
      { key: 'enhance', to: '/game-data/enhance', label: 'Enhance', description: 'Corruption, anointment and Vessel of Souls outcomes' },
      { key: 'loot-filters', to: '/loot-filters', label: 'Loot Filters', description: 'Build and test loot filters' },
    ],
  },
  { kind: 'link', item: { key: 'guide', to: '/guide', label: 'Guide', description: 'New-player guide and notes' } },
  {
    kind: 'link',
    item: { key: 'builds', to: '/builds', label: 'Builds', description: 'Shared character builds' },
    requiresSupabase: true,
  },
];

/** The entries to render: drops the backend-only ones when Supabase is not configured. */
export function getNavEntries(isSupabaseEnabled: boolean): readonly NavEntry[] {
  return NAV_ENTRIES.filter((entry) => entry.kind === 'group' || !entry.requiresSupabase || isSupabaseEnabled);
}

/** Every page item of the config, in order (groups flattened, plain links included). */
export function getAllNavItems(entries: readonly NavEntry[] = NAV_ENTRIES): readonly NavItem[] {
  return entries.flatMap((entry) => (entry.kind === 'group' ? entry.items : [entry.item]));
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function isNavGroupActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isNavItemActive(pathname, item));
}
