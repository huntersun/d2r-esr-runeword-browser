/**
 * Navigation config: the header's grouped desktop menus, its mobile accordion and the home page's section cards all
 * render from `NAV_ENTRIES`, so they never drift. `navConfig.test.ts` checks every path against the router and that
 * labels are unique.
 */

export const ESR_DOCS_URL = 'https://easternsunresurrected.com/';
export const ESR_CHANGELOG_URL = 'https://easternsunresurrected.com/changelogs.html';
export const GITHUB_URL = 'https://github.com/istvan-panczel/d2r-esr-runeword-browser';
/** The privacy policy lives at the repo root (PRIVACY_POLICY.md); linked from the sign-in consent gate and the home footer. */
export const PRIVACY_POLICY_URL = `${GITHUB_URL}/blob/master/PRIVACY_POLICY.md`;

export interface NavItem {
  readonly key: string;
  readonly to: string;
  readonly label: string;
  /** One line shown under the label in the desktop dropdown (and the home card of a plain link). */
  readonly description: string;
}

/** A page chip on a home section card. */
export interface HomeLink {
  readonly key: string;
  readonly to: string;
  readonly label: string;
}

export interface NavGroup {
  readonly kind: 'group';
  readonly key: string;
  readonly label: string;
  /** One line on the group's home section card. */
  readonly description: string;
  readonly items: readonly NavItem[];
}

export interface NavLinkEntry {
  readonly kind: 'link';
  readonly item: NavItem;
  /** Shown only when the Supabase backend is configured. */
  readonly requiresSupabase?: boolean;
  /** The chips of the link's home card when it should offer more than the page itself (the first one is the item). */
  readonly homeLinks?: readonly HomeLink[];
}

export type NavEntry = NavGroup | NavLinkEntry;

export const NAV_ENTRIES: readonly NavEntry[] = [
  {
    kind: 'group',
    key: 'recipes',
    label: 'Recipes',
    description: 'Runeword and gemword recipes, and the runes, gems and jewels that go in them',
    items: [
      { key: 'runewords', to: '/runewords', label: 'Runewords', description: 'Rune recipes by base, sockets and level' },
      { key: 'gemwords', to: '/gemwords', label: 'Gemwords', description: 'Gem and jewel socket recipes' },
      { key: 'socketables', to: '/socketables', label: 'Socketables', description: 'Runes, gems and jewels with their bonuses' },
    ],
  },
  {
    kind: 'group',
    key: 'items',
    label: 'Items',
    description: 'Uniques, mythicals, ascendancies and every base item',
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
    description: 'Pick a base, check affix rolls, plan enhancements and write loot filters',
    items: [
      { key: 'best-base', to: '/game-data/best-base', label: 'Best Base', description: 'Best base for a runeword and character' },
      { key: 'affixes', to: '/game-data/affixes', label: 'Affixes', description: 'Affixes and what can roll on a base' },
      { key: 'item-types', to: '/game-data/types', label: 'Item Types', description: 'Item type tree and socket caps' },
      { key: 'enhance', to: '/game-data/enhance', label: 'Enhance', description: 'Corruption, anointment and Vessel of Souls outcomes' },
      { key: 'loot-filters', to: '/loot-filters', label: 'Loot Filters', description: 'Build and test loot filters' },
    ],
  },
  {
    kind: 'link',
    item: { key: 'guide', to: '/guide', label: 'Guide', description: 'New-player guide: what ESR changes and where to go next' },
    homeLinks: [
      { key: 'guide', to: '/guide', label: 'Start here' },
      { key: 'guide-map', to: '/guide/map', label: 'Note map' },
    ],
  },
  {
    kind: 'link',
    item: { key: 'builds', to: '/builds', label: 'Builds', description: 'Character builds shared by other players' },
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
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function isNavGroupActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isNavItemActive(pathname, item));
}
