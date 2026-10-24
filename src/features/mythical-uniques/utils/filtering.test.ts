import { describe, expect, it } from 'vitest';
import { matchesMaxReqLevel } from './filtering';

describe('mythicals matchesMaxReqLevel', () => {
  it('shows everything when no cap is set', () => {
    expect(matchesMaxReqLevel({ reqLevel: 90 }, null)).toBe(true);
  });

  it('keeps items at or below the cap and hides items above it', () => {
    expect(matchesMaxReqLevel({ reqLevel: 60 }, 60)).toBe(true);
    expect(matchesMaxReqLevel({ reqLevel: 90 }, 89)).toBe(false);
  });

  it('always shows items without a parsed required level (reqLevel 0)', () => {
    expect(matchesMaxReqLevel({ reqLevel: 0 }, 1)).toBe(true);
  });
});
