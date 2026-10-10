import { describe, expect, it } from 'vitest';
import { parseVerifyLock, serializeVerifyLock, setVerifiedInFrontmatter } from './verifyLock.ts';

describe('lock file', () => {
  it('round-trips sorted and parses a missing file as empty', () => {
    const errors: string[] = [];
    const text = serializeVerifyLock({ b: { verified: '3.2.12', blocks: { z: '1', a: '2' } }, a: { verified: '3.2.11', blocks: {} } });
    expect(text).toBe(
      '{\n  "a": {\n    "verified": "3.2.11",\n    "blocks": {}\n  },\n  "b": {\n    "verified": "3.2.12",\n    "blocks": {\n      "a": "2",\n      "z": "1"\n    }\n  }\n}\n'
    );
    expect(parseVerifyLock(text, 'lock', errors)).toEqual({
      a: { verified: '3.2.11', blocks: {} },
      b: { verified: '3.2.12', blocks: { a: '2', z: '1' } },
    });
    expect(parseVerifyLock(null, 'lock', errors)).toEqual({});
    expect(errors).toEqual([]);
  });

  it('reports malformed entries', () => {
    const errors: string[] = [];
    expect(parseVerifyLock('{"a": {"verified": 3}}', 'lock', errors)).toEqual({});
    expect(errors).toEqual(['lock: "a" must be { verified: string, blocks: { key: hash } }']);
  });
});

describe('setVerifiedInFrontmatter', () => {
  it('replaces the verified line and keeps every other byte', () => {
    const text = '---\ntitle: Forging # the title\nverified: 3.2.10 # old\nvolatility: high\n---\nBody\n\n---\nverified: body\n';
    expect(setVerifiedInFrontmatter(text, '3.2.12')).toBe(
      "---\ntitle: Forging # the title\nverified: '3.2.12' # old\nvolatility: high\n---\nBody\n\n---\nverified: body\n"
    );
  });

  it('keeps a trailing comment and accepts a space before the colon', () => {
    expect(setVerifiedInFrontmatter("---\nverified: '3.2.10' # checked on a sorc\ntitle: A\n---\n", '3.2.12')).toBe(
      "---\nverified: '3.2.12' # checked on a sorc\ntitle: A\n---\n"
    );
    expect(setVerifiedInFrontmatter('---\nverified : 3.2.10\r\ntitle: A\n---\n', '3.2.12')).toBe(
      "---\nverified: '3.2.12'\r\ntitle: A\n---\n"
    );
    expect(setVerifiedInFrontmatter('---\nverified :\n---\n', '3.2.12')).toBe("---\nverified: '3.2.12'\n---\n");
  });

  it('adds the field before the closing fence when missing', () => {
    expect(setVerifiedInFrontmatter('---\ntitle: A\n---\nBody', '3.2.12')).toBe("---\ntitle: A\nverified: '3.2.12'\n---\nBody");
    expect(setVerifiedInFrontmatter('---\n---\n', '3.2.12')).toBe("---\nverified: '3.2.12'\n---\n");
  });

  it('keeps CRLF line endings and a BOM', () => {
    expect(setVerifiedInFrontmatter('﻿---\r\ntitle: A\r\n---\r\nBody\r\n', '3.2.12')).toBe(
      "﻿---\r\ntitle: A\r\nverified: '3.2.12'\r\n---\r\nBody\r\n"
    );
    expect(setVerifiedInFrontmatter("---\r\nverified: '3.2.1'\r\n---\r\n", '3.2.12')).toBe("---\r\nverified: '3.2.12'\r\n---\r\n");
  });

  it('fails without frontmatter', () => {
    expect(setVerifiedInFrontmatter('Body', '3.2.12')).toEqual({ error: 'missing frontmatter (the file must start with a --- block)' });
    expect(setVerifiedInFrontmatter('---\ntitle: A\n', '3.2.12')).toEqual({ error: 'frontmatter is not closed with ---' });
  });
});
