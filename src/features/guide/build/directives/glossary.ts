/** `::glossary` (all entries) and the inline `:term[Stocker]{label=stockers}` glossary hover. */
import type { GuideInline } from '../../engine/schema.ts';
import { compareCodeUnits } from '../compare.ts';
import type { BuildError, GuideContext } from '../context.ts';
import type { DirectiveResolver } from './types.ts';

export const resolveGlossary: DirectiveResolver = (arg, ctx) => {
  if (arg !== null) return { error: '::glossary takes no argument' };
  return { kind: 'glossary', entries: [...ctx.glossary].sort((a, b) => compareCodeUnits(a.term.toLowerCase(), b.term.toLowerCase())) };
};

/** Matches the term case-insensitively and stores the glossary's spelling. */
export function resolveTerm(term: string, label: string | null, ctx: Pick<GuideContext, 'glossary'>): GuideInline | BuildError {
  const lower = term.trim().toLowerCase();
  const entry = ctx.glossary.find((candidate) => candidate.term.toLowerCase() === lower);
  if (entry === undefined) return { error: `unknown glossary term "${term}" (:term; add it to _glossary.yml)` };
  return { type: 'term', term: entry.term, children: [{ type: 'text', value: label ?? term }] };
}
