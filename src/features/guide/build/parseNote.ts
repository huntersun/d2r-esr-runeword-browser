/**
 * One `notes/<slug>.md` file → a GuideNote (graph fields still empty: backlinks, next, spineStep are computed by
 * graph.ts once every note is parsed) plus what the generator validates across notes.
 */
import type { DataBlock, GuideNote, NoteKind, OfficialDocLink, Volatility } from '../engine/schema.ts';
import type { GuideContext } from './context.ts';
import { FieldReader, isObject, parseYaml } from './fields.ts';
import { resolveDocsLink } from './links.ts';
import { countWords, markdownToBlocks } from './markdown.ts';

export const SUMMARY_MAX = 140;
export const KNOW_FIRST_MAX = 3;
export const RELATED_MAX = 5;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+(?:\.\d+)*$/;
const FIELDS = [
  'title',
  'kind',
  'summary',
  'tags',
  'aliases',
  'knowFirst',
  'related',
  'next',
  'verified',
  'volatility',
  'mentions',
  'officialDocs',
  'sources',
] as const;

export interface ParsedNote {
  note: GuideNote;
  /** `[[slug]]` targets in the body */
  noteLinks: string[];
  /** frontmatter `next` override, or null */
  nextOverride: string | null;
  mentions: string[];
  /** Resolved data blocks keyed by directive source, in order (staleness hashes) */
  dataBlocks: { key: string; block: DataBlock }[];
  errors: string[];
  warnings: string[];
}

export function isSlug(value: string): boolean {
  return SLUG.test(value);
}

/** Splits `---\n<yaml>\n---\n<body>`; null when the file does not start with a frontmatter block. */
export function splitFrontmatter(text: string): { yaml: string; body: string; bodyLine: number } | null {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n?---[ \t]*(?:\n|$)/.exec(normalized);
  if (match === null) return null;
  const yaml = match[1];
  return { yaml, body: normalized.slice(match[0].length), bodyLine: match[0].split('\n').length - 1 };
}

function readSlugs(fields: FieldReader, field: string, max?: number): string[] {
  const slugs = fields.strings(field, max);
  for (const slug of slugs) if (!isSlug(slug)) fields.error(field, `"${slug}" is not a valid slug (kebab-case a-z, 0-9)`);
  return slugs;
}

/** `yaml` is the raw frontmatter: YAML turns an unquoted 3.10 into the number 3.1, so the hint quotes the source text. */
function readVerified(fields: FieldReader, raw: unknown, yaml: string): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number') {
    const written = /^verified:[ \t]*([^\s#]+)/m.exec(yaml)?.[1] ?? String(raw);
    fields.error('verified', `quote the version: verified: '${written}'`);
    return null;
  }
  if (typeof raw !== 'string' || !VERSION.test(raw.trim())) {
    fields.error('verified', `must be an ESR version like 3.2.12, or omitted for a draft (got ${JSON.stringify(raw)})`);
    return null;
  }
  return raw.trim();
}

function readOfficialDocs(fields: FieldReader, ctx: GuideContext, file: string, warnings: string[]): OfficialDocLink[] {
  return fields.list('officialDocs').flatMap((item, i): OfficialDocLink[] => {
    const field = `officialDocs[${String(i)}]`;
    if (!isObject(item) || typeof item.label !== 'string' || typeof item.href !== 'string') {
      fields.error(field, 'must be a mapping with label and href strings');
      return [];
    }
    const href = item.href.trim();
    if (/^https?:\/\//.test(href)) return [{ label: item.label.trim(), href }];
    if (!href.startsWith('docs:')) {
      fields.error(field, `href must be docs:<file>#<anchor> or an http(s) URL (got "${href}")`);
      return [];
    }
    const resolved = resolveDocsLink(href.slice('docs:'.length), ctx);
    if ('error' in resolved) {
      fields.error(field, resolved.error);
      return [];
    }
    if (resolved.warning !== undefined) warnings.push(`${file}: ${field}: ${resolved.warning}`);
    return [{ label: item.label.trim(), href: resolved.href }];
  });
}

/**
 * @param file path shown in messages, e.g. `notes/forging.md`; the slug is its base name
 */
export function parseNote(file: string, text: string, ctx: GuideContext): ParsedNote {
  const errors: string[] = [];
  const warnings: string[] = [];
  const slug = (file.split('/').pop() ?? file).replace(/\.md$/, '');
  if (!isSlug(slug)) errors.push(`${file}: file name "${slug}" is not a valid slug (kebab-case a-z, 0-9)`);

  const parts = splitFrontmatter(text);
  if (parts === null) errors.push(`${file}: missing frontmatter (the file must start with a --- block)`);
  const data = parts === null ? {} : parseYaml(parts.yaml, file, errors);
  if (data !== undefined && !isObject(data)) errors.push(`${file}: frontmatter must be a YAML mapping`);
  const fields = new FieldReader(isObject(data) ? data : {}, file, errors);
  fields.onlyKeys(FIELDS);

  const kind: NoteKind = fields.oneOf('kind', ['note', 'link', 'hub'], 'note');
  const volatility: Volatility = fields.oneOf('volatility', ['low', 'high'], 'low');
  const nextOverride = fields.string('next');
  if (nextOverride !== null && !isSlug(nextOverride)) fields.error('next', `"${nextOverride}" is not a valid slug`);

  const markdown = markdownToBlocks(parts?.body ?? '', ctx, file, parts?.bodyLine ?? 0);
  errors.push(...markdown.errors);
  warnings.push(...markdown.warnings);

  const note: GuideNote = {
    slug,
    title: fields.string('title', { required: true }),
    kind,
    summary: fields.string('summary', { required: true, max: SUMMARY_MAX }),
    tags: fields.strings('tags'),
    aliases: fields.strings('aliases'),
    verified: readVerified(fields, isObject(data) ? data.verified : undefined, parts?.yaml ?? ''),
    staleReasons: [],
    volatility,
    knowFirst: readSlugs(fields, 'knowFirst', KNOW_FIRST_MAX),
    related: readSlugs(fields, 'related', RELATED_MAX),
    backlinks: [],
    next: null,
    spineStep: null,
    officialDocs: readOfficialDocs(fields, ctx, file, warnings),
    sources: fields.strings('sources'),
    words: countWords(markdown.blocks),
    body: markdown.blocks,
  };
  return {
    note,
    noteLinks: markdown.noteLinks,
    nextOverride,
    mentions: fields.strings('mentions'),
    dataBlocks: markdown.dataBlocks,
    errors,
    warnings,
  };
}
