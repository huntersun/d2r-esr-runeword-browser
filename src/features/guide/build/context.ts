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
  /** Lower-cased names of sources.json items by kind (mentions) */
  sourceNames: Readonly<Record<'unique' | 'set' | 'misc', ReadonlySet<string>>>;
  /** Lower-cased names a `unique:` / `mythical:` / `socketable:` link or card may target (see linkTargetNames) */
  linkNames: Readonly<Record<LinkTargetKind, ReadonlySet<string>>>;
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

function sourceNames(sources: SourcesBundle, kind: 'unique' | 'set' | 'misc'): Set<string> {
  return new Set(sources.items.filter((item) => item.item === kind).map((item) => item.name.toLowerCase()));
}

export type LinkTargetKind = 'unique' | 'mythical' | 'socketable';

/**
 * What the item pages can show, from sources.json plus the ESR tables: a mythical is a unique whose base is a
 * "Mythical …" item (bases.json only lists spawnable bases, and most mythical bases are unique-only), a socketable a
 * misc item whose type descends from a gem or rune type (crystals are runes). Without the clone the kinds cannot be
 * told apart: every unique is a valid unique/mythical target and every misc item a socketable.
 */
export function linkTargetNames(
  sources: SourcesBundle,
  types: TypesBundle,
  esr: Pick<EsrGuideTables, 'items'> | null
): Record<LinkTargetKind, Set<string>> {
  const names: Record<LinkTargetKind, Set<string>> = { unique: new Set(), mythical: new Set(), socketable: new Set() };
  const ancestors = new Map(types.types.map((type) => [type.code, type.ancestors]));
  const items = esr === null ? null : new Map(esr.items.map((item) => [item.code, item]));
  for (const source of sources.items) {
    const name = source.name.toLowerCase();
    const item = items?.get(source.code);
    if (source.item === 'unique') {
      if (items === null) {
        names.unique.add(name);
        names.mythical.add(name);
      } else names[/^Mythical\b/.test(item?.internalName ?? '') ? 'mythical' : 'unique'].add(name);
    } else if (source.item === 'misc') {
      const lineage = item === undefined ? [] : (ancestors.get(item.type) ?? []);
      if (items === null || lineage.includes('gem') || lineage.includes('rune')) names.socketable.add(name);
    }
  }
  return names;
}

export function createGuideContext(input: ContextInput): GuideContext {
  return {
    runewordNames: new Set(input.gameData.runewords.runewords.map((runeword) => runeword.name)),
    baseNames: new Map(input.gameData.bases.bases.map((base) => [base.code, base.name])),
    typeCodes: new Set(input.gameData.types.types.map((type) => type.code)),
    sources: input.gameData.sources,
    sourceNames: {
      unique: sourceNames(input.gameData.sources, 'unique'),
      set: sourceNames(input.gameData.sources, 'set'),
      misc: sourceNames(input.gameData.sources, 'misc'),
    },
    linkNames: linkTargetNames(input.gameData.sources, input.gameData.types, input.esr),
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
