const AUTH_RETURN_KEY = 'd2r-auth-return-to';

/**
 * Absolute URL Supabase redirects back to after OAuth / magic-link. Points at the
 * app root (respecting Vite's BASE_URL for the GitHub Pages sub-path). The actual
 * in-app destination is restored separately from `takeAuthReturnTo()`.
 */
export function authRedirectTo(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

/** Remembers the in-app location (router path, no basename) to return to after sign-in. */
export function storeAuthReturnTo(pathWithSearch: string): void {
  try {
    sessionStorage.setItem(AUTH_RETURN_KEY, pathWithSearch);
  } catch {
    // sessionStorage unavailable (private mode, etc.) — return-to is best-effort.
  }
}

/**
 * Whether a stored return location is a same-origin app path. It must start with
 * a single `/` (which also rules out any `scheme:` prefix) and must not be
 * protocol-relative (`//host`), a backslash variant (`/\host`), or contain
 * whitespace/control characters (browsers strip tabs/newlines, so `/<tab>/host`
 * would become `//host`).
 */
export function isSafeReturnTo(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020\u007f]/.test(value)) return false;
  return true;
}

/** Reads and clears the stored return location. Returns null when none is set or it is not a safe app path. */
export function takeAuthReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(AUTH_RETURN_KEY);
    if (value === null) return null;
    sessionStorage.removeItem(AUTH_RETURN_KEY);
    return isSafeReturnTo(value) ? value : null;
  } catch {
    return null;
  }
}
