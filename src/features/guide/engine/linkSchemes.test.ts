import { describe, expect, it } from 'vitest';
import { DROP_FINDER_URL, LINK_SCHEMES, NAME_FOCUS_PAGES, isNameFocusScheme } from './linkSchemes.ts';

describe('LINK_SCHEMES', () => {
  it('lists each scheme once, as a bare lowercase word', () => {
    expect(new Set(LINK_SCHEMES).size).toBe(LINK_SCHEMES.length);
    for (const scheme of LINK_SCHEMES) expect(scheme).toMatch(/^[a-z]+$/);
  });

  it('includes dropfinder, which is not a name-focus (app) scheme', () => {
    expect(LINK_SCHEMES).toContain('dropfinder');
    expect(isNameFocusScheme('dropfinder')).toBe(false);
  });

  it('has every name-focus scheme in LINK_SCHEMES', () => {
    for (const scheme of Object.keys(NAME_FOCUS_PAGES)) {
      expect(LINK_SCHEMES).toContain(scheme);
      expect(isNameFocusScheme(scheme)).toBe(true);
    }
  });

  it('points the Drop Finder at the plain official page (no deep link)', () => {
    expect(DROP_FINDER_URL).toBe('https://easternsunresurrected.com/drop-finder.html');
  });
});
