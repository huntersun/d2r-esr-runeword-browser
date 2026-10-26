import type { Diagnostic, LootFilter } from '../engine/types';

export type LootFilterSource = 'blank' | 'upload' | 'template';

/** One saved filter. `text` (the filter file as serialized) is the source of truth; the editor's model is derived from it. */
export interface LootFilterEntry {
  readonly id: string;
  /** The library name (not the file's `title`). */
  readonly name: string;
  readonly source: LootFilterSource;
  /** Epoch milliseconds */
  readonly createdAt: number;
  /** Epoch milliseconds */
  readonly updatedAt: number;
  readonly text: string;
}

export interface LootFilterLibraryState {
  /** False until the saga has read the library from localStorage. */
  readonly hydrated: boolean;
  readonly entries: readonly LootFilterEntry[];
}

export interface LootFilterEditorState {
  /** The open entry's id, or null when no filter is open. */
  readonly id: string | null;
  /** The parsed model; null when nothing is open or the entry's text is not valid JSON. */
  readonly filter: LootFilter | null;
  /** Diagnostics from the last parse (open or JSON-tab apply); a syntax error is one error with an empty path. */
  readonly parseDiagnostics: readonly Diagnostic[];
  /**
   * Warnings about the entry's text itself (accepted trailing commas and block comments, comments after the opening
   * brace that are dropped), from `textNotes`. Kept until the model is serialized back into the entry: the written text
   * no longer has them. Not set for template entries.
   */
  readonly textNotes: readonly Diagnostic[];
  readonly selectedRule: number | null;
  /** True when the model has edits not yet written back to the entry's `text`. */
  readonly dirty: boolean;
}

export interface LootFilterState {
  readonly library: LootFilterLibraryState;
  readonly editor: LootFilterEditorState;
}
