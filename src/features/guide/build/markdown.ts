/**
 * Markdown body → GuideBlock[] (the small, fully resolved tree of engine/schema.ts).
 *
 * GFM tables/lists, `###`/`####` headings, `[[slug]]` note links, link schemes (links.ts), `:term[...]` and leaf
 * directives (`::name[arg]`). HTML comments are dropped; other raw HTML, images, `#`/`##` headings and any other
 * node type are errors.
 */
import type { BlockContent, DefinitionContent, Nodes, PhrasingContent, RootContent } from 'mdast';
import type { LeafDirective, TextDirective } from 'mdast-util-directive';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { directive } from 'micromark-extension-directive';
import { gfm } from 'micromark-extension-gfm';
import type { DataBlock, GuideBlock, GuideInline } from '../engine/schema.ts';
import type { GuideContext } from './context.ts';
import { compareCodeUnits } from './compare.ts';
import { LEAF_DIRECTIVES, resolveTerm } from './directives/index.ts';
import { resolveLink } from './links.ts';
import { splitWikilinks } from './wikilinks.ts';

export interface MarkdownResult {
  blocks: GuideBlock[];
  /** Slugs of `[[slug]]` links, in order of appearance (with duplicates) */
  noteLinks: string[];
  /** Resolved data blocks in order of appearance, keyed by their directive source (see directiveKey) */
  dataBlocks: { key: string; block: DataBlock }[];
  errors: string[];
  warnings: string[];
}

const HTML_COMMENT = /^<!--[\s\S]*-->$/;
/** A `[label](scheme:…)` the parser did not turn into a link (usually a space in the target) */
const BROKEN_LINK = /\]\((?:rw|gw|unique|mythical|socketable|base|type|bestbase|affixes|page|docs):/;
/** `[[slug|label]]` inside a GFM table row: the pipe would split the cell */
const TABLE_WIKILINK_PIPE = /(\[\[[^[\]|]+)(?<!\\)\|(?=[^[\]]*\]\])/g;

interface State {
  ctx: GuideContext;
  /** Prefix of every message, e.g. `notes/forging.md` */
  file: string;
  /** Lines before the body (frontmatter) so messages point at the file line */
  lineOffset: number;
  result: MarkdownResult;
}

function at(state: State, node: Nodes): string {
  const line = node.position?.start.line;
  return line === undefined ? state.file : `${state.file}:${String(line + state.lineOffset)}`;
}

function fail(state: State, node: Nodes, message: string): void {
  state.result.errors.push(`${at(state, node)}: ${message}`);
}

/** Plain text of a node's descendants. */
function plainText(node: Nodes): string {
  if ('value' in node) return node.value;
  if ('children' in node) return (node.children as Nodes[]).map(plainText).join('');
  return '';
}

/**
 * The source text of a directive argument: the parser reads `rw:Enigma` in `::card[rw:Enigma]` as "rw" plus a text
 * directive `:Enigma`, which is put back together here.
 */
function argumentText(node: Nodes): string {
  if (node.type === 'textDirective')
    return `:${node.name}${node.children.length === 0 ? '' : `[${node.children.map(argumentText).join('')}]`}`;
  if ('value' in node) return node.value;
  if ('children' in node) return (node.children as Nodes[]).map(argumentText).join('');
  return '';
}

function isComment(value: string): boolean {
  return HTML_COMMENT.test(value.trim());
}

/** Text that still looks like a link after parsing means the markdown was malformed. */
function checkLeftovers(value: string, node: Nodes, state: State): void {
  if (value.includes('[[')) {
    fail(
      state,
      node,
      `unresolved "[[" in "${value.trim()}" (note links are [[slug]] or [[slug|plain label]]; labels cannot contain formatting)`
    );
  }
  if (BROKEN_LINK.test(value)) {
    fail(state, node, `link not recognised in "${value.trim()}" (a target with spaces must be wrapped in <…> or use %20)`);
  }
}

/** Escapes the pipe of `[[slug|label]]` in table rows so GFM keeps the cell together. */
export function escapeTableWikilinks(markdown: string): string {
  return markdown
    .split('\n')
    .map((line) => (/^\s*\|/.test(line) ? line.replace(TABLE_WIKILINK_PIPE, '$1\\|') : line))
    .join('\n');
}

function mergeText(inlines: GuideInline[]): GuideInline[] {
  const merged: GuideInline[] = [];
  for (const inline of inlines) {
    const previous = merged.at(-1);
    if (inline.type === 'text' && previous?.type === 'text')
      merged[merged.length - 1] = { type: 'text', value: previous.value + inline.value };
    else if (inline.type !== 'text' || inline.value !== '') merged.push(inline);
  }
  return merged;
}

function convertTextDirective(node: TextDirective, state: State): GuideInline[] {
  const label = plainText(node);
  if (node.name === 'term') {
    const attributes = node.attributes ?? {};
    const term = resolveTerm(label, attributes.label ?? null, state.ctx);
    if ('error' in term) {
      fail(state, node, term.error);
      return [{ type: 'text', value: label }];
    }
    return [term];
  }
  if (node.name in LEAF_DIRECTIVES) {
    fail(state, node, `::${node.name} is a block directive and must stand alone on its own line`);
    return [];
  }
  // Not a directive the guide knows: the author wrote prose like "ratio 1:3" or "Note:this"; keep it as text.
  if (node.attributes !== undefined && node.attributes !== null && Object.keys(node.attributes).length > 0) {
    fail(state, node, `unknown inline directive ":${node.name}" (only :term[...] is supported)`);
  }
  return [{ type: 'text', value: `:${node.name}${node.children.length > 0 ? `[${label}]` : ''}` }];
}

function convertInline(node: PhrasingContent, state: State): GuideInline[] {
  switch (node.type) {
    case 'text': {
      for (const match of node.value.matchAll(/::([a-z-]+)/g)) {
        if (match[1] in LEAF_DIRECTIVES) fail(state, node, `::${match[1]} is a block directive and must stand alone on its own line`);
      }
      const { inlines, links } = splitWikilinks(node.value);
      state.result.noteLinks.push(...links.map((link) => link.slug));
      return inlines;
    }
    case 'strong':
      return [{ type: 'strong', children: convertInlines(node.children, state) }];
    case 'emphasis':
      return [{ type: 'emphasis', children: convertInlines(node.children, state) }];
    case 'inlineCode':
      return [{ type: 'code', value: node.value }];
    case 'break':
      return [{ type: 'break' }];
    case 'link': {
      const children = convertInlines(node.children, state);
      const resolved = resolveLink(node.url, state.ctx);
      if ('error' in resolved) {
        fail(state, node, resolved.error);
        return children;
      }
      if (resolved.warning !== undefined) state.result.warnings.push(`${at(state, node)}: ${resolved.warning}`);
      return [{ type: 'link', kind: resolved.kind, href: resolved.href, children }];
    }
    case 'textDirective':
      return convertTextDirective(node, state);
    case 'html':
      if (!isComment(node.value)) fail(state, node, `raw HTML is not supported: ${node.value}`);
      return [];
    case 'image':
    case 'imageReference':
      fail(state, node, 'images are not supported');
      return [];
    default:
      fail(state, node, `unsupported markdown (${node.type}): "${plainText(node)}"`);
      return [];
  }
}

function convertInlines(nodes: readonly PhrasingContent[], state: State): GuideInline[] {
  const inlines = mergeText(nodes.flatMap((node) => convertInline(node, state)));
  // Checked on the merged text: a broken `[x](rw:A B)` is split into text + a ":A" text directive by the parser.
  const first = nodes.at(0);
  if (first !== undefined) for (const inline of inlines) if (inline.type === 'text') checkLeftovers(inline.value, first, state);
  return inlines;
}

/** `::source[Worldstone Shard]{item=misc}` → `source:Worldstone Shard{item=misc}`; `::secret-recipes` → `secret-recipes`. */
export function directiveKey(name: string, arg: string | null, attributes: Readonly<Record<string, string>>): string {
  const attrs = Object.entries(attributes)
    .sort(([a], [b]) => compareCodeUnits(a, b))
    .map(([key, value]) => `${key}=${value}`);
  return `${name}${arg === null ? '' : `:${arg}`}${attrs.length === 0 ? '' : `{${attrs.join(' ')}}`}`;
}

function convertLeafDirective(node: LeafDirective, state: State): GuideBlock[] {
  const resolver = LEAF_DIRECTIVES[node.name];
  if (resolver === undefined) {
    fail(state, node, `unknown directive "::${node.name}" (known: ${Object.keys(LEAF_DIRECTIVES).join(', ')})`);
    return [];
  }
  const arg = node.children.length === 0 ? null : argumentText(node).trim();
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(node.attributes ?? {})) attributes[key] = value ?? '';
  const block = resolver(arg, state.ctx, attributes);
  if ('error' in block) {
    fail(state, node, block.error);
    return [];
  }
  state.result.dataBlocks.push({ key: directiveKey(node.name, arg, attributes), block });
  return [{ type: 'data', block }];
}

function convertBlock(node: RootContent | BlockContent | DefinitionContent, state: State): GuideBlock[] {
  switch (node.type) {
    case 'paragraph': {
      const children = convertInlines(node.children, state);
      return children.length === 0 ? [] : [{ type: 'paragraph', children }];
    }
    case 'heading':
      if (node.depth !== 3 && node.depth !== 4) {
        fail(state, node, `only ### and #### headings are allowed (the title is the note's h1, got ${'#'.repeat(node.depth)})`);
        return [];
      }
      return [{ type: 'heading', depth: node.depth, children: convertInlines(node.children, state) }];
    case 'list':
      return [{ type: 'list', ordered: node.ordered === true, items: node.children.map((item) => convertBlocks(item.children, state)) }];
    case 'blockquote':
      return [{ type: 'blockquote', children: convertBlocks(node.children, state) }];
    case 'table': {
      const [head, ...body] = node.children.map((row) => row.children.map((cell) => convertInlines(cell.children, state)));
      return [{ type: 'table', header: head, rows: body }];
    }
    case 'thematicBreak':
      return [{ type: 'thematicBreak' }];
    case 'code':
      return [{ type: 'codeBlock', value: node.value }];
    case 'html':
      if (!isComment(node.value)) fail(state, node, `raw HTML is not supported: ${node.value.split('\n')[0] ?? ''}`);
      return [];
    case 'leafDirective':
      return convertLeafDirective(node, state);
    default:
      fail(state, node, `unsupported markdown (${node.type})`);
      return [];
  }
}

function convertBlocks(nodes: readonly (RootContent | BlockContent | DefinitionContent)[], state: State): GuideBlock[] {
  return nodes.flatMap((node) => convertBlock(node, state));
}

export function markdownToBlocks(markdown: string, ctx: GuideContext, file: string, lineOffset = 0): MarkdownResult {
  const tree = fromMarkdown(escapeTableWikilinks(markdown), {
    extensions: [gfm(), directive()],
    mdastExtensions: [gfmFromMarkdown(), directiveFromMarkdown()],
  });
  const state: State = { ctx, file, lineOffset, result: { blocks: [], noteLinks: [], dataBlocks: [], errors: [], warnings: [] } };
  state.result.blocks = convertBlocks(tree.children, state);
  return state.result;
}

function inlineWords(inlines: readonly GuideInline[]): string[] {
  return inlines.flatMap((inline): string[] => {
    switch (inline.type) {
      case 'text':
      case 'code':
        return inline.value.split(/\s+/);
      case 'break':
        return [];
      default:
        return inlineWords(inline.children);
    }
  });
}

function blockWords(block: GuideBlock): string[] {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return inlineWords(block.children);
    case 'list':
      return block.items.flatMap((item) => item.flatMap(blockWords));
    case 'blockquote':
      return block.children.flatMap(blockWords);
    case 'table':
      return [...block.header, ...block.rows.flat()].flatMap(inlineWords);
    case 'codeBlock':
      return block.value.split(/\s+/);
    case 'thematicBreak':
    case 'data':
      return [];
  }
}

/** Words of the body text; data blocks do not count. */
export function countWords(blocks: readonly GuideBlock[]): number {
  return blocks.flatMap(blockWords).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}
