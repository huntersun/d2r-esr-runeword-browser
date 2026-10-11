# Loot Filter (editor for ESR's loot filter plugin)

A browser-only editor for the JSON loot filter files that ESR's loot filter plugin reads (since ESR 3.2.09). Filters
are kept in the browser's localStorage and downloaded as files for the ESR launcher. Format reference:
[ESR-LOOT-FILTER-GUIDE.md](../../builds-feature-docs/loot-filter/ESR-LOOT-FILTER-GUIDE.md). Research and owner
decisions: [FEATURE-LOOT-FILTER-RESEARCH.md](../../builds-feature-docs/FEATURE-LOOT-FILTER-RESEARCH.md) §5–6.

## Routes

| Path                | Screen                  | Notes                                                                                           |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `/loot-filters`     | LootFilterLibraryScreen | The library: New filter, Upload, Start from Sully's QoL; one card per filter                    |
| `/loot-filters/:id` | LootFilterEditorScreen  | The editor; `?tab=rules\|styles\|settings\|json\|test` (default `rules`); unknown id: not found |

Both routes skip the HTM "Loading data..." gate (`STATIC_BUNDLE_ROUTE_PREFIXES` in `AppLayout.tsx`, see
[NAVIGATION.md](../technical/NAVIGATION.md#startup-loading-gate)): they need only the game-data bundles, the assets in
`public/loot-filters/` and localStorage. Header entry: "Loot Filters", after "Game Data".

## Using a filter in the game

Download a filter, then in the ESR launcher open the **Loot Filter** tab and choose **Import**. Your own filters live in
`<Saved Games>\Diablo II Resurrected\mods\<mod>\LootFilters\`; sound files go in a `sounds` folder and minimap icons in
an `icons` folder next to the filter. In game, the Loot Filter section in Controls holds the level key; the console
command `lootfilter` shows the plugin's state and problems, `lootfilter reload` reloads.

## Storage model

- **Key** `loot-filters/library` in localStorage, value `{ "version": 1, "entries": [...] }`.
- **Entry** `{ id, name, source: 'blank' | 'upload' | 'template', createdAt, updatedAt, text }`; times are epoch ms,
  ids come from `crypto.randomUUID` (with a fallback). `name` is the library name, not the file's `title`.
- **`text` is the source of truth**: the filter file exactly as it will be downloaded. An upload is stored verbatim
  until the first edit; the editor's model is parsed from `text` when the filter opens and serialized back after edits.
- A stored value that fails the type guard (corrupt, or written by a newer version) is copied once to
  `loot-filters/library.unreadable` before the library starts empty, so the next save cannot destroy it.
- A refused write (quota) shows one toast, "Could not save: browser storage is full", until a write succeeds again;
  editing keeps working in memory.

## State (`src/features/loot-filter/store/`)

`lootFilter` slice, registered in `core/store/store.ts`:

- `library`: `{ hydrated, entries }`. Reducers: `hydrate(entries)`, `createBlank(name)`, `importText({ name, text, source })`,
  `duplicate(id)`, `rename({ id, name })`, `remove(id)`, `editorFlushed()`.
- `editor`: `{ id, filter, parseDiagnostics, selectedRule, dirty }`. Reducers: `open(id)` (parses the text; a JSONC
  syntax error leaves `filter: null` and one error diagnostic), `close()`, `setHeader(patch)`, `setFilterLevels(levels)`,
  `setNotifications(patch)`, `setQualityColors(patch)`, `addRule({ rule?, at? })`, `updateRule({ index, rule })`,
  `patchRule({ index, patch })`, `removeRule(index)`, `moveRule({ from, to })`, `duplicateRule(index)`, `selectRule(index)`,
  `setStyle({ name, style })`, `renameStyle({ from, to })` (also re-points rules' `useStyle`), `removeStyle(name)`,
  `replaceFilter({ filter, diagnostics })`.
- Patches are shallow: an `undefined` value removes the key, and a patched key is also dropped from the object's
  `passthrough` (so a wrong-shaped original does not reappear on download). `setNotifications` and `setQualityColors`
  drop the whole object when it ends up empty.
- Ids and timestamps come from `prepare` callbacks, so every reducer is a pure function of (state, payload).
- Selectors: `selectLibraryEntries`, `selectLibraryEntry(state, id)`, `selectEditor`, `selectEditorFilter`,
  `selectEditorRule(state, index)`, `selectDiagnostics(state, reference?)` (parse diagnostics + `validateLootFilter`).
  The validator's reference holds Sets, so it stays out of Redux: `useLootFilterReference()` loads the `lootfilter` and
  `types` game-data bundles and passes the reference to the selector (module-level cache keeps its identity stable).

`lootFilterSaga` (registered by `src/features/loot-filter/index.ts` when the route chunk first loads):

1. reads the library and dispatches `hydrate`;
2. 400 ms after the last editor edit dispatches `editorFlushed`, which serializes the model into the entry's `text`;
   `open`/`close` flush synchronously, and the editor screen dispatches `editorFlushed` on `pagehide`/`beforeunload`;
3. after every library change writes the library to localStorage.

The slice imports the engine's parser and serializer, so they are in the entry chunk (about 18 KB minified).

## Library screen

Title, a short how-to (launcher import, `sounds`/`icons` folders), and:

- **New filter**: a name dialog, then opens the editor on a blank filter (`formatVersion: 1`, `title` = name, one level
  `{ id: 1, name: 'Default' }`, `defaultLevel: 1`, no rules).
- **Upload**: a `.json` file read as UTF-8. A JSON syntax error shows a toast with the line and column and imports
  nothing; a file with diagnostics (unknown keys, wrong shapes) is imported and the editor lists them. The entry name is
  the file's `title`, else the file name.
- **Start from Sully's QoL**: fetches `public/loot-filters/sullys-qol.json` and opens it as a `template` entry. Credit
  line: "Sully's QoL filter, converted by the ESR author, bundled with permission".
- One card per entry (newest first): name, title/author and rule count (a quick JSON read of the text, cached), last
  update, and Open, Download (`<slug of name>.json`), Duplicate, Rename, Delete (with a confirm dialog). Empty state
  when the library is empty.

## Editor screen

Header row: back link, the filter name (pencil to rename inline), a problems chip ("N errors / M warnings"; click opens
the JSON tab and scrolls to the problems list) and **Download** (the serialized model). When the stored text is not
valid JSON, every tab but JSON shows a "cannot be read" card; Apply in the JSON tab recovers the filter.

| Tab      | Status      | What it does                                                                                                                                                                                                                                                       |
| -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rules    | placeholder | `RulesTab`: rule count, hiding rules, the selected rule. The rule builder replaces it.                                                                                                                                                                             |
| Styles   | placeholder | `StylesTab`: style names and how many rules use a style. The style editor replaces it.                                                                                                                                                                             |
| Settings | done        | Title, author, version, description, update URL, hide unmatched items, sound volume; filter levels (id + name, add/remove, default level, "used by N rules", ids rules use that are missing); drop line and level change line; one colour-code select per quality. |
| JSON     | done        | The serialized file in a textarea: Apply (parse; a syntax error shows line/column and selects the spot), Revert, Copy. Below it every problem with severity, path and message; a rule problem links to its rule (selects it, opens Rules).                         |
| Test     | placeholder | `TestTab`: rule and level counts. The test-item tab (engine `evaluate.ts`) replaces it.                                                                                                                                                                            |

Settings changes dispatch the slice reducers directly; the only local state is what a half-typed number needs
(`NumberInput`). A per-language text (`{ "enUS": …, "deDE": … }`) is shown read-only with "multi-language text, edit in
the JSON tab". Unknown keys appear in the problems list as warnings: they travel through unchanged, but only the JSON tab
can edit them.

## Phase status

| Phase | Content                                                                                       | Status  |
| ----- | --------------------------------------------------------------------------------------------- | ------- |
| 1     | Engine: model, JSONC parse with passthrough, serializer, validator, evaluator, sprite decoder | done    |
| 2     | `lootfilter.json` reference bundle (items, stats, areas, sounds, uniques, sets)               | done    |
| 3     | Library, routes, editor shell and state, Settings tab, JSON tab                               | done    |
| 4     | Rule builder with pickers, style editor, label preview                                        | planned |
| 5     | Test-item tab with a rule trace                                                               | planned |

## Verify in game

Assumptions the engine makes where the guide is silent (from the engine file headers):

- `activeInLevels` is a precondition: a rule inactive at the current level is skipped and never hides, not even with
  `hideIfOtherConditionsFail`.
- The `hideIfOtherConditionsFail` gate is `itemCodes`, `excludeItemCodes`, `itemTypes`, `excludeItemTypes` and
  `location`; every other condition is an "other condition".
- A hidden item keeps no label colours, border, icon, droplight, chat lines or sounds from earlier rules; its only chat
  line is the hiding rule's `chatMessageWhenHidden`. The hiding rule's other actions do not apply.
- `replaceName`, `namePrefix` and `nameSuffix` are each "later wins" on their own.
- `notify: true` prints the drop line unless the rule's effective actions (style included) have a `chatMessage`.
- `{name}` in every text, the drop line included, is the game's name, not the filter's changed name.
- A stat check without `param` holds when any entry of that stat satisfies it; an entry without param has param 0; a
  missing stat is one entry of value 0.
- `{stat:ID}` without a param shows the first entry of that stat; ID may also be an itemstatcost name.
- `{ethereal}` expands to `Ethereal` for ethereal items and to nothing otherwise.
- `hideUnmatchedItems` hides an on-ground item no rule applied to.
- Colour codes `ÿcN` to `ÿcV` use preview approximations (the guide gives no RGB for them).
- `.sprite` icons: header layout and RGBA pixel order as observed in `goldstar.sprite`; only the first frame is drawn.
- The serializer does not keep comments between rules (only the `//` lines before the object).
