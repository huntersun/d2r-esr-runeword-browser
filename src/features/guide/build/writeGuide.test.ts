import { describe, expect, it } from 'vitest';
import { GUIDE_SCHEMA } from '../engine/schema.ts';
import { buildGuideManifest } from './writeGuide.ts';

const base = {
  esrVersion: '3.2.12',
  esrTag: '3.2.12',
  esrCommit: 'abc',
  counts: { notes: 1 },
  warnings: [],
  now: new Date('2026-10-10T00:00:00Z'),
};

describe('buildGuideManifest', () => {
  it('hashes the bundle and keeps generatedAt when nothing changed', () => {
    const first = buildGuideManifest({ ...base, files: { guide: '{}\n' }, previous: null });
    expect(first.schema).toBe(GUIDE_SCHEMA);
    expect(first.files.guide).toEqual({ hash: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown, bytes: 3 });
    expect(first.generatedAt).toBe('2026-10-10T00:00:00.000Z');
    const later = new Date('2026-10-11T00:00:00Z');
    expect(buildGuideManifest({ ...base, files: { guide: '{}\n' }, previous: first, now: later }).generatedAt).toBe(first.generatedAt);
    expect(buildGuideManifest({ ...base, files: { guide: '[]\n' }, previous: first, now: later }).generatedAt).toBe(later.toISOString());
  });
});
