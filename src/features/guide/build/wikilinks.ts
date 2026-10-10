/**
 * `[[slug]]` / `[[slug|label]]` note links inside a text node. Runs on mdast text nodes only, so code spans
 * (inlineCode nodes) are never touched. In GFM tables the pipe must be escaped (`[[slug\|label]]`); the parser
 * removes the backslash before the text reaches this function.
 */
import type { GuideInline } from '../engine/schema.ts';

const WIKILINK = /\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g;

export interface WikilinkMatch {
  slug: string;
  /** null = use the target note's title (filled in by the generator) */
  label: string | null;
}

/** Splits text into text and note-link inlines. A note link without a label has no children yet. */
export function splitWikilinks(value: string): { inlines: GuideInline[]; links: WikilinkMatch[] } {
  const inlines: GuideInline[] = [];
  const links: WikilinkMatch[] = [];
  let last = 0;
  for (const match of value.matchAll(WIKILINK)) {
    const rawLabel = match.at(2);
    const slug = match[1].trim();
    const label = rawLabel === undefined ? null : rawLabel.trim();
    if (match.index > last) inlines.push({ type: 'text', value: value.slice(last, match.index) });
    inlines.push({ type: 'link', kind: 'note', href: slug, children: label === null ? [] : [{ type: 'text', value: label }] });
    links.push({ slug, label });
    last = match.index + match[0].length;
  }
  if (last < value.length) inlines.push({ type: 'text', value: value.slice(last) });
  return { inlines, links };
}
