import { afterEach, describe, expect, it } from 'vitest';
import { isSafeReturnTo, storeAuthReturnTo, takeAuthReturnTo } from './redirect';

describe('isSafeReturnTo', () => {
  it.each(['/', '/runewords', '/builds/abc?tab=gear#top', '/runewords?search=a%20b'])('accepts app path %s', (value) => {
    expect(isSafeReturnTo(value)).toBe(true);
  });

  it.each([
    '',
    'runewords',
    'https://evil.example',
    'javascript:alert(1)',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    ' /runewords',
  ])('rejects %j', (value) => {
    expect(isSafeReturnTo(value)).toBe(false);
  });
});

describe('takeAuthReturnTo', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(takeAuthReturnTo()).toBeNull();
  });

  it('returns and clears a safe stored path', () => {
    storeAuthReturnTo('/builds?mine=1');
    expect(takeAuthReturnTo()).toBe('/builds?mine=1');
    expect(takeAuthReturnTo()).toBeNull();
  });

  it('returns null for an unsafe stored value and still clears it', () => {
    storeAuthReturnTo('//evil.example');
    expect(takeAuthReturnTo()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});
