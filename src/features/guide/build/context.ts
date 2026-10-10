/**
 * Everything the markdown converter, link resolver and directive resolvers look things up in.
 * Built once per generation from the committed game-data bundles, the guide's glossary and (when present) the ESR clone.
 */
import type { BasesBundle, SourcesBundle, TxtRunewordsBundle, TypesBundle } from '../../game-data/engine/schema.ts';
import type { GlossaryEntry } from '../engine/schema.ts';
import type { EsrGuideTables } from './esrGuideSources.ts';

export interface GameDataInputs {
  runewords: TxtRunewordsBundle;
  bases: BasesBundle;
  types: TypesBundle;
  sources: SourcesBundle;
}

/** File name → anchors of the official docs pages (the clone's docs/ folder) */
export type DocsIndex = ReadonlyMap<string, ReadonlySet<string>>;

export interface GuideContext {
  runewordNames: ReadonlySet<string>;
  /** Base code → display name */
  baseNames: ReadonlyMap<string, string>;
  typeCodes: ReadonlySet<string>;
  sources: SourcesBundle;
  glossary: readonly GlossaryEntry[];
  /** null when the ESR clone is missing (ESR-backed directives then fail) */
  esr: EsrGuideTables | null;
  /** null when the clone (or its docs/ folder) is missing; docs: links are then not checked */
  docs: DocsIndex | null;
}

export interface ContextInput {
  gameData: GameDataInputs;
  glossary: readonly GlossaryEntry[];
  esr: EsrGuideTables | null;
  docs: DocsIndex | null;
}

export function createGuideContext(input: ContextInput): GuideContext {
  return {
    runewordNames: new Set(input.gameData.runewords.runewords.map((runeword) => runeword.name)),
    baseNames: new Map(input.gameData.bases.bases.map((base) => [base.code, base.name])),
    typeCodes: new Set(input.gameData.types.types.map((type) => type.code)),
    sources: input.gameData.sources,
    glossary: input.glossary,
    esr: input.esr,
    docs: input.docs,
  };
}

/** Result of a build step that can fail with a message for the author. */
export interface BuildError {
  error: string;
}

export function isBuildError(value: object): value is BuildError {
  return 'error' in value && typeof value.error === 'string';
}
