/** Path of the runewords browser, which was the home page (`/`) until the home screen took that path. */
export const RUNEWORDS_PATH = '/runewords';

/**
 * Where a visit to `/` goes: `/` with any query string is an old runewords link (Copy Link URLs, guide `?name=` deep
 * links), so it redirects to `/runewords` with the same query and hash; a bare `/` (an empty `?` included) stays on the
 * home page (null). `search` and `hash` are `location.search` / `location.hash`.
 */
export function runewordsRedirectTarget(search: string, hash = ''): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (query === '') return null;
  return `${RUNEWORDS_PATH}?${query}${hash}`;
}
