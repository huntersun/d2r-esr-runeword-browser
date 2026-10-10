import type { AffixesBundle, BasesBundle, SourcesBundle, TxtRunewordsBundle, TypesBundle } from '../engine/schema.ts';
import { buildAffixesBundle } from './bundleAffixes.ts';
import { buildBasesBundle } from './bundleBases.ts';
import { buildRunewordsBundle } from './bundleRunewords.ts';
import { buildSourcesBundle } from './bundleSources.ts';
import { buildTypesBundle } from './bundleTypes.ts';
import type { EsrSources } from './esrSources.ts';
import { readAffixes, readCharStats, readItems, readItemTypes, readRuneRecipes } from './model.ts';
import { createStatRenderer, readStatTables } from './stats/statRenderer.ts';
import { buildStringTable } from './strings.ts';
import { parseTsv } from './tsv.ts';

export interface GeneratedBundles {
  types: TypesBundle;
  bases: BasesBundle;
  runewords: TxtRunewordsBundle;
  affixes: AffixesBundle;
  sources: SourcesBundle;
  counts: Record<string, number>;
  /** Build warnings stored in the manifest */
  warnings: string[];
  /** String-table key conflicts; printed only (mostly chinese-overlay noise), counted in counts.stringConflicts */
  stringWarnings: string[];
}

/** Builds all bundles from the raw clone sources (no I/O). */
export function generateBundles(sources: EsrSources): GeneratedBundles {
  const { strings, warnings: stringWarnings } = buildStringTable(sources.strings);
  const table = (name: keyof EsrSources['tables']) => parseTsv(sources.tables[name], `${name}.txt`);

  const typeRows = readItemTypes(table('itemtypes'));
  const charStats = readCharStats(table('charstats'));
  const misc = readItems(table('misc'), 'misc');
  const items = [...readItems(table('weapons'), 'weapon'), ...readItems(table('armor'), 'armor'), ...misc];
  // Bases only need ancestors/sockets/classes; type names are settled afterwards, when the base types are known
  const bases = buildBasesBundle(items, buildTypesBundle(typeRows, charStats, strings).bundle, strings);
  const baseTypes = new Set(bases.bundle.bases.flatMap((base) => (base.type2 === null ? [base.type] : [base.type, base.type2])));
  const types = buildTypesBundle(typeRows, charStats, strings, baseTypes);
  const renderer = createStatRenderer(readStatTables(sources.tables), strings);
  const renderMods = (mods: Parameters<typeof renderer.renderMods>[0]) => renderer.renderMods(mods);
  const runewords = buildRunewordsBundle(readRuneRecipes(table('runes')), misc, types.bundle, strings, renderMods);
  const affixRows = [
    ...readAffixes(table('magicprefix'), 'p'),
    ...readAffixes(table('magicsuffix'), 's'),
    ...readAffixes(table('automagic'), 'a'),
  ];
  const affixes = buildAffixesBundle(affixRows, types.bundle, strings, renderMods);
  const countAffixes = (kind: string) => affixes.bundle.affixes.filter((affix) => affix.kind === kind).length;

  const sourceItems = buildSourcesBundle(
    {
      uniqueitems: table('uniqueitems'),
      setitems: table('setitems'),
      weapons: table('weapons'),
      armor: table('armor'),
      misc: table('misc'),
      cubemain: table('cubemain'),
      treasureclassex: table('treasureclassex'),
      monstats: table('monstats'),
      superuniques: table('superuniques'),
      gamble: table('gamble'),
    },
    strings,
    sources.plugins.bossSetUniqueDrop
  );
  const countSources = (item: string) => sourceItems.bundle.items.filter((source) => source.item === item).length;

  const countKind = (kind: string) => bases.bundle.bases.filter((base) => base.kind === kind).length;
  return {
    types: types.bundle,
    bases: bases.bundle,
    runewords: runewords.bundle,
    affixes: affixes.bundle,
    sources: sourceItems.bundle,
    counts: {
      types: types.bundle.types.length,
      classes: types.bundle.classes.length,
      bases: bases.bundle.bases.length,
      weapons: countKind('weapon'),
      armors: countKind('armor'),
      misc: countKind('misc'),
      strings: strings.size,
      stringConflicts: stringWarnings.length,
      duplicateBases: bases.duplicates,
      runewords: runewords.bundle.runewords.length,
      runewordRows: runewords.bundle.runewords.reduce((sum, runeword) => sum + runeword.rows.length, 0),
      affixes: affixes.bundle.affixes.length,
      affixesPrefix: countAffixes('p'),
      affixesSuffix: countAffixes('s'),
      affixesAutomagic: countAffixes('a'),
      affixesDropped: affixes.dropped,
      affixesPlaceholdersDropped: affixes.droppedPlaceholders,
      sourcesUnique: countSources('unique'),
      sourcesSet: countSources('set'),
      sourcesMisc: countSources('misc'),
      sourcesMerged: sourceItems.merged,
      sourcesUnknown: sourceItems.bundle.items.filter((source) => source.labels.some((entry) => entry.kind === 'unknown')).length,
    },
    warnings: [...types.warnings, ...bases.warnings, ...runewords.warnings, ...affixes.warnings, ...sourceItems.warnings],
    stringWarnings: [...stringWarnings],
  };
}
