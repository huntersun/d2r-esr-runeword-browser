import { describe, expect, it } from 'vitest';
import { runewordsRedirectTarget } from './homeRedirect';

describe('runewordsRedirectTarget', () => {
  it('keeps a bare / on the home page', () => {
    expect(runewordsRedirectTarget('')).toBeNull();
    expect(runewordsRedirectTarget('?')).toBeNull();
    expect(runewordsRedirectTarget('', '#top')).toBeNull();
  });

  it('sends any query to /runewords unchanged', () => {
    expect(runewordsRedirectTarget('?name=Enigma')).toBe('/runewords?name=Enigma');
    expect(runewordsRedirectTarget('?search=x&sockets=4')).toBe('/runewords?search=x&sockets=4');
    expect(runewordsRedirectTarget('?search=%22Call%20to%20Arms%22')).toBe('/runewords?search=%22Call%20to%20Arms%22');
    expect(runewordsRedirectTarget('?utm_source=x')).toBe('/runewords?utm_source=x');
  });

  it('keeps the hash and accepts a search without the leading ?', () => {
    expect(runewordsRedirectTarget('?name=Enigma', '#card')).toBe('/runewords?name=Enigma#card');
    expect(runewordsRedirectTarget('name=Enigma')).toBe('/runewords?name=Enigma');
  });
});
