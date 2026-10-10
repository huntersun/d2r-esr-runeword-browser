/**
 * Resolves the link schemes of the guide's markdown (see docs/features/GUIDE.md) into `{ kind, href }`.
 * App hrefs are app paths without the base URL; `docs:` becomes an absolute URL of the official site.
 */
import type { LinkKind } from '../engine/schema.ts';
import type { BuildError, GuideContext } from './context.ts';

export const OFFICIAL_SITE = 'https://easternsunresurrected.com/';

export interface ResolvedLink {
  kind: LinkKind;
  href: string;
  /** Non-fatal problem (docs file or anchor not found) */
  warning?: string;
}

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function search(path: string, name: string): string {
  return `${path}?search=${encodeURIComponent(`"${name}"`)}`;
}

/** Exact-name focus of a list page: shows only the items named exactly `name` (case-insensitive), not affix matches. */
function exactName(path: string, name: string): string {
  return `${path}?name=${encodeURIComponent(name)}`;
}

/** App routes a `page:` link may point at (path only; a query string is allowed). */
export const APP_PAGES: readonly string[] = [
  '/',
  '/gemwords',
  '/socketables',
  '/uniques',
  '/mythicals',
  '/ascendancies',
  '/game-data/bases',
  '/game-data/best-base',
  '/game-data/affixes',
  '/game-data/types',
  '/guide',
];

const NAME_FOCUS_PAGES: Record<string, string> = {
  gw: '/gemwords',
  unique: '/uniques',
  mythical: '/mythicals',
  socketable: '/socketables',
};

/** `docs:<file>#<anchor>` → official site URL, plus a warning when the clone's docs/ folder lacks the file or anchor. */
export function resolveDocsLink(target: string, ctx: Pick<GuideContext, 'docs'>): ResolvedLink | BuildError {
  const hashAt = target.indexOf('#');
  const file = hashAt === -1 ? target : target.slice(0, hashAt);
  const anchor = hashAt === -1 ? '' : target.slice(hashAt + 1);
  if (file === '') return { error: `docs: link "${target}" has no file name` };
  const href = `${OFFICIAL_SITE}${encodeURIComponent(file)}${anchor === '' ? '' : `#${encodeURIComponent(anchor)}`}`;
  let warning: string | undefined;
  if (ctx.docs !== null) {
    const anchors = ctx.docs.get(file);
    if (anchors === undefined) warning = `docs: file "${file}" not found in the ESR clone's docs/`;
    else if (anchor !== '' && !anchors.has(anchor)) warning = `docs: anchor "#${anchor}" not found in "${file}"`;
  }
  return warning === undefined ? { kind: 'external', href } : { kind: 'external', href, warning };
}

/** Resolves a markdown link URL (as parsed by mdast, i.e. possibly percent-encoded). */
export function resolveLink(url: string, ctx: GuideContext): ResolvedLink | BuildError {
  if (/^https?:\/\//i.test(url)) return { kind: 'external', href: url };
  const colon = url.indexOf(':');
  if (colon === -1) return { error: `link "${url}" has no scheme (use [[slug]] for notes, page:/path for app pages)` };
  const scheme = url.slice(0, colon);
  const target = decode(url.slice(colon + 1)).trim();
  if (target === '') return { error: `link "${url}" has an empty target` };

  switch (scheme) {
    case 'rw':
      if (!ctx.runewordNames.has(target)) return { error: `unknown runeword "${target}" (rw:)` };
      return { kind: 'app', href: exactName('/', target) };
    case 'gw':
    case 'unique':
    case 'mythical':
    case 'socketable':
      return { kind: 'app', href: exactName(NAME_FOCUS_PAGES[scheme] ?? '/', target) };
    case 'base': {
      const name = ctx.baseNames.get(target);
      if (name === undefined) return { error: `unknown base code "${target}" (base:)` };
      return { kind: 'app', href: search('/game-data/bases', name) };
    }
    case 'type':
      if (!ctx.typeCodes.has(target)) return { error: `unknown item type code "${target}" (type:)` };
      return { kind: 'app', href: `/game-data/types?type=${encodeURIComponent(target)}` };
    case 'bestbase':
      return { kind: 'app', href: `/game-data/best-base?rw=${encodeURIComponent(target)}` };
    case 'affixes':
      return { kind: 'app', href: `/game-data/affixes?${target}` };
    case 'page':
      if (!APP_PAGES.includes(target.split(/[?#]/)[0] ?? '')) {
        return { error: `page: link "${target}" is not an app page (known: ${APP_PAGES.join(', ')})` };
      }
      return { kind: 'app', href: target };
    case 'docs':
      return resolveDocsLink(target, ctx);
    default:
      return { error: `unknown link scheme "${scheme}:" in "${url}"` };
  }
}
