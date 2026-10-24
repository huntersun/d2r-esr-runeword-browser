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
  'dropfinder',
] as const;
export type LinkScheme = (typeof LINK_SCHEMES)[number];

/** The official ESR site; `docs:` links resolve against it. */
export const OFFICIAL_SITE = 'https://easternsunresurrected.com/';

/** URL of an official docs page (`docs:<file>#<anchor>`): the file name and anchor are percent-encoded (they may hold spaces). */
export function officialDocsUrl(file: string, anchor = ''): string {
  return `${OFFICIAL_SITE}${encodeURIComponent(file)}${anchor === '' ? '' : `#${encodeURIComponent(anchor)}`}`;
}

/**
 * The official Drop Finder: the target of `dropfinder:` links and of the link under every "Where it comes from" block.
 * Never a deep link: its `#i=…` hash is a positional index into its data file that changes with every ESR release.
 */
export const DROP_FINDER_URL = `${OFFICIAL_SITE}drop-finder.html`;

/** Schemes that focus a list page on one exact name (`?name=`), with that page's path; also the `::card` schemes. */
export const NAME_FOCUS_PAGES = {
  rw: '/runewords',
  gw: '/gemwords',
  unique: '/uniques',
  mythical: '/mythicals',
  socketable: '/socketables',
} as const satisfies Partial<Record<LinkScheme, string>>;
export type NameFocusScheme = keyof typeof NAME_FOCUS_PAGES;

export function isNameFocusScheme(scheme: string): scheme is NameFocusScheme {
  return Object.hasOwn(NAME_FOCUS_PAGES, scheme);
}
