# Feature research: loot filter editor

Status: **paused, waiting for the mod author** (decision of 2026-10-10, section 5). Branch `feat/loot-filter`.
ESR at the time of research: 3.2.12 (loot filters exist since 3.2.09).

## 1. The question

ESR supports its own loot filters (beyond the native D2R one that came with the Warlock update). The owner wants a
page where a player can create a filter from scratch or upload an existing one, edit it with real item names and
colours, keep several filters in the browser and download the result for the ESR Launcher.

## 2. What exists today

### 2.1 ESR's loot filter (since 3.2.09)

- A D2RLoader plugin (`d2rloader/plugins/d2rl-celestialrayone-loot-filter.dll`, author Celestialray) reads JSON filters.
  The launcher's **Loot Filter** tab imports a `.json`, copies the mod's filters to the player's folder, and keeps the
  selection in `selection.json`. Edits apply while the game runs. Patch note 3.2.09: "Added loot filter support in the
  ESRLauncher. I took the liberty to convert Sully's filter."
- Folders: shipped filters in `<game>\mods\<mod>\LootFilters\`; the player's own in
  `<Saved Games>\Diablo II Resurrected\mods\<mod>\LootFilters\`; sounds in a `sounds` folder next to the filter.
- Keys (Options > Controls > Loot Filter): _Next Filter Level_, _Show Hidden Items_. Console: `lootfilter`,
  `lootfilter reload`. Hidden items keep no ground label but stay on the ground and can be picked up.
- Config `d2rloader/config/celestialrayone.loot-filter.toml`: `enabled`, `default_filter`, `user_folder`,
  `file_sound_volume`, `announce`, `hidden_marker`.
- **There is no published schema.** Everything below is inferred from the one shipped filter
  (`LootFilters/sullys-qol.json`, 353 rules, 242 KB) and the comment block in the toml. The plugin DLL is closed.
- The file is JSON **with `//` comment lines** at the top (JSONC); a strict `JSON.parse` fails on it.

### 2.2 The Chinese fork (`AreChen/d2r-esr-runeword-browser-zh`, `/loot-filter`)

- Edits the **D2RLAN Lua format** (`lootfilter_config.lua`: `filter_titles`, `audioPlayback`, `notify`, `prefix`,
  `{gold}` colour tags), not the ESR JSON. Its parser is a Lua-table scanner that keeps the source text and patches
  the edited values back in; it downloads Lua again.
- UI worth borrowing: one rule list with per-rule edit panel, style presets, label preview rendering the colour codes,
  optional mp3 upload to preview sounds, filter source persisted in `localStorage`.
- Not reusable as code for our target format, but a good UX reference.

### 2.3 What our app already has

- `public/game-data/bases.json`: every weapon/armor base with its 3-letter `code`, type ancestors and tier.
- `public/game-data/sources.json`: unique / set / misc items with `code` (the base code for uniques and sets).
- ESR clone tables not yet bundled but available: `misc.txt` (runes, gems, charms, materials, scrolls, maps),
  `itemstatcost.txt` (stat ids such as 96 FRW, 93 IAS, 105 FCR, 14 gold, 188 skill tab), `levels.txt` (area ids such as
  1, 40, 75, 103, 109 = the towns), `itemtypes.txt`.
- `usePersistentState` for browser storage; Supabase builds feature as a model for later cloud sharing.

## 3. The format as observed (Sully's QoL, formatVersion 1)

Top level: `formatVersion` (1), `title`, `author`, `version`, `description`, `filterLevels` (`[{id, name}]`, four
levels: Leveling, Strict, Very-Strict, Uber-Strict), `defaultLevel`, `rules[]`.

Rule matchers (all optional; a rule with none matches everything, one such rule exists):

| Key                             | Shape seen                                                                      | Note                                    |
| ------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| `itemCodes`                     | `string[]`                                                                      | base codes from weapons/armor/misc      |
| `quality`                       | `"unique"\|"set"\|"rare"\|"magic"\|"superior"\|"normal"\|"inferior"` or `{max}` | `{min}` presumably also works           |
| `baseTier`                      | `0\|1\|2` or `{max}`                                                            | 0 normal, 1 exceptional, 2 elite        |
| `sockets`                       | number or `{min}`/`{max}`                                                       |                                         |
| `isRuneword`, `isFullySocketed` | boolean                                                                         |                                         |
| `itemStats`                     | `[{stat, op, value, param?}]`                                                   | all must hold; `op` is `>=`, `<=`, `==` |
| `itemStatsAnyOf`                | same                                                                            | any may hold                            |
| `playerStats`                   | `[{stat, op, value}]`                                                           | stat 12 = character level               |
| `location`                      | subset of `stored`, `atVendor`, `equipped`, `onGround`                          |                                         |
| `excludeAreas`                  | `number[]`                                                                      | level ids                               |
| `activeInLevels`                | `number[]`                                                                      | filter level ids; absent = all levels   |

Rule actions (57 rules have matchers only, so an action-less rule is legal; it probably stops lower rules or is a no-op):

| Key                                       | Shape seen                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `hide`                                    | `true`                                                                                                                         |
| `replaceName`, `namePrefix`, `nameSuffix` | string with `ÿc?` colour codes, `\n` line breaks, placeholders                                                                 |
| `chatMessage`                             | string                                                                                                                         |
| `sound`                                   | file name in `sounds/` (`gong.mp3`, `map.mp3`, `mid.mp3`, `mythical.mp3`, `other.mp3`, `t5_map.mp3`, `tink.mp3`, `unique.mp3`) |
| `labelBackground`                         | `[r, g, b, a]`                                                                                                                 |
| `labelBorder`                             | `{color: [r, g, b, a], width}`                                                                                                 |

Placeholders seen: `{name}`, `{sockets}`, `{baseTier}`, `{stat:N}`. Colour codes seen: `ÿc0`–`ÿc6`, `ÿc8`, `ÿc9`,
`ÿc;`, `ÿcA`, `ÿcP` (the D2 colour-code set). A name of `$$` appears in `replaceName` (meaning unknown; it may stand
for "the original name" in the converter's output).

Unknown and needed before building: rule precedence (first match wins, last wins, or all matching rules merge),
whether an action-less rule stops processing, `{min}` support everywhere, the full key list (ethereal, item level,
item type/class instead of codes, unique/set ids, gold amount, map tier?), the full placeholder list, how `sound`
interacts with `sounds.txt` entries, whether `activeInLevels` absent means all levels, how multi-line names render,
and whether `formatVersion` 1 is frozen.

## 4. Questions for the mod author (to send)

> Hi, I'm building a loot-filter editor into the ESR Runeword Browser (web app) so players can create or upload a
> filter and edit it with item names, colour pickers and a label preview, then download the JSON for the launcher.
> I only have `sullys-qol.json` and the toml comment to go on. Could you share, or point me at, the plugin's filter
> schema? Specifically:
>
> 1. The complete list of rule keys and value shapes (matchers and actions), beyond what Sully's filter uses.
> 2. Rule order semantics: first match wins, last wins, or do all matching rules stack? Does a rule with matchers
>    but no action do anything?
> 3. Do `{min}` / `{max}` objects work for every numeric matcher (`quality`, `baseTier`, `sockets`, others)?
> 4. The placeholder list for names/messages (`{name}`, `{sockets}`, `{baseTier}`, `{stat:N}` seen) and what `$$`
>    means in `replaceName`.
> 5. Can rules match by item type (`itemtypes.txt` code), unique/set id, ethereal, item level, or player class?
> 6. `sound`: only files from `sounds/`, or also `sounds.txt` entries? Any size/format limits?
> 7. Is the leading `//` comment block part of the format (JSONC), and will `formatVersion` 1 stay stable? Will
>    unknown keys be ignored or rejected?
> 8. Is it okay to offer Sully's filter and the shipped mp3 files as templates inside the app, with credit?
>    Happy to share the editor for testing before release.

Where to ask: the ESR Discord (linked from easternsunresurrected.com) or a GitHub issue on
`CelestialRayOne/Eastern_Sun_Resurrected`.

## 5. Decisions (owner, 2026-10-10)

| Topic           | Decision                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Format          | ESR launcher JSON only. No D2RLAN Lua (a converter may come later).                                           |
| Storage         | Browser only (`localStorage`) plus download/upload. Cloud sharing not now.                                    |
| Editor          | Rule builder with pickers and a label preview, plus a synced raw JSON tab.                                    |
| Starting points | Blank filter, or upload. Nothing bundled (no Sully's, no presets).                                            |
| Rule scope      | Every key seen in Sully's filter, in phase 1.                                                                 |
| Sounds          | File-name field with the 9 known names as suggestions; optional local mp3 upload to preview. Nothing bundled. |
| Spec risk       | **Ask the mod author first; the build waits for the answer.**                                                 |
| Library         | Several named filters per browser: create, upload, duplicate, rename, delete.                                 |

## 6. Design sketch (for when the answers arrive)

- Route `/loot-filters` (library) and `/loot-filters/:id` (editor), header entry "Loot filters". Uses only the static
  bundles, so it bypasses the HTM loading gate like `/guide`.
- Feature folder `src/features/loot-filter/`: `engine/` (schema types, JSONC parse that keeps unknown keys and reports
  them, serialize with stable key order, validation with per-rule diagnostics), `build/` (new bundles generated from
  the ESR clone: misc item codes with names, stat ids with names, area ids with names; added to `game-data:generate`),
  `components/` (rule list, matcher editors with item pickers by name, action editors, colour picker, label preview
  rendering `ÿc` codes, sound field), `screens/` (library, editor), `hooks/` (persistent library).
- Unknown keys travel untouched from upload to download and show as "not editable here".
- Tests: parser round-trip on Sully's filter (byte-stable apart from comments), validation cases, preview rendering.
- Phase 2 candidates: Lua import, cloud save and sharing, presets, bundled sounds (needs the author's okay).

## 7. Sources

- ESR repo: `LootFilters/sullys-qol.json`, `d2rloader/config/celestialrayone.loot-filter.toml`, `patchnotes/3.2.09.md`,
  `d2rloader/metadata.json` (D2RLoader 1.3.1).
- Fork: `../d2r-esr-runeword-browser-zh/src/features/loot-filter/` (parser, presets, preview, screen).
- Web search for a D2RLoader filter spec found nothing relevant (only Median XL, PD2, PoD and native D2R filter pages).
