/**
 * content/guide/.verify-lock.json (what `guide:verify` recorded per note) and the in-place `verified:` frontmatter edit.
 * Pure (fs lives in the CLI and readGuideInputs.ts).
 */
import { compareCodeUnits } from './compare.ts';
import type { BuildError } from './context.ts';
import { isObject } from './fields.ts';

export const LOCK_FILE = '.verify-lock.json';

/** Block key → sha256 of the resolved DataBlock JSON */
export type BlockHashes = Record<string, string>;

export interface LockEntry {
  verified: string;
  blocks: BlockHashes;
}

/** content/guide/.verify-lock.json: slug → what guide:verify recorded */
export type VerifyLock = Record<string, LockEntry>;

/** Parses the lock file; a missing file (null) is an empty lock. */
export function parseVerifyLock(text: string | null, where: string, errors: string[]): VerifyLock {
  if (text === null || text.trim() === '') return {};
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    errors.push(`${where}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return {};
  }
  if (!isObject(data)) {
    errors.push(`${where}: expected an object of slug → { verified, blocks }`);
    return {};
  }
  const lock: VerifyLock = {};
  for (const [slug, entry] of Object.entries(data)) {
    const blocks = isObject(entry) ? entry.blocks : undefined;
    if (!isObject(entry) || typeof entry.verified !== 'string' || !isObject(blocks)) {
      errors.push(`${where}: "${slug}" must be { verified: string, blocks: { key: hash } }`);
      continue;
    }
    const hashes: BlockHashes = {};
    for (const [key, hash] of Object.entries(blocks)) {
      if (typeof hash === 'string') hashes[key] = hash;
      else errors.push(`${where}: "${slug}".blocks["${key}"] must be a string`);
    }
    lock[slug] = { verified: entry.verified, blocks: hashes };
  }
  return lock;
}

/** Stable output: slugs and block keys sorted, two-space JSON, trailing newline (Prettier leaves it alone). */
export function serializeVerifyLock(lock: VerifyLock): string {
  const sorted: VerifyLock = {};
  for (const [slug, entry] of Object.entries(lock).sort(([a], [b]) => compareCodeUnits(a, b))) {
    const blocks: BlockHashes = {};
    for (const [key, hash] of Object.entries(entry.blocks).sort(([a], [b]) => compareCodeUnits(a, b))) blocks[key] = hash;
    sorted[slug] = { verified: entry.verified, blocks };
  }
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

/**
 * Sets `verified: '<version>'` in the note's frontmatter: replaces the existing `verified:` (or `verified :`) value,
 * keeping a trailing `# comment`, or adds the line before the closing `---`. Every other byte (BOM, line endings,
 * comments, the body) is kept.
 */
export function setVerifiedInFrontmatter(text: string, version: string): string | BuildError {
  const open = /^(\uFEFF?)---[ \t]*(\r?\n)/.exec(text);
  if (open === null) return { error: 'missing frontmatter (the file must start with a --- block)' };
  const eol = open[2];
  const start = open[0].length;
  const close = /^---[ \t]*(?:\r?\n|$)/m.exec(text.slice(start));
  if (close === null) return { error: 'frontmatter is not closed with ---' };
  const yamlEnd = start + close.index;
  const yaml = text.slice(start, yamlEnd);
  const line = `verified: '${version}'`;
  const existing = /^verified[ \t]*:[^\r\n]*/m;
  const updated = existing.test(yaml)
    ? // keep a trailing `# comment` (a # after whitespace; versions never contain one)
      yaml.replace(existing, (old) => `${line}${/[ \t]+#.*$/.exec(old)?.[0] ?? ''}`)
    : `${yaml}${line}${eol}`;
  return text.slice(0, start) + updated + text.slice(yamlEnd);
}
