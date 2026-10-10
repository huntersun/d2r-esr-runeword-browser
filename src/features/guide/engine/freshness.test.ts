import { describe, expect, it } from 'vitest';
import { compareVersions, noteFreshness } from './freshness';

describe('compareVersions', () => {
  it('compares numerically per segment', () => {
    expect(compareVersions('3.2.12', '3.2.9')).toBeGreaterThan(0);
    expect(compareVersions('3.2.9', '3.2.12')).toBeLessThan(0);
    expect(compareVersions('3.2.12', '3.2.12')).toBe(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('3.2', '3.2.0')).toBe(0);
    expect(compareVersions('3.3', '3.2.12')).toBeGreaterThan(0);
  });
});

describe('noteFreshness', () => {
  it('is draft without a verified version', () => {
    expect(noteFreshness(null, '3.2.12')).toBe('draft');
    expect(noteFreshness('', '3.2.12')).toBe('draft');
  });

  it('is fresh when verified against the current or a newer version', () => {
    expect(noteFreshness('3.2.12', '3.2.12')).toBe('fresh');
    expect(noteFreshness('3.2.13', '3.2.12')).toBe('fresh');
  });

  it('is outdated within the same major.minor and old otherwise', () => {
    expect(noteFreshness('3.2.10', '3.2.12')).toBe('outdated');
    expect(noteFreshness('3.1.30', '3.2.12')).toBe('old');
    expect(noteFreshness('2.9.1', '3.2.12')).toBe('old');
  });
});
