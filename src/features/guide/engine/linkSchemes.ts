/**
 * Link schemes of the guide markdown (`[label](scheme:target)`, see docs/features/GUIDE.md), shared by the generator
 * (links.ts, markdown.ts, ::card) and the browser (app-link icons).
 *
 * Shared code: relative `.ts` imports only, no DOM.
 */

export const LINK_SCHEMES = [
  'rw',
  'gw',
  'unique',
  'mythical',
  'socketable',
  'base',
  'type',
  'bestbase',
  'affixes',
  'page',
  'docs',
] as const;
export type LinkScheme = (typeof LINK_SCHEMES)[number];

/** Schemes that focus a list page on one exact name (`?name=`), with that page's path; also the `::card` schemes. */
export const NAME_FOCUS_PAGES = {
  rw: '/',
  gw: '/gemwords',
  unique: '/uniques',
  mythical: '/mythicals',
  socketable: '/socketables',
} as const satisfies Partial<Record<LinkScheme, string>>;
export type NameFocusScheme = keyof typeof NAME_FOCUS_PAGES;

export function isNameFocusScheme(scheme: string): scheme is NameFocusScheme {
  return Object.hasOwn(NAME_FOCUS_PAGES, scheme);
}
