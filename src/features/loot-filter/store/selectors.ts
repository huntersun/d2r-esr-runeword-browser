import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/core/store/store';
import { validateLootFilter } from '../engine/validate';
import type { Diagnostic, LootFilterReference, LootFilterRule } from '../engine/types';
import type { LootFilterEntry } from './types';

export const selectLibraryHydrated = (state: RootState): boolean => state.lootFilter.library.hydrated;
export const selectLibraryEntries = (state: RootState): readonly LootFilterEntry[] => state.lootFilter.library.entries;

export const selectLibraryEntry = (state: RootState, id: string | undefined): LootFilterEntry | undefined =>
  id === undefined ? undefined : state.lootFilter.library.entries.find((entry) => entry.id === id);

export const selectEditor = (state: RootState) => state.lootFilter.editor;
export const selectEditorFilter = (state: RootState) => state.lootFilter.editor.filter;
export const selectParseDiagnostics = (state: RootState) => state.lootFilter.editor.parseDiagnostics;
export const selectSelectedRule = (state: RootState) => state.lootFilter.editor.selectedRule;

export const selectEditorRule = (state: RootState, index: number): LootFilterRule | undefined =>
  state.lootFilter.editor.filter?.rules[index];

/**
 * Parse diagnostics plus `validateLootFilter` on the open model. The reference is passed by the caller (from
 * `useLootFilterReference`) instead of living in Redux: it holds Sets, which Redux state should not.
 * Memoized on (filter, parse diagnostics, reference) identity.
 */
export const selectDiagnostics = createSelector(
  [selectEditorFilter, selectParseDiagnostics, (_state: RootState, reference?: LootFilterReference) => reference],
  (filter, parseDiagnostics, reference): readonly Diagnostic[] =>
    filter === null ? parseDiagnostics : [...parseDiagnostics, ...validateLootFilter(filter, reference)]
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
