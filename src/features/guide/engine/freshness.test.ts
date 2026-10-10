import { describe, expect, it } from 'vitest';
import { compareVersions, noteFreshness } from './freshness';

describe('compareVersions', () => {
  it('compares numerically per segment', () => {
    expect(compareVersions('3.2.12', '3.2.9')).toBeGreaterThan(0);
    expect(compareVersions('3.2.9', '3.2.12')).toBeLessThan(0);
    expect(compareVersions('3.2.12', '3.2.12')).toBe(0);
    expect(compareVersions('3.2.04', '3.2.4')).toBe(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('3.2', '3.2.0')).toBe(0);
    expect(compareVersions('3.3', '3.2.12')).toBeGreaterThan(0);
  });
});

describe('noteFreshness', () => {
  const flagged = ["Data in 'Gheed sells' changed since 3.2.10"];

  it('is draft without a verified version, flagged or not', () => {
    expect(noteFreshness(null, '3.2.12')).toBe('draft');
    expect(noteFreshness('', '3.2.12', flagged)).toBe('draft');
  });

  it('is fresh when verified against the current or a newer version, even when flagged', () => {
    expect(noteFreshness('3.2.12', '3.2.12')).toBe('fresh');
    expect(noteFreshness('3.2.12', '3.2.12', flagged)).toBe('fresh');
    expect(noteFreshness('3.2.13', '3.2.12', flagged)).toBe('fresh');
  });

  it('is fresh for an older patch when nothing was flagged, review when something was', () => {
    expect(noteFreshness('3.2.10', '3.2.12')).toBe('fresh');
    expect(noteFreshness('3.2.10', '3.2.12', [])).toBe('fresh');
    expect(noteFreshness('3.2.10', '3.2.12', flagged)).toBe('review');
  });

  it('is old when major.minor differs, whatever was flagged', () => {
    expect(noteFreshness('3.1.30', '3.2.12')).toBe('old');
    expect(noteFreshness('2.9.1', '3.2.12', flagged)).toBe('old');
    expect(noteFreshness('3.3.0', '3.2.12')).toBe('old');
  });
});
