import { describe, expect, it } from 'vitest';
import type { GuideNote } from '../engine/schema.ts';
import { makeNote } from '../engine/testNote.mock.ts';
import { formatGuideReport } from './report.ts';

function note(overrides: Partial<GuideNote>): GuideNote {
  return makeNote({ verified: '3.2.10', ...overrides });
}

describe('formatGuideReport', () => {
  it('groups notes by state with reasons, volatile notes and drafts', () => {
    const lines = formatGuideReport(
      [
        note({ slug: 'a', staleReasons: ["Data in 'X' changed since 3.2.10"], volatility: 'high' }),
        note({ slug: 'b', verified: '3.1.0' }),
        note({
          slug: 'c',
          verified: '3.2.12',
          staleReasons: ['Verified, but the data behind this note was not recorded; it may have changed'],
        }),
        note({ slug: 'd', verified: null, volatility: 'high' }),
      ],
      '3.2.12'
    );
    expect(lines).toEqual([
      'Guide report against ESR 3.2.12: 4 notes',
      '  review 1 · old 1 · fresh 1 · draft 1',
      '',
      'Review (1):',
      '  a (verified 3.2.10)',
      "    - Data in 'X' changed since 3.2.10",
      '',
      'Old (1):',
      '  b (verified 3.1.0)',
      '',
      'Fresh (1):',
      '  c (verified 3.2.12)',
      '    - Verified, but the data behind this note was not recorded; it may have changed',
      '',
      'Volatility high (2): re-check these after every patch',
      '  a [review], d [draft]',
      '',
      'Drafts (1): verify in-game, then npm run guide:verify -- <slug>',
      '  d',
    ]);
  });
});
