import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StringsFile } from './strings.ts';

/** Paths inside an Eastern_Sun_Resurrected clone. `excel/base/` is a byte-identical duplicate and is ignored. */
export const ESR_EXCEL_DIR = 'Eastern_Sun_Resurrected.mpq/data/global/excel';
export const ESR_STRINGS_DIR = 'Eastern_Sun_Resurrected.mpq/data/local/lng/strings';
export const ESR_METADATA_FILE = 'd2rloader/metadata.json';

const TABLES = [
  'itemtypes',
  'weapons',
  'armor',
  'misc',
  'charstats',
  'runes',
  // Phase 3: affixes + stat renderer
  'magicprefix',
  'magicsuffix',
  'automagic',
  'properties',
  'itemstatcost',
  'propertygroups',
  'skills',
  'skilldesc',
  'monstats',
  'montype',
] as const;
export type EsrTableName = (typeof TABLES)[number];

/** Raw text of everything the generator reads from the clone. */
export interface EsrSources {
  esrVersion: string;
  tables: Record<EsrTableName, string>;
  strings: StringsFile[];
}

function readModVersion(esrDir: string): string {
  const parsed: unknown = JSON.parse(readFileSync(join(esrDir, ESR_METADATA_FILE), 'utf8').replace(/^\uFEFF/, ''));
  const metadata = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>).metadata : undefined;
  const version = typeof metadata === 'object' && metadata !== null ? (metadata as Record<string, unknown>).modVersion : undefined;
  if (typeof version !== 'string' || version === '') throw new Error(`${ESR_METADATA_FILE}: metadata.modVersion missing`);
  return version;
}

export function readEsrSources(esrDir: string): EsrSources {
  const excelDir = join(esrDir, ESR_EXCEL_DIR);
  const tables = {} as Record<EsrTableName, string>;
  for (const name of TABLES) tables[name] = readFileSync(join(excelDir, `${name}.txt`), 'utf8');

  const stringsDir = join(esrDir, ESR_STRINGS_DIR);
  const strings = readdirSync(stringsDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({ name, text: readFileSync(join(stringsDir, name), 'utf8') }));

  return { esrVersion: readModVersion(esrDir), tables, strings };
}
