import { parseLootFilter } from '../engine/parse';
import type { Diagnostic } from '../engine/types';

export type FilterTextCheck =
  | { readonly ok: true; readonly title: string | null; readonly diagnostics: readonly Diagnostic[] }
  | { readonly ok: false; readonly message: string };

/**
 * Checks that a filter file can be read before it goes into the library. Only a JSON syntax error refuses it;
 * a file with diagnostics (unknown keys, wrong shapes) is still imported and the editor lists them.
 */
export function checkFilterText(text: string): FilterTextCheck {
  try {
    const { filter, diagnostics } = parseLootFilter(text);
    const title = filter.title?.trim();
    return { ok: true, title: title === undefined || title === '' ? null : title, diagnostics };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/** A file name without its directory and `.json` extension. */
export function fileBaseName(fileName: string): string {
  return fileName.replace(/^.*[\\/]/, '').replace(/\.jsonc?$/i, '');
}
