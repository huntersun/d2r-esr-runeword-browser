import { createSelector } from '@reduxjs/toolkit';
import { readLootFilter } from '../engine/parse';
import { toPlainJson } from '../engine/serialize';
import { validateLootFilter } from '../engine/validate';
import type { Diagnostic, LootFilterReference } from '../engine/types';
import type { LootFilterEntry, LootFilterState } from './types';

/** The part of the root state these selectors read (the app's `LootFilterRootState` is one). */
interface LootFilterRootState {
  readonly lootFilter: LootFilterState;
}

export const selectLibraryHydrated = (state: LootFilterRootState): boolean => state.lootFilter.library.hydrated;
export const selectLibraryEntries = (state: LootFilterRootState): readonly LootFilterEntry[] => state.lootFilter.library.entries;

export const selectLibraryEntry = (state: LootFilterRootState, id: string | undefined): LootFilterEntry | undefined =>
  id === undefined ? undefined : state.lootFilter.library.entries.find((entry) => entry.id === id);

export const selectEditor = (state: LootFilterRootState) => state.lootFilter.editor;
export const selectEditorFilter = (state: LootFilterRootState) => state.lootFilter.editor.filter;
export const selectParseDiagnostics = (state: LootFilterRootState) => state.lootFilter.editor.parseDiagnostics;
export const selectTextNotes = (state: LootFilterRootState) => state.lootFilter.editor.textNotes;

/**
 * The open model's diagnostics: shape diagnostics from re-reading the model as JSON (so rule indices and fixed keys
 * follow edits) plus `validateLootFilter`, after the entry text's notes (`textNotes`: accepted trailing commas and block
 * comments, comments that are dropped; cleared once the model is written back). Without a model (a JSONC syntax error)
 * it is the stored parse diagnostics.
 * The reference is passed by the caller (from `useLootFilterReference`) instead of living in Redux: it holds Sets,
 * which Redux state should not. Memoized on (filter, parse diagnostics, text notes, reference) identity.
 */
export const selectDiagnostics = createSelector(
  [
    selectEditorFilter,
    selectParseDiagnostics,
    selectTextNotes,
    (_state: LootFilterRootState, reference?: LootFilterReference) => reference,
  ],
  (filter, parseDiagnostics, textNotes, reference): readonly Diagnostic[] =>
    filter === null
      ? parseDiagnostics
      : [...textNotes, ...readLootFilter(toPlainJson(filter)).diagnostics, ...validateLootFilter(filter, reference)]
);

export interface DiagnosticCounts {
  readonly errors: number;
  readonly warnings: number;
}

export function countDiagnostics(diagnostics: readonly Diagnostic[]): DiagnosticCounts {
  let errors = 0;
  for (const diagnostic of diagnostics) if (diagnostic.severity === 'error') errors += 1;
  return { errors, warnings: diagnostics.length - errors };
}
