/**
 * Why a verified note may need another look: data blocks whose resolved content changed since `guide:verify` recorded
 * them in content/guide/.verify-lock.json, and newer ESR patch notes that mention the note. Pure (fs lives in the CLI
 * and readGuideInputs.ts).
 */
import { sha256 } from '../../game-data/build/writeBundle.ts';
import type { DataBlock, GlossaryEntry, GuideNote } from '../engine/schema.ts';
import { compareVersions, noteFreshness, type NoteFreshness } from '../engine/freshness.ts';
import { compareCodeUnits } from './compare.ts';
import type { BuildError } from './context.ts';

export const LOCK_FILE = '.verify-lock.json';
export const MAX_STALE_REASONS = 5;
export const NOT_RECORDED = 'Verified, but the data behind this note was not recorded; it may have changed';

/** Block key → sha256 of the resolved DataBlock JSON */
export type BlockHashes = Record<string, string>;

export interface LockEntry {
  verified: string;
  blocks: BlockHashes;
}

/** content/guide/.verify-lock.json: slug → what guide:verify recorded */
export type VerifyLock = Record<string, LockEntry>;

export interface PatchNote {
  /** From the file name, e.g. `3.2.11` */
  version: string;
  text: string;
}

export interface KeyedBlock {
  key: string;
  hash: string;
  caption: string;
}

function suffixed(text: string, seen: Map<string, number>, separator: string): string {
  const count = (seen.get(text) ?? 0) + 1;
  seen.set(text, count);
  return count === 1 ? text : `${text}${separator}#${String(count)}`;
}

/**
 * Keys of repeated directives get a `#2`, `#3` … suffix so every block of a note has its own key; repeated captions get
 * a ` #2` suffix too, so every reason (and the badge's list key) is unique.
 */
export function keyDataBlocks(blocks: readonly { key: string; block: DataBlock }[]): KeyedBlock[] {
  const keys = new Map<string, number>();
  const captions = new Map<string, number>();
  return blocks.map(({ key, block }) => ({
    key: suffixed(key, keys, ''),
    hash: sha256(JSON.stringify(block)),
    caption: suffixed(blockCaption(block), captions, ' '),
  }));
}

export function hashDataBlocks(blocks: readonly { key: string; block: DataBlock }[]): BlockHashes {
  return Object.fromEntries(keyDataBlocks(blocks).map(({ key, hash }) => [key, hash]));
}

/** What the reader sees as the block's title. */
export function blockCaption(block: DataBlock): string {
  switch (block.kind) {
    case 'source':
      return `Where it comes from: ${block.item}`;
    case 'glossary':
      return 'Glossary';
    case 'card':
      return `Card: ${block.name}`;
    default:
      return block.caption;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  if (!isRecord(data)) {
    errors.push(`${where}: expected an object of slug → { verified, blocks }`);
    return {};
  }
  const lock: VerifyLock = {};
  for (const [slug, entry] of Object.entries(data)) {
    const blocks = isRecord(entry) ? entry.blocks : undefined;
    if (!isRecord(entry) || typeof entry.verified !== 'string' || !isRecord(blocks)) {
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

/** Reasons for blocks that changed, appeared or disappeared since the lock entry (in note order, removed last). */
export function compareBlockHashes(current: readonly KeyedBlock[], recorded: BlockHashes, verified: string): string[] {
  const reasons: string[] = [];
  for (const { key, hash, caption } of current) {
    if (recorded[key] !== hash) reasons.push(`Data in '${caption}' changed since ${verified}`);
  }
  const currentKeys = new Set(current.map(({ key }) => key));
  for (const key of Object.keys(recorded)) {
    if (!currentKeys.has(key)) reasons.push(`Data in '${key}' changed since ${verified}`);
  }
  return reasons;
}

/** `3.2.11.md` → `3.2.11`; null for files that are not named after a version. */
export function versionFromPatchNoteFile(file: string): string | null {
  const name = file.split(/[\\/]/).pop() ?? file;
  return /^(\d+(?:\.\d+)+)\.md$/i.exec(name)?.[1] ?? null;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Shorter terms ("Key", "Ore") match too many generic patch-note lines. */
export const MIN_TERM_LENGTH = 4;

/**
 * Case-insensitive whole word: the term may not be glued to a letter, digit or hyphen on either side
 * ("Ore" does not match "Ore-shards" or "Core").
 */
export function mentionsTerm(text: string, term: string): boolean {
  const trimmed = term.trim();
  if (trimmed === '') return false;
  return new RegExp(`(?<![\\p{L}\\p{N}-])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}-])`, 'iu').test(text);
}

/**
 * The note's title and the glossary terms it owns (deduplicated case-insensitively), minus terms shorter than
 * MIN_TERM_LENGTH. Aliases and mentions are deliberately left out: they are broad search words and flagged most notes.
 */
export function noteSearchTerms(note: GuideNote, glossary: readonly GlossaryEntry[]): string[] {
  const terms = [note.title, ...glossary.filter((entry) => entry.note === note.slug).map((entry) => entry.term)];
  const seen = new Set<string>();
  return terms.filter((term) => {
    const key = term.trim().toLowerCase();
    if (key.length < MIN_TERM_LENGTH || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** One reason per (patch note newer than `verified`, term) hit, oldest patch first. */
export function scanPatchNotes(patchNotes: readonly PatchNote[], verified: string, terms: readonly string[]): string[] {
  return [...patchNotes]
    .filter((patch) => compareVersions(patch.version, verified) > 0)
    .sort((a, b) => compareVersions(a.version, b.version))
    .flatMap((patch) =>
      terms.filter((term) => mentionsTerm(patch.text, term)).map((term) => `Patch notes ${patch.version} mention '${term}'`)
    );
}

export function capReasons(reasons: readonly string[], max = MAX_STALE_REASONS): string[] {
  if (reasons.length <= max) return [...reasons];
  return [...reasons.slice(0, max), `… and ${String(reasons.length - max)} more`];
}

export interface StalenessInput {
  note: GuideNote;
  dataBlocks: readonly { key: string; block: DataBlock }[];
  glossary: readonly GlossaryEntry[];
  lock: VerifyLock;
  patchNotes: readonly PatchNote[];
}

/** staleReasons for one note (capped), plus whether its lock entry is missing (the caller warns). */
export function noteStaleReasons(input: StalenessInput): { reasons: string[]; unrecorded: boolean } {
  const { note } = input;
  if (note.verified === null) return { reasons: [], unrecorded: false };
  const verified = note.verified;
  const reasons: string[] = [];
  const entry = Object.hasOwn(input.lock, note.slug) ? input.lock[note.slug] : undefined;
  const unrecorded = entry === undefined || entry.verified !== verified;
  if (unrecorded) {
    reasons.push(NOT_RECORDED);
  } else {
    reasons.push(...compareBlockHashes(keyDataBlocks(input.dataBlocks), entry.blocks, verified));
  }
  reasons.push(...scanPatchNotes(input.patchNotes, verified, noteSearchTerms(note, input.glossary)));
  return { reasons: capReasons([...new Set(reasons)]), unrecorded };
}

// ---------------------------------------------------------------------------
// guide:verify: the in-place frontmatter edit
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// guide:report
// ---------------------------------------------------------------------------

function wrapList(items: readonly string[], indent = '  ', width = 116): string[] {
  const lines: string[] = [];
  let line = '';
  for (const item of items) {
    const next = line === '' ? item : `${line}, ${item}`;
    if (line !== '' && indent.length + next.length > width) {
      lines.push(`${indent}${line},`);
      line = item;
    } else {
      line = next;
    }
  }
  if (line !== '') lines.push(`${indent}${line}`);
  return lines;
}

const STATE_HEADINGS: Record<NoteFreshness, string> = { review: 'Review', old: 'Old', fresh: 'Fresh', draft: 'Drafts' };

/** Plain-text maintainer report: notes by freshness state with their reasons, volatile notes, drafts. */
export function formatGuideReport(notes: readonly GuideNote[], current: string): string[] {
  const states = notes.map((note) => ({ note, state: noteFreshness(note.verified, current, note.staleReasons) }));
  const count = (state: NoteFreshness) => states.filter((entry) => entry.state === state).length;
  const lines = [
    `Guide report against ESR ${current}: ${String(notes.length)} notes`,
    `  review ${String(count('review'))} · old ${String(count('old'))} · fresh ${String(count('fresh'))} · draft ${String(count('draft'))}`,
  ];
  for (const state of ['review', 'old', 'fresh'] as const) {
    const group = states.filter((entry) => entry.state === state);
    if (group.length === 0) continue;
    lines.push('', `${STATE_HEADINGS[state]} (${String(group.length)}):`);
    for (const { note } of group) {
      lines.push(`  ${note.slug} (verified ${note.verified ?? ''})`);
      for (const reason of note.staleReasons) lines.push(`    - ${reason}`);
    }
  }
  const volatile = states.filter((entry) => entry.note.volatility === 'high');
  lines.push('', `Volatility high (${String(volatile.length)}): re-check these after every patch`);
  lines.push(...wrapList(volatile.map(({ note, state }) => `${note.slug} [${state}]`)));
  const drafts = states.filter((entry) => entry.state === 'draft');
  lines.push('', `Drafts (${String(drafts.length)}): verify in-game, then npm run guide:verify -- <slug>`);
  lines.push(...wrapList(drafts.map(({ note }) => note.slug)));
  return lines;
}
