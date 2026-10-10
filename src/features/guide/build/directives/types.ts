import type { DataBlock } from '../../engine/schema.ts';
import type { BuildError, GuideContext } from '../context.ts';
import type { EsrGuideTables } from '../esrGuideSources.ts';

/** A leaf directive: `::name[arg]` → a data block, or an error for the author. */
export type DirectiveResolver = (arg: string | null, ctx: GuideContext) => DataBlock | BuildError;

export function requireEsr(ctx: GuideContext, directive: string): EsrGuideTables | BuildError {
  return ctx.esr ?? { error: `::${directive} needs the ESR clone (not found; pass --esr <dir>)` };
}
