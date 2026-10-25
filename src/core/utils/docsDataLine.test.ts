import { describe, it, expect } from 'vitest';
import { formatDocsDataLine, formatSiteUpdated } from './docsDataLine';

describe('formatSiteUpdated', () => {
  it('formats an ISO timestamp as a UTC day', () => {
    expect(formatSiteUpdated('2026-10-21T09:49:06.000Z')).toBe('21 Oct 2026');
    // Late UTC evening stays on the UTC date regardless of the viewer's time zone
    expect(formatSiteUpdated('2026-10-21T23:59:00.000Z')).toBe('21 Oct 2026');
  });

  it('returns null for missing or invalid input', () => {
    expect(formatSiteUpdated(undefined)).toBeNull();
    expect(formatSiteUpdated('garbage')).toBeNull();
  });
});

describe('formatDocsDataLine', () => {
  it('includes the site date when known', () => {
    expect(formatDocsDataLine('3.2.24', '2026-10-21T09:49:06.000Z')).toBe('Docs data: ESR 3.2.24 (site updated 21 Oct 2026)');
  });

  it('omits the site date when unknown', () => {
    expect(formatDocsDataLine('3.2.24', undefined)).toBe('Docs data: ESR 3.2.24');
  });

  it('returns null when the version is unknown', () => {
    expect(formatDocsDataLine(undefined, '2026-10-21T09:49:06.000Z')).toBeNull();
  });
});
