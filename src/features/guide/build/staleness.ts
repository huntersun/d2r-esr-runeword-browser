/**
 * Why a verified note may need another look: data blocks whose resolved content changed since `guide:verify` recorded
 * them in content/guide/.verify-lock.json, and newer ESR patch notes that mention the note. Pure (fs lives in the CLI
 * and readGuideInputs.ts).
 */
import { sha256 } from '../../game-data/build/writeBundle.ts';
import type { DataBlock, GlossaryEntry, GuideNote } from '../engine/schema.ts';
import { compareVersions } from '../../../core/utils/versionUtils.ts';
import type { BlockHashes, VerifyLock } from './verifyLock.ts';

const MAX_STALE_REASONS = 5;
const NOT_RECORDED = 'Verified, but the data behind this note was not recorded; it may have changed';

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
function blockCaption(block: DataBlock): string {
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
const MIN_TERM_LENGTH = 4;

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
