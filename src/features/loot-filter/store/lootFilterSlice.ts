/**
 * Loot filter library + editor state.
 *
 * - `library.entries[].text` (the serialized filter file) is the source of truth and what localStorage holds.
 * - `editor.filter` is the parsed model of the open entry. Editor mutations change the model and set `dirty`;
 *   the saga serializes it back into the entry (`editorFlushed`, debounced), and `open`/`close` flush synchronously.
 * - Reducers return new objects instead of mutating the Immer draft: the engine model is deeply readonly, and
 *   building new values keeps every reducer a plain function of (state, payload).
 * - Ids and timestamps come from `prepare` callbacks, so the reducers stay pure (tests pass them in the payload).
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { parseLootFilter } from '../engine/parse';
import { serializeLootFilter } from '../engine/serialize';
import type { Diagnostic, FilterLevel, LootFilter, LootFilterRule, LootFilterStyle, Notifications, QualityColors } from '../engine/types';
import { createBlankFilter } from '../utils/blankFilter';
import { newEntryId } from '../utils/ids';
import { applyPatch, type ShallowPatch } from '../utils/patch';
import type { LootFilterEditorState, LootFilterEntry, LootFilterSource, LootFilterState } from './types';

type State = LootFilterState;

/** Top-level settings `setHeader` edits (filter levels, notifications and quality colours have their own reducers). */
export type LootFilterHeader = Pick<
  LootFilter,
  'title' | 'author' | 'version' | 'description' | 'updateUrl' | 'defaultLevel' | 'hideUnmatchedItems' | 'soundVolume'
>;

const DEFAULT_ENTRY_NAME = 'Untitled filter';

export const EMPTY_EDITOR: LootFilterEditorState = {
  id: null,
  filter: null,
  parseDiagnostics: [],
  textNotes: [],
  selectedRule: null,
  dirty: false,
};

export const initialState: State = {
  library: { hydrated: false, entries: [] },
  editor: EMPTY_EDITOR,
};

// ---------------------------------------------------------------------------
// Helpers (pure, on plain or draft state)
// ---------------------------------------------------------------------------

function cleanName(name: string): string {
  const trimmed = name.trim();
  return trimmed === '' ? DEFAULT_ENTRY_NAME : trimmed;
}

function withEntries(state: State, entries: readonly LootFilterEntry[]): State {
  return { ...state, library: { ...state.library, entries } };
}

function withEditor(state: State, editor: Partial<LootFilterEditorState>): State {
  return { ...state, editor: { ...state.editor, ...editor } };
}

function updateEntry(state: State, id: string, update: (entry: LootFilterEntry) => LootFilterEntry): State {
  const index = state.library.entries.findIndex((entry) => entry.id === id);
  if (index === -1) return state;
  const entries = [...state.library.entries];
  entries[index] = update(entries[index]);
  return withEntries(state, entries);
}

/** Writes a dirty editor model back into its entry's text, which then no longer has what `textNotes` describe. */
function flushEditor(state: State, now: number): State {
  const { id, filter, dirty } = state.editor;
  if (id === null || filter === null || !dirty) return state;
  const text = serializeLootFilter(filter);
  const flushed = updateEntry(state, id, (entry) => ({ ...entry, text, updatedAt: now }));
  return withEditor(flushed, { dirty: false, textNotes: [] });
}

/** Applies `update` to the open filter; a no-op (same object or undefined) leaves the state and `dirty` alone. */
function editFilter(state: State, update: (filter: LootFilter) => LootFilter | undefined): State {
  const filter = state.editor.filter;
  if (filter === null) return state;
  const next = update(filter);
  if (next === undefined || next === filter) return state;
  return withEditor(state, { filter: next, dirty: true });
}

function editRules(
  state: State,
  update: (
    rules: readonly LootFilterRule[]
  ) => { readonly rules: readonly LootFilterRule[]; readonly selectedRule?: number | null } | undefined
): State {
  const filter = state.editor.filter;
  if (filter === null) return state;
  const result = update(filter.rules);
  if (result === undefined) return state;
  const selectedRule = result.selectedRule === undefined ? state.editor.selectedRule : result.selectedRule;
  return withEditor(state, { filter: { ...filter, rules: result.rules }, dirty: true, selectedRule });
}

function isIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

/** `value` without its empty-object form: `{}` becomes undefined so the key is dropped from the file. */
function nonEmpty<T extends object>(value: T): T | undefined {
  return Object.keys(value).length === 0 ? undefined : value;
}

function parseEntryText(text: string): Pick<LootFilterEditorState, 'filter' | 'parseDiagnostics' | 'textNotes'> {
  try {
    const { filter, diagnostics, notes } = parseLootFilter(text);
    return { filter, parseDiagnostics: diagnostics, textNotes: notes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      filter: null,
      parseDiagnostics: [{ severity: 'error', path: '', message: `The filter is not valid JSON: ${message}` }],
      textNotes: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

interface CreateBlankPayload {
  readonly id: string;
  readonly name: string;
  readonly now: number;
}

interface ImportTextPayload {
  readonly id: string;
  readonly name: string;
  readonly text: string;
  readonly source: LootFilterSource;
  readonly now: number;
}

interface DuplicatePayload {
  readonly id: string;
  readonly newId: string;
  readonly now: number;
}

const stamp = <T extends object>(payload: T) => ({ payload: { ...payload, now: Date.now() } });

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const lootFilterSlice = createSlice({
  name: 'lootFilter',
  initialState,
  reducers: {
    // ----- library -----

    /** Loads the stored library (saga, at startup), replacing whatever the library held. */
    hydrate(state, action: PayloadAction<readonly LootFilterEntry[]>): State {
      return { ...state, library: { hydrated: true, entries: action.payload } };
    },

    createBlank: {
      reducer(state, action: PayloadAction<CreateBlankPayload>): State {
        const { id, now } = action.payload;
        const name = cleanName(action.payload.name);
        const text = serializeLootFilter(createBlankFilter(name));
        return withEntries(state, [...state.library.entries, { id, name, source: 'blank', createdAt: now, updatedAt: now, text }]);
      },
      prepare: (name: string) => stamp({ id: newEntryId(), name }),
    },

    /** Adds a filter file as a new entry (upload or template). The text is stored as given. */
    importText: {
      reducer(state, action: PayloadAction<ImportTextPayload>): State {
        const { id, text, source, now } = action.payload;
        const entry: LootFilterEntry = { id, name: cleanName(action.payload.name), source, createdAt: now, updatedAt: now, text };
        return withEntries(state, [...state.library.entries, entry]);
      },
      prepare: (input: { readonly name: string; readonly text: string; readonly source: LootFilterSource }) =>
        stamp({ id: newEntryId(), ...input }),
    },

    /** Copies an entry (flushing the editor first when it is the open one) right after the original. */
    duplicate: {
      reducer(state, action: PayloadAction<DuplicatePayload>): State {
        const { id, newId, now } = action.payload;
        const flushed = state.editor.id === id ? flushEditor(state, now) : state;
        const index = flushed.library.entries.findIndex((entry) => entry.id === id);
        if (index === -1) return state;
        const original = flushed.library.entries[index];
        const copy: LootFilterEntry = { ...original, id: newId, name: `${original.name} (copy)`, createdAt: now, updatedAt: now };
        const entries = [...flushed.library.entries];
        entries.splice(index + 1, 0, copy);
        return withEntries(flushed, entries);
      },
      prepare: (id: string) => stamp({ id, newId: newEntryId() }),
    },

    rename: {
      reducer(state, action: PayloadAction<{ readonly id: string; readonly name: string; readonly now: number }>): State {
        const { id, now } = action.payload;
        const name = cleanName(action.payload.name);
        return updateEntry(state, id, (entry) => (entry.name === name ? entry : { ...entry, name, updatedAt: now }));
      },
      prepare: (input: { readonly id: string; readonly name: string }) => stamp(input),
    },

    /** Deletes an entry; closes the editor when it is the open one. */
    remove(state, action: PayloadAction<string>): State {
      const id = action.payload;
      const entries = state.library.entries.filter((entry) => entry.id !== id);
      if (entries.length === state.library.entries.length) return state;
      const removed = withEntries(state, entries);
      return state.editor.id === id ? { ...removed, editor: EMPTY_EDITOR } : removed;
    },

    /** Serializes a dirty editor model into its entry (saga, debounced; the editor screen also sends it on unload). */
    editorFlushed: {
      reducer(state, action: PayloadAction<{ readonly now: number }>): State {
        return flushEditor(state, action.payload.now);
      },
      prepare: () => stamp({}),
    },

    // ----- editor: open / close -----

    /** Opens an entry: flushes the previously open one, then parses the text. A JSONC syntax error leaves `filter: null`. */
    open: {
      reducer(state, action: PayloadAction<{ readonly id: string; readonly now: number }>): State {
        const { id, now } = action.payload;
        const flushed = flushEditor(state, now);
        const entry = flushed.library.entries.find((candidate) => candidate.id === id);
        if (!entry) return { ...flushed, editor: { ...EMPTY_EDITOR, id } };
        const parsed = parseEntryText(entry.text);
        // The shipped template's section comments are ours; a notice about losing them would only be noise.
        const textNotes = entry.source === 'template' ? [] : parsed.textNotes;
        return { ...flushed, editor: { ...EMPTY_EDITOR, id, ...parsed, textNotes } };
      },
      prepare: (id: string) => stamp({ id }),
    },

    close: {
      reducer(state, action: PayloadAction<{ readonly now: number }>): State {
        return { ...flushEditor(state, action.payload.now), editor: EMPTY_EDITOR };
      },
      prepare: () => stamp({}),
    },

    // ----- editor: settings -----

    /** Patches the top-level settings; an `undefined` value removes the key. */
    setHeader(state, action: PayloadAction<ShallowPatch<LootFilterHeader>>): State {
      return editFilter(state, (filter) => applyPatch<LootFilter>(filter, action.payload));
    },

    /** Replaces the level list; `undefined` removes `filterLevels`. */
    setFilterLevels(state, action: PayloadAction<readonly FilterLevel[] | undefined>): State {
      return editFilter(state, (filter) => applyPatch(filter, { filterLevels: action.payload }));
    },

    /** Patches `notifications` (an `undefined` value removes that format); an empty result removes the key. */
    setNotifications(state, action: PayloadAction<ShallowPatch<Notifications>>): State {
      return editFilter(state, (filter) => {
        const notifications = nonEmpty(applyPatch<Notifications>(filter.notifications ?? {}, action.payload));
        return applyPatch(filter, { notifications });
      });
    },

    /** Patches `qualityColors` (an `undefined` value restores the game default); an empty result removes the key. */
    setQualityColors(state, action: PayloadAction<ShallowPatch<QualityColors>>): State {
      return editFilter(state, (filter) => {
        const qualityColors = nonEmpty(applyPatch<QualityColors>(filter.qualityColors ?? {}, action.payload));
        return applyPatch(filter, { qualityColors });
      });
    },

    /**
     * Changes a level's id and points `activeInLevels` and `defaultLevel` at the new one. No-op when `from` is not a
     * level, `to` is not an integer or another level already has it.
     */
    renumberLevel(state, action: PayloadAction<{ readonly from: number; readonly to: number }>): State {
      const { from, to } = action.payload;
      return editFilter(state, (filter) => {
        const levels = filter.filterLevels;
        if (from === to || !Number.isInteger(to) || !levels?.some((level) => level.id === from)) return undefined;
        if (levels.some((level) => level.id === to)) return undefined;
        const renumber = (id: number): number => (id === from ? to : id);
        const rules = filter.rules.map((rule) =>
          rule.activeInLevels?.includes(from) ? { ...rule, activeInLevels: rule.activeInLevels.map(renumber) } : rule
        );
        return {
          ...filter,
          filterLevels: levels.map((level) => (level.id === from ? { ...level, id: to } : level)),
          ...(filter.defaultLevel === undefined ? {} : { defaultLevel: renumber(filter.defaultLevel) }),
          rules,
        };
      });
    },

    // ----- editor: rules -----

    /** Inserts a rule (default: an empty one) at `at` (default: the end) and selects it. */
    addRule(state, action: PayloadAction<{ readonly rule?: LootFilterRule; readonly at?: number } | undefined>): State {
      return editRules(state, (rules) => {
        const at = action.payload?.at;
        const index = at === undefined || !Number.isInteger(at) ? rules.length : Math.min(Math.max(at, 0), rules.length);
        const next = [...rules];
        next.splice(index, 0, action.payload?.rule ?? {});
        return { rules: next, selectedRule: index };
      });
    },

    /** Replaces a whole rule. */
    updateRule(state, action: PayloadAction<{ readonly index: number; readonly rule: LootFilterRule }>): State {
      const { index, rule } = action.payload;
      return editRules(state, (rules) => {
        if (!isIndex(index, rules.length)) return undefined;
        const next = [...rules];
        next[index] = rule;
        return { rules: next };
      });
    },

    /** Shallow-merges into a rule; an `undefined` value removes the key (and a same-named passthrough key). */
    patchRule(state, action: PayloadAction<{ readonly index: number; readonly patch: ShallowPatch<LootFilterRule> }>): State {
      const { index, patch } = action.payload;
      return editRules(state, (rules) => {
        if (!isIndex(index, rules.length)) return undefined;
        const next = [...rules];
        next[index] = applyPatch(rules[index], patch);
        return { rules: next };
      });
    },

    removeRule(state, action: PayloadAction<number>): State {
      const index = action.payload;
      const selected = state.editor.selectedRule;
      return editRules(state, (rules) => {
        if (!isIndex(index, rules.length)) return undefined;
        let selectedRule = selected;
        if (selected === index) selectedRule = null;
        else if (selected !== null && selected > index) selectedRule = selected - 1;
        return { rules: rules.filter((_, position) => position !== index), selectedRule };
      });
    },

    /** Moves a rule; out-of-range or equal indices are a no-op. The selection follows the rules it pointed at. */
    moveRule(state, action: PayloadAction<{ readonly from: number; readonly to: number }>): State {
      const { from, to } = action.payload;
      const selected = state.editor.selectedRule;
      return editRules(state, (rules) => {
        if (from === to || !isIndex(from, rules.length) || !isIndex(to, rules.length)) return undefined;
        const next = [...rules];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        let selectedRule = selected;
        if (selected === from) selectedRule = to;
        else if (selected !== null && from < selected && selected <= to) selectedRule = selected - 1;
        else if (selected !== null && to <= selected && selected < from) selectedRule = selected + 1;
        return { rules: next, selectedRule };
      });
    },

    /** Inserts a copy right after the rule and selects the copy. */
    duplicateRule(state, action: PayloadAction<number>): State {
      const index = action.payload;
      return editRules(state, (rules) => {
        if (!isIndex(index, rules.length)) return undefined;
        const next = [...rules];
        next.splice(index + 1, 0, rules[index]);
        return { rules: next, selectedRule: index + 1 };
      });
    },

    /** Selects a rule (or none). Not an edit: `dirty` is unchanged. */
    selectRule(state, action: PayloadAction<number | null>): State {
      const index = action.payload;
      const count = state.editor.filter?.rules.length ?? 0;
      const selectedRule = index !== null && isIndex(index, count) ? index : null;
      return selectedRule === state.editor.selectedRule ? state : withEditor(state, { selectedRule });
    },

    // ----- editor: styles -----

    /** Adds a style at the end, or replaces an existing one in place. */
    setStyle(state, action: PayloadAction<{ readonly name: string; readonly style: LootFilterStyle }>): State {
      const { name, style } = action.payload;
      return editFilter(state, (filter) => (name === '' ? undefined : { ...filter, styles: { ...filter.styles, [name]: style } }));
    },

    /** Renames a style in place and points the rules that used the old name at the new one. No-op when `to` is taken or empty. */
    renameStyle(state, action: PayloadAction<{ readonly from: string; readonly to: string }>): State {
      const { from, to } = action.payload;
      return editFilter(state, (filter) => {
        const styles = filter.styles;
        if (!styles || !Object.hasOwn(styles, from) || to === '' || Object.hasOwn(styles, to)) return undefined;
        const renamed = Object.fromEntries(Object.entries(styles).map(([name, style]) => [name === from ? to : name, style]));
        const rules = filter.rules.map((rule) => (rule.useStyle === from ? { ...rule, useStyle: to } : rule));
        return { ...filter, styles: renamed, rules };
      });
    },

    /** Removes a style; rules that use it keep the name (the validator reports it). An empty `styles` is dropped. */
    removeStyle(state, action: PayloadAction<string>): State {
      const name = action.payload;
      return editFilter(state, (filter) => {
        if (!filter.styles || !Object.hasOwn(filter.styles, name)) return undefined;
        const styles = Object.fromEntries(Object.entries(filter.styles).filter(([key]) => key !== name));
        return applyPatch(filter, { styles: nonEmpty(styles) });
      });
    },

    // ----- editor: whole filter -----

    /** The JSON tab's "Apply": a freshly parsed filter, its parse diagnostics and the applied text's notes. */
    replaceFilter(
      state,
      action: PayloadAction<{
        readonly filter: LootFilter;
        readonly diagnostics: readonly Diagnostic[];
        readonly notes?: readonly Diagnostic[];
      }>
    ): State {
      if (state.editor.id === null) return state;
      const { filter, diagnostics, notes = [] } = action.payload;
      const selected = state.editor.selectedRule;
      const selectedRule = selected !== null && isIndex(selected, filter.rules.length) ? selected : null;
      return withEditor(state, { filter, parseDiagnostics: diagnostics, textNotes: notes, selectedRule, dirty: true });
    },
  },
});

export const {
  hydrate,
  createBlank,
  importText,
  duplicate,
  rename,
  remove,
  editorFlushed,
  open,
  close,
  setHeader,
  setFilterLevels,
  renumberLevel,
  setNotifications,
  setQualityColors,
  addRule,
  updateRule,
  patchRule,
  removeRule,
  moveRule,
  duplicateRule,
  selectRule,
  setStyle,
  renameStyle,
  removeStyle,
  replaceFilter,
} = lootFilterSlice.actions;

export default lootFilterSlice.reducer;
