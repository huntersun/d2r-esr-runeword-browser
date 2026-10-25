/**
 * "21 Oct 2026" for an ISO timestamp (UTC, so the date matches the server's Last-Modified header);
 * null when missing or unparsable.
 */
export function formatSiteUpdated(isoString: string | undefined): string | null {
  if (isoString === undefined) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * "Docs data: ESR 3.2.24 (site updated 21 Oct 2026)". Null when the docs version is unknown,
 * so callers can omit the line instead of printing a placeholder.
 */
export function formatDocsDataLine(version: string | undefined, lastModified: string | undefined): string | null {
  if (version === undefined) return null;
  const updated = formatSiteUpdated(lastModified);
  return updated === null ? `Docs data: ESR ${version}` : `Docs data: ESR ${version} (site updated ${updated})`;
}
