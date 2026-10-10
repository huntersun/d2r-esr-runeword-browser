/**
 * Pure helpers for the guide screens (no React, no DOM), unit-tested in guideUtils.test.ts.
 */
import { parseSearchTerms } from '@/core/utils/searchTerms';
import type { SourceLabel } from '@/features/game-data/engine/schema';
import type { GuideBlock, GuideInline, GuideNote } from '../engine/schema';

interface AppLink {
  /** App path incl. query, without the base URL */
  readonly href: string;
  /** Plain text of the first link that pointed there */
  readonly label: string;
}

/** Plain text of an inline tree (labels, aria text). */
export function inlineText(nodes: readonly GuideInline[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
        case 'code':
          return node.value;
        case 'break':
          return ' ';
        case 'strong':
        case 'emphasis':
        case 'link':
        case 'term':
          return inlineText(node.children);
      }
    })
    .join('');
}

function collectFromInlines(nodes: readonly GuideInline[], out: AppLink[]): void {
  for (const node of nodes) {
    if (node.type === 'link' && node.kind === 'app') out.push({ href: node.href, label: inlineText(node.children).trim() });
    if (node.type === 'strong' || node.type === 'emphasis' || node.type === 'link' || node.type === 'term') {
      collectFromInlines(node.children, out);
    }
  }
}

function collectFromBlocks(blocks: readonly GuideBlock[], out: AppLink[]): void {
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
      case 'heading':
        collectFromInlines(block.children, out);
        break;
      case 'list':
        for (const item of block.items) collectFromBlocks(item, out);
        break;
      case 'blockquote':
        collectFromBlocks(block.children, out);
        break;
      case 'table':
        for (const cell of block.header) collectFromInlines(cell, out);
        for (const row of block.rows) for (const cell of row) collectFromInlines(cell, out);
        break;
      case 'thematicBreak':
      case 'codeBlock':
      case 'data':
        break;
    }
  }
}

/** App links (kind 'app') of a note body in document order, deduplicated by href, at most `limit`. */
export function collectAppLinks(body: readonly GuideBlock[], limit = 4): AppLink[] {
  const all: AppLink[] = [];
  collectFromBlocks(body, all);
  const seen = new Set<string>();
  const result: AppLink[] = [];
  for (const link of all) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    result.push(link);
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * Notes matching every search term (parseSearchTerms: words, or "quoted phrases") in the title, aliases or summary,
 * case-insensitive. Title matches come first; otherwise the input order is kept. An empty query returns all notes.
 */
export function searchNotes(notes: readonly GuideNote[], query: string): GuideNote[] {
  const terms = parseSearchTerms(query);
  if (terms.length === 0) return [...notes];
  const titleHits: GuideNote[] = [];
  const otherHits: GuideNote[] = [];
  for (const note of notes) {
    const haystack = [note.title, ...note.aliases, note.summary].join('\n').toLowerCase();
    if (!terms.every((term) => haystack.includes(term))) continue;
    const title = note.title.toLowerCase();
    if (terms.every((term) => title.includes(term))) titleHits.push(note);
    else otherHits.push(note);
  }
  return [...titleHits, ...otherHits];
}

type SourceCellKey = 'drop' | 'cube' | 'buy' | 'gamble';

interface SourceCell {
  readonly key: SourceCellKey;
  readonly title: string;
  readonly labels: string[];
}

const SOURCE_CELLS: readonly { key: SourceCellKey; title: string }[] = [
  { key: 'drop', title: 'Drop' },
  { key: 'cube', title: 'Cube' },
  { key: 'buy', title: 'Buy' },
  { key: 'gamble', title: 'Gamble' },
];

function cellKey(kind: SourceLabel['kind']): SourceCellKey | null {
  switch (kind) {
    case 'drop':
    case 'boss':
    case 'maps':
    case 'plugin':
      return 'drop';
    case 'cube':
    case 'buy':
    case 'gamble':
      return kind;
    case 'unknown':
      return null;
  }
}

/** Groups source labels into the four "Where it comes from" cells (always all four, in a fixed order). */
export function sourceCells(labels: readonly SourceLabel[]): SourceCell[] {
  return SOURCE_CELLS.map(({ key, title }) => ({
    key,
    title,
    labels: [...new Set(labels.filter((label) => cellKey(label.kind) === key).map((label) => label.text))],
  }));
}
