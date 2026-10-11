import { describe, expect, it } from 'vitest';
import { slugify } from './download';

describe('slugify', () => {
  it('lower-cases, drops accents and joins words with dashes', () => {
    expect(slugify('  Crème Brûlée / Fury!! ', 'x')).toBe('creme-brulee-fury');
  });

  it('falls back when nothing is left', () => {
    expect(slugify('✨🔥✨', 'build')).toBe('build');
  });
});
