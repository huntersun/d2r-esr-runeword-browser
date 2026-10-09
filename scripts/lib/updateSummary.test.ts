import { describe, it, expect } from 'vitest';
import { diffCounts, formatChange, formatSummary, parsePorcelain, shortCommit } from './updateSummary.ts';

describe('updateSummary', () => {
  it('formats changes', () => {
    expect(formatChange('3.2.10', '3.2.11')).toBe('3.2.10 → 3.2.11');
    expect(formatChange('3.2.10', '3.2.10')).toBe('3.2.10 (unchanged)');
    expect(shortCommit('10b540e9614d')).toBe('10b540e');
    expect(shortCommit(null)).toBe('(none)');
  });

  it('lists only changed counts with signed deltas', () => {
    expect(diffCounts({ bases: 653, types: 188, gone: 1 }, { bases: 660, types: 188, runewords: 2 })).toEqual([
      'bases: 653 → 660 (+7)',
      'gone: 1 → (removed)',
      'runewords: (new) 2',
    ]);
    expect(diffCounts({ affixes: 10 }, { affixes: 8 })).toEqual(['affixes: 10 → 8 (-2)']);
  });

  it('parses porcelain output', () => {
    expect(parsePorcelain(' M public/game-data/bases.json\n?? public/game-data/new.json\n')).toEqual([
      'public/game-data/bases.json',
      'public/game-data/new.json',
    ]);
  });

  it('formats the summary', () => {
    const before = { esrVersion: '3.2.10', esrTag: '3.2.10', esrCommit: 'aaaaaaaaa', counts: { bases: 1 }, warnings: [] };
    const after = { esrVersion: '3.2.11', esrTag: null, esrCommit: 'bbbbbbbbb', counts: { bases: 2 }, warnings: ['w1'] };
    const lines = formatSummary({
      before,
      after,
      steps: [
        { name: 'generate', ok: true },
        { name: 'tests', ok: false },
      ],
      changedFiles: [],
    });
    expect(lines).toEqual([
      'ESR version: 3.2.10 → 3.2.11',
      'ESR tag:     3.2.10 → (none)',
      'ESR commit:  aaaaaaa → bbbbbbb',
      '',
      'Changed counts:',
      '  bases: 1 → 2 (+1)',
      '  warnings: 0 → 1 (+1)',
      '',
      'Generator warnings (1):',
      '  - w1',
      '',
      'Steps:',
      '  OK   generate',
      '  FAIL tests',
      '',
      'Changed files: none (public/game-data is up to date)',
    ]);
  });
});
