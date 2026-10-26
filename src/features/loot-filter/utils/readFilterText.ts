import { parseLootFilter } from '../engine/parse';
import type { Diagnostic } from '../engine/types';

type FilterTextCheck =
  | {
      readonly ok: true;
      readonly title: string | null;
      readonly diagnostics: readonly Diagnostic[];
      /** Warnings about the text itself (`textNotes` of the parser). */
      readonly notes: readonly Diagnostic[];
    }
  | { readonly ok: false; readonly message: string };

/**
 * Checks that a filter file can be read before it goes into the library. Only a JSON syntax error refuses it;
 * a file with diagnostics (unknown keys, wrong shapes) is still imported and the editor lists them.
 */
export function checkFilterText(text: string): FilterTextCheck {
  try {
    const { filter, diagnostics, notes } = parseLootFilter(text);
    const title = filter.title?.trim();
    return { ok: true, title: title === undefined || title === '' ? null : title, diagnostics, notes };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/** A file name without its directory and `.json` extension. */
export function fileBaseName(fileName: string): string {
  return fileName.replace(/^.*[\\/]/, '').replace(/\.jsonc?$/i, '');
}

/**
 * The upload toast's description: how many problems the editor lists (`problems` counts the notes too), then the
 * text notes themselves (accepted trailing commas, comments that the first edit drops), or undefined when there is nothing.
 */
export function importDescription(problems: number, notes: readonly Diagnostic[]): string | undefined {
  if (problems === 0) return undefined;
  const count = `${String(problems)} ${problems === 1 ? 'problem' : 'problems'} to review in the editor.`;
  return [count, ...notes.map((note) => `${note.message}.`)].join(' ');
}
