# Game Data Feature

Static data built from the ESR mod's raw game tables (`data/global/excel/*.txt`) instead of the HTM documentation pages.
A Node script converts the tables into JSON bundles at build time; the pages read them lazily. The original plan and
per-phase implementation notes live in `builds-feature-docs/FEATURE-GAME-DATA.md`.

## Overview

| Route                  | Tab        | Status               |
| ---------------------- | ---------- | -------------------- |
| `/game-data`           | —          | redirects to `bases` |
| `/game-data/bases`     | Bases      | done                 |
| `/game-data/types`     | Item Types | done                 |
| `/game-data/best-base` | Best Base  | done                 |
| `/game-data/affixes`   | Affixes    | done                 |

The game-file data is a second data system next to the HTM pipeline: it is never stored in IndexedDB and never parsed
in the browser. Uniques, sets, gemwords and the runeword list stay on the HTM pipeline.

## Data bundles

A Node script converts a local clone of `CelestialRayOne/Eastern_Sun_Resurrected` into JSON files committed under
`public/game-data/`. The browser never parses txt files and never stores this data in IndexedDB; it fetches the JSON
lazily (`src/features/game-data/engine/browser/loadGameData.ts`).

| File             | Contents                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`  | schema, ESR version / tag / commit, `generatedAt`, sha256 + size per file, counts, warnings                                      |
| `types.json`     | item types (Equiv parents, ancestors, socket caps per ilvl band, class, UI/runeword categories) + 8 classes with skill-tab names |
| `bases.json`     | spawnable weapons (369) and armors (255) plus 29 equippable accessories (rings, amulets, charms, jewels)                         |
| `runewords.json` | runes.txt runeword recipes: 391 `Runeword*` keys with 449 rows and rendered stats (see "Runewords")                              |
| `affixes.json`   | 2533 spawnable magic prefixes, suffixes and automods with rendered text (see "Affixes")                                          |

Arrays are written one element per line so diffs stay readable. Bundle URLs carry the manifest hash (`?v=<sha256>`);
the manifest itself is always revalidated. The shape is defined in `src/features/game-data/engine/schema.ts`
(`GAME_DATA_SCHEMA`); bump it whenever a bundle shape changes incompatibly.

| Bundle           | ESR 3.2.10 size (raw / gzip) |
| ---------------- | ---------------------------- |
| `types.json`     | 44 KB / 5 KB                 |
| `bases.json`     | 292 KB / 26 KB               |
| `runewords.json` | 197 KB / 27 KB               |
| `affixes.json`   | 785 KB / 57 KB               |

### Bases and types

- Weapons/armor: `spawnable == 1` and `quest` blank/0 (ESR has hundreds of non-spawnable shadow bases used by uniques).
- misc: same filter, and only when the type ancestors include `ring`, `amul`, `char`, `jewl`, `bowq` or `xboq`.
- Tier: position of `code` in `normcode` / `ubercode` / `ultracode`. A self-referential family is "mythical" when qlvl ≥ 90
  (ESR mythical bases are qlvl 96/100), otherwise "normal" (rings, charms, jewels, arrows have no tier family).
- Socket caps: `min(gemsockets, MaxSockets1/2/3)` of the base's own `type`, bands `ilvl ≤ 25` / `≤ 40` / above.
- Names: `namestr` resolved through the string tables; mythical bases whose string lacks "Mythical" use the `name` column.
- Exact duplicates (all fields except `code`/`family` equal) are dropped, keeping the first row.
- Type names: itemtypes `ItemType` column. When two types share a name, the type without bases of its own gets
  " (code)" appended (`merc` → "Helm (merc)", `helm` stays "Helm"); when all or none of them have bases, all do
  ("Gem Can 1 (can1)" / "Gem Can 1 (can9)").

### Runewords

`build/bundleRunewords.ts` writes `runewords.json` (`TxtRunewordsBundle`) from `runes.txt`:

- Every row whose `Name` starts with `Runeword` (ESR 3.2.10: 391 keys, 449 rows; 379 rune-based keys, 12 gem-only keys
  such as America or ArchDimeron, which the site lists on gemwords.htm). Other runes.txt rows (Holy, Rainbow, …) are
  charm gemwords and are skipped.
- One `TxtRuneword` per key (file order) with its rows in file order. A key has several rows when the recipe accepts
  extra sockets: one row per socket count and filler, with `jew` (Jewel) or `mjw` (Mythical Jewel) prepended.
- Per row: `codes` = raw `Rune1-6` codes incl. jewels; `ingredients` = display names without jewels; `jewels` = jewel
  count; `sockets` = number of codes; `itypes`/`etypes` as in the file; `reqLvl` = max misc.txt `levelreq` over all codes
  (jewels are 0).
- Names: the runeword name is the `Name` key resolved through strings (the `*Rune Name` column is a comment and is
  unreliable); ingredient names are misc.txt `namestr` → strings, kept raw ("Eth Rune", "Perfect Sapphire") exactly as
  the HTM parser stores them. `r19` and `r68` both resolve to "Ko Rune", so recipes are compared by display name.
- `text`: the runeword's own stats rendered from `T1Code1-7` by the stat renderer (rune bonuses not included).

### Affixes

`affixes.json` (`AffixesBundle`, ~785 KB / 57 KB gzip) holds the spawnable rows of `magicprefix.txt` (kind `p`),
`magicsuffix.txt` (`s`) and `automagic.txt` (`a`): ESR 3.2.10 → 2533 affixes (885 / 1509 / 139). Per affix: `id` (0-based
row index within its file, unique together with `kind`), string-resolved `name`, `lvl`, `maxLvl`, `reqLvl`, `cls`
(`classspecific`), `reqCls` + `clsReqLvl` (`class` / `classlevelreq`), `freq`, `group`, `rare`, `itypes`, `etypes`,
structured `mods` and rendered `text`. Rows with `spawnable != 1` are dropped (`counts.affixesDropped`, 106); automagic
placeholders named "null" are kept with an empty name when a stat is visible, otherwise dropped
(`counts.affixesPlaceholdersDropped`, 4). `runewords.json` rows also carry `text`, rendered from `T1Code1-7`.

## Regenerating

Recommended: one command after an ESR release.

```bash
npm run game-data:update                       # clone/pull ESR main, generate, fixtures, tests, check, summary
npm run game-data:update -- --tag 3.2.10       # pin a specific release tag (detached HEAD)
npm run game-data:update -- --no-fixtures      # skip re-downloading the HTM test fixtures
npm run game-data:update -- --esr <dir>        # use another clone directory
```

`scripts/update-game-data.ts` steps:

1. **ESR clone**: when the directory is missing it creates a shallow, blobless, sparse clone (excel tables, strings,
   `d2rloader/metadata.json`, `docs/weapons.htm`, `docs/armors.htm`). Otherwise it aborts if the clone is dirty or on a
   branch other than `main`, fetches `main` and fast-forwards (a detached HEAD from an earlier `--tag` run goes back
   to `main`); with `--tag` it fetches that tag and checks it out detached. It does not run `git fetch --tags`: on a
   shallow clone that downloads the full history of every old release; the tag pointing at the new HEAD is fetched
   instead. Works with plain (non-sparse) clones too.
2. Records the previous `manifest.json`.
3. Runs `generate-game-data.ts --esr <dir>`. A failure skips the verify step and exits 1.
4. Runs `fetch-test-fixtures.js` (skippable with `--no-fixtures`). A download failure is only a warning; tests that
   need a missing fixture skip themselves.
5. Runs `npx vitest run src/features/game-data` (with `ESR_SOURCE_DIR` set to the clone) and `--check`.
6. Prints a summary: version/tag/commit before → after, changed counts (incl. warnings), generator warnings, step
   results and changed files under `public/game-data/`, then the commit command to run. It never runs `git add`/`commit`.

Manual fallback:

```bash
npm run game-data:generate   # writes public/game-data/*.json
npm run game-data:check      # exits 1 when the committed files are stale
```

Source directory: `--esr <dir>`, else `ESR_SOURCE_DIR`, else `../Eastern_Sun_Resurrected` (relative to the repo root).
The script reads `d2rloader/metadata.json` (mod version), the commit (`git rev-parse HEAD`) and the exact tag
(`git describe --tags --exact-match`, `null` when HEAD is not tagged). `generatedAt` only changes when a file hash
changes, so regenerating unchanged data produces no diff.

A minimal clone only needs (this is what `game-data:update` creates):

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/CelestialRayOne/Eastern_Sun_Resurrected.git
git -C Eastern_Sun_Resurrected sparse-checkout set --no-cone /Eastern_Sun_Resurrected.mpq/data/global/excel/ \
  /Eastern_Sun_Resurrected.mpq/data/local/lng/strings/ /d2rloader/metadata.json /docs/weapons.htm /docs/armors.htm
```

(`docs` is only needed for the clone-dependent name oracle test.)

### Bumping the ESR version (manual)

1. `git -C ../Eastern_Sun_Resurrected fetch --tags && git -C ../Eastern_Sun_Resurrected checkout <tag>` (tags have no `v` prefix, e.g. `3.2.10`)
2. `npm run game-data:generate` and read the printed counts and warnings
3. `npm run test` (the bundle integrity test expects 369 weapons / 255 armors; update the numbers if ESR changed them on purpose)
4. Commit `public/game-data/` together with any code changes

The script warns when the clone has uncommitted changes, because the output would then not match the recorded commit.

## Pages

### Routes, layout and loading

| Route                  | Screen            | Notes                                                             |
| ---------------------- | ----------------- | ----------------------------------------------------------------- |
| `/game-data`           | `GameDataLayout`  | Redirects to `bases`. Title, version banner, sub-tabs, `<Outlet>` |
| `/game-data/bases`     | `BasesScreen`     | Base item browser                                                 |
| `/game-data/best-base` | `BestBaseScreen`  | Best base finder                                                  |
| `/game-data/affixes`   | `AffixesScreen`   | Affix browser and what-can-roll                                   |
| `/game-data/types`     | `ItemTypesScreen` | Item type tree and socket-cap table                               |

One header entry ("Game Data", `end: false`). All screens are lazy-loaded from `@/features/game-data` (the route
code-splitting guard test covers it). The four child routes are in `public/sitemap.xml`.

**Version banner** (`components/GameDataVersionBanner.tsx`): "Game files: ESR {esrVersion} (tag {esrTag} @ {commit7},
generated {YYYY-MM-DD})" from `loadManifest()`. When Dexie `metadata.esrVersion` (the HTM docs version) exists and differs,
an amber note says "Docs data is ESR X; game-file data is ESR Y — some details may differ." It never says which is newer.

`hooks/useGameData(files)` returns `{ status: 'loading' | 'ready' | 'error', data, error, retry }` on top of
`loadGameDataFile` (module-level promise cache; failed promises are evicted so `retry` refetches). Loading shows the same
spinner as the route fallback (`GameDataLoading`). Errors show `GameDataError`: a Card with the message and Retry; a
`GameDataSchemaError` shows "Game data out of date" with a "Reload page" button instead. The Bases and Item Types pages
load `types` + `bases`; Best Base also loads `runewords`.

### State

`store/gameDataSlice.ts`, registered statically as `gameData` (no saga). Bases filters (`bases: BaseFilters`):

| Field             | Meaning (empty list / null = no filter)                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search`          | Debounced (300 ms) text; `parseSearchTerms` AND semantics over name, type name, type2 name, code                                                                                                              |
| `kinds`           | `weapon` / `armor` / `misc` (multi)                                                                                                                                                                           |
| `tiers`           | `normal` / `exceptional` / `elite` / `mythical` (multi)                                                                                                                                                       |
| `types`           | Item-type codes (multi); a base matches when any selected code is in `base.ancestors`, so a parent type (e.g. `mele`) matches all subtypes                                                                    |
| `minSockets`      | `max(socketCaps) ≥ n` (1–6)                                                                                                                                                                                   |
| `maxReqLvl`       | `reqLvl ≤ n`                                                                                                                                                                                                  |
| `classOnly`       | `any` (no filter), `none` (only bases without a class restriction), or a class code (only that class's bases)                                                                                                 |
| `sort`, `sortDir` | `name`, `qlvl` (default, ascending), `reqLvl`, `dmg` (average of 2H, else 1H, else throw), `def` (max defense), `speed`. Ties break by name; bases without the metric (e.g. damage on armor) always sort last |

The Item Types page `?type=` focus is URL-only.

Best Base fields:

`gameData` slice additions:

| Field                      | Meaning                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `character`                | `{ cls: ClassCode \| 'any'; level; str; dex }`, default `{ any, 99, 100, 100 }`    |
| `bestBase.includeUnusable` | List bases the character cannot use yet (with deficits)                            |
| `bestBase.ethereal`        | Ethereal estimate (vanilla: −10 Str/Dex, ×1.5 damage/defense; not for accessories) |
| `bestBase.selected`        | `{ name, variant }` of the HTM runeword                                            |
| `bestBase.txtKeyOverride`  | Manually picked txt key; reset by `setBestBaseRuneword` when the selection changes |

`character` is restored with `readPersistentJson('gameData.character', isCharacter)` in the initial state and written
with `writePersistentJson` inside `updateCharacter`, which merges a partial update and clamps the numbers
(`store/character.ts`). The toggles and selection are not persisted.

### Bases page

Filters row (search, min sockets, max req level, Copy Link), a second row (kind and tier checkboxes, class select, sort
select + direction toggle, Reset), and an item-type picker styled like the runeword `ItemTypeFilter`. The picker lists every
type that is some base's primary `type`, grouped into Weapons / Class weapons / Armor / Class armor / Accessories / Class
accessories; nothing selected means all types. Codes selected via a link that are not in the picker (parent types such as
`mele`) appear as removable chips.

Each base is a Card (grid like the runewords page): name, tier badge, type (and type2) name and code, class-only /
automod group / indestructible badges, damage 1H / 2H / throw, defense, block, speed (weapons), requirements, str/dex
damage bonus, socket caps as "N (ilvl ≤ t1) / N (≤ t2) / N" using the thresholds of the base's own type (one number when
all bands are equal), quality level, and the N/X/E family where other members are clickable and set the search to
`"<name>"`. The first 100 results render; "Show more" adds 100 at a time (reset when filters change).

#### URL params

Read once on mount by `hooks/useBasesUrlState.ts` (same pattern as runewords `useUrlInitialize`): when any bases param is
present, the decoded params replace the whole filter state (missing ones fall back to defaults) and are removed from the
URL. The Copy Link button builds the URL from the current filters (`encodeBaseFilters`, only non-default values).

| Param     | Field          | Format                                           |
| --------- | -------------- | ------------------------------------------------ |
| `search`  | search         | text (shared key)                                |
| `sockets` | minSockets     | 1–6 (shared key)                                 |
| `maxlvl`  | maxReqLvl      | 1–999 (shared key)                               |
| `kind`    | kinds          | comma list                                       |
| `tier`    | tiers          | comma list                                       |
| `type`    | types          | comma list of type codes (unknown codes dropped) |
| `cls`     | classOnly      | `none` or a class code                           |
| `sort`    | sort + sortDir | `dmg` ascending, `-dmg` descending               |

Keys are per page (`constants/urlParams.ts`; `search`, `sockets` and `maxlvl` are the app-wide shared keys), so `cls`, `type`
and `sort` mean the same kind of filter on Bases and Affixes.

### Item Types page

A collapsible tree of the Equiv graph: roots are types without parents; a type with two parents appears under both
(expansion is keyed by code, so it opens in both places). Each node shows name, code, class, UICategory, runeword
categories, max sockets per band with thresholds, and a link to the Bases page with `?type=<code>` labelled with the number
of bases of exactly that type (`type` or `type2`) plus the count including subtypes when different. Expand all / Collapse all.
`?type=<code>` expands the type's ancestors, highlights the node and scrolls to it. Below the tree, a "Socket caps" table
lists every type that has at least one base.

### Best Base page

`/game-data/best-base` (`screens/BestBaseScreen.tsx`) loads the `types`, `bases` and `runewords` bundles via `useGameData`
and the HTM runewords from Dexie (`useLiveQuery(() => db.runewords.toArray())`). Gemwords are not loaded: the docs list
734 gemword rows, almost none of which are txt runewords, so they would flood the consistency list; the 12 gem-only txt
recipes therefore show up as "unmatched txt".

Top row: a cmdk **runeword picker** (`components/ComboPicker.tsx`, every query term must appear in name, recipe or
allowed items; variant number shown for multi-variant names; first 100 hits) and the Copy Link button. Second row: the
**character form** (`components/CharacterForm.tsx`): class (Any + the 8 classes from `types.json`), level 1–99,
Strength and Dexterity 0–999, and the toggles "Include bases I can't use yet" and "Ethereal (estimate)".

For the selected runeword the page shows the name, socket badge, recipe and allowed/excluded items, a "Game files:
RunewordNNN (exact match) · 2–6 sockets" line, a collapsible **Game-file stats** block (`TxtRunewordRow.text` of the
used rows; rows with identical lines merged by `gameFileStats`, one block per distinct line set labelled
with its socket counts; rune bonuses not included), then the results:

1. `resolveTxtSource` picks the txt rows: a manual pick (`txtKeyOverride`) wins, else the match; rows are narrowed to
   the HTM socket range with `rowsForSockets` (all rows when none fall in the range).
2. `findEligibleBases` with the character and toggles, then `buildBaseGroups`: `rankBases` per kind (weapons, armor,
   accessories) and `groupByType`; groups are ordered by their best base.
3. Each group shows "Type name (count)" and the best 3 bases; "Only showing the best 3, show all N" expands it.

`components/EligibleBaseCard.tsx`: name, tier badge, "Eth estimate" badge, class-only badge, damage (1H/2H/throw) or
defense/block after the ethereal estimate, speed, requirements (effective level = max(base, runeword), Str/Dex after
the ethereal −10) with deficits in red "(+12)", sockets as one line per socket count — rows for Jewel and Mythical
Jewel are collapsed (`collapseRowsBySockets`: "4 sockets (1 Jewel or 1 Mythical Jewel)") with "needs ilvl ≥ N for N"
when the base needs a higher item level — and "Upgrade: <next tier>" linking to `/game-data/bases?search="<name>"`.
Unusable bases (only listed with the toggle) are dimmed.

A red banner appears when the runeword's level requirement (lowest of the used rows) exceeds the character level.
When nothing qualifies, the empty state explains the funnel (`summariseRejections`): of N bases, X have a fitting item
type, Y of those can have enough sockets, Z are allowed for the class, W meet level/Str/Dex.

#### URL params

Read once on mount by `hooks/useBestBaseUrlState.ts`, dispatched to the slice, then removed from the URL.

Read once on mount by `hooks/useBestBaseUrlState.ts`, dispatched to the slice, then removed from the URL. Unlike the
Bases page, missing params do not reset anything: the character fields present override (and persist) the stored
character, the rest is kept.

| Param | Field            | Format                                |
| ----- | ---------------- | ------------------------------------- |
| `rw`  | selected.name    | HTM runeword name                     |
| `v`   | selected.variant | number (default 1)                    |
| `cls` | character.cls    | `any` or a class code (`ama` … `war`) |
| `lvl` | character.level  | 1–99                                  |
| `str` | character.str    | 0–999                                 |
| `dex` | character.dex    | 0–999                                 |

Copy Link writes `rw` + `v` and the character fields that differ from the defaults. Every runeword card has a hammer
icon ("Find best base") linking to `/game-data/best-base?rw=<name>&v=<variant>`; it carries no character params, so the
stored character is kept.

### Affixes page

`/game-data/affixes` (`screens/AffixesScreen.tsx`) loads `types`, `bases` and `affixes`. It has two modes, switched by the
selected base (`base` in the slice / URL). Every Bases page card links to `/game-data/affixes?base=<code>`
("What can roll").

State (`gameData.affixes`): `search`, `kinds` (`p`/`s`/`a`, empty = all), `rareOnly`, `minLvl`/`maxLvl` (1–99 or
null), `cls` (`any` / `none` / class code), `types` (item-type codes), `base` (base code or null), `ilvl` (1–99, default
99), `quality` (`magic` default / `rare`), `includeAutomagic` (default true), `sort` (`name` / `lvl` default / `group` /
`freq`), `sortDir`. "Reset filters" resets everything except `base`, `ilvl`, `quality` and `includeAutomagic` (it stays
in the current mode); "Clear base" returns to browse mode.

#### Browse mode (no base)

All filters combine with AND:

- **search**: `parseSearchTerms`; every term must appear in the name or a rendered `text` line.
- **kind**, **rare only**.
- **class**: `none` = affixes without `classspecific`; a class = only that class's affixes.
- **level range**: the affix span `[lvl, maxLvl]` (maxLvl 0 = up to 99) overlaps `[minLvl, maxLvl]`.
- **item types**: a flat picker of the types that occur in any affix's itypes. An affix matches when any selected code is
  in its `itypes` and none is in its `etypes` (codes only, no ancestor walk).
- **sort**: name, affix level, group or frequency, ascending/descending; ties by name.

Cards (`components/AffixCard.tsx`) show name, badges, level / required level / group / frequency, the stat lines and
"Can appear on … except …". Lists page with "Show more" (200 at a time).

#### What-can-roll mode (`base` set)

`eligibleAffixes({ affixes, base, ancestors: base.ancestors, ilvl, quality, includeAutomagic })`; the panel
(`components/AffixRollPanel.tsx`: base picker, item level input + slider, Magic/Rare, automods) shows "Affix level N at
ilvl X on Base (qlvl Q)". Prefixes and suffixes are shown side by side, automods below (or "has no automod pool"). Each
section is sorted by group, then affix level, with a header per group ("Group N · summed % · one affix per group"); every
card shows its weight (`freq / Σfreq` within its kind, over all eligible affixes, before the page filters). Search, kind,
rare-only and class still apply on top; the level range, item types and sort are hidden and ignored. Each section has its
own "Show more".

#### URL params

Read once on mount by `hooks/useAffixesUrlState.ts`, then removed from the URL (like the Bases page); Copy Link encodes
the non-default values. Invalid values fall back to the defaults; unknown type and base codes are dropped.

| Param    | Field            | Format                                        |
| -------- | ---------------- | --------------------------------------------- |
| `search` | search           | text (shared key)                             |
| `aff`    | kinds            | comma list of `p`, `s`, `a`                   |
| `rare`   | rareOnly         | `1`                                           |
| `minlvl` | minLvl           | 1–99                                          |
| `maxlvl` | maxLvl           | 1–99 (shared key)                             |
| `cls`    | cls              | `none` or a class code                        |
| `type`   | types            | comma list of type codes                      |
| `base`   | base             | base code → what-can-roll mode                |
| `ilvl`   | ilvl             | 1–99 (default 99)                             |
| `q`      | quality          | `rare` (default magic)                        |
| `auto`   | includeAutomagic | `0` hides automods (default shown)            |
| `sort`   | sort + sortDir   | `name`/`lvl`/`group`/`freq`, `-` = descending |

## Runeword matching

`engine/matchRunewords.ts` maps each HTM runeword (`name::variant`) to a txt key. Names are normalised on both sides
(colour codes stripped, NFKD without diacritics, apostrophes unified, lowercase, whitespace collapsed); ingredients
additionally lose a trailing " rune" / " gem". Passes: 1 exact ordered recipe, 2 same multiset, 3 name unique on both
sides ("recipe differs"). Jewels are on neither side, so every per-socket HTM row of a recipe matches the same key;
`rowsForSockets` picks the rows inside the HTM `sockets`–`socketsMax` range.

29 names (Rain, Dream, Shinigami, …) have several txt keys with the same recipe that differ only in item types. When
`typeNames` (type code → name from `types.json`) is passed, such ties are narrowed to the key whose itype/etype names
equal the HTM allowed/excluded items (`tors` reads "Body Armor" on the site, and " (code)" suffixes are ignored);
otherwise the match carries all tied keys and their rows.

Against the 2026-10 fixture: 409/409 HTM rows match exactly, no ties remain, and the 12 unmatched txt keys are the
gem-only recipes, all found on gemwords.htm.

### In the Best Base page

`matchRunewords(htm, txtBundle, { typeNames })` runs on every render of the finder (React Compiler memoises it; ~400
HTM rows). `typeNames` is built from `types.json` so ties between txt keys (Rain, Shinigami, …) are narrowed by allowed
items.

- **No match**: amber notice "Not in game files (ESR {manifest version}); docs are ESR {Dexie version}" and a second
  cmdk picker over all txt runewords (name, key, recipe, socket range). The pick is stored as `txtKeyOverride` and
  cleared when another runeword is selected; "Clear manual pick" removes it.
- **Match quality `multiset` / `name-only`**: blue info badge "recipe differs in game files".
- **Data consistency** (collapsible `<details>` at the bottom): matched count, unmatched HTM rows (name, variant,
  recipe) and unmatched txt keys.

### Best base engine

`engine/bestBase.ts` (pure): `findEligibleBases({ rows, bases, types, character, options })` keeps a base when its
ancestors hit an itype and no etype, `max(socketCaps) ≥ row.sockets` (reports `minIlvlForSockets` from the base's own
type thresholds), and the class lock allows the character (`cls: 'any'` disables it). Each base appears once with the
fewest-socket qualifying row (`rows` lists all). `effectiveReqLvl = max(base.reqLvl, row.reqLvl)`; bases above the
character's level/str/dex are dropped unless `includeUnusable`, which returns them with `deficits`. `ethereal` lowers
str/dex by 10 (min 0) and scales damage/defense ×1.5 rounded down (`estimate: true`; misc bases are unaffected).
`rankBases(results, kind)`: weapons by the higher of 1H/2H average damage (throw damage as fallback), then speed (lower
first), then str + dex; armor by max defense, then block, then str; accessories by required level; ties by name.
`groupByType` groups by the immediate `type`; `upgradePath` returns the next family tier when it is a known base.

## Stat renderer

The renderer lives in `build/stats/` and runs at build time only:

| Module              | Role                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tables.ts`         | Typed rows of properties, itemstatcost, propertygroups, skills, skilldesc, charstats, monstats, montype                        |
| `expandProperty.ts` | Property code + param/min/max → stat entries via properties `func1-7` (unsupported funcs → `code param min-max` + warning)     |
| `descfunc.ts`       | One stat → text by itemstatcost `descfunc` (descstrpos/neg by sign, descstr2, descval placement; printf strings via `sprintf`) |
| `renderLines.ts`    | Sums identical stats, merges damage pairs, collapses `dgrp` sets, hides descfunc 0, sorts by `descpriority`                    |
| `propertyGroups.ts` | propertygroups.txt pools → "One of:" / "N-M of the following:" + options with their chance                                     |
| `skills.ts`         | Skill name/id → display name (skilldesc `str name`), owning class; class strings from charstats                                |
| `sprintf.ts`        | `%d %+d %i %s %%`, positional `%0`-`%9`; ranges like the docs pages: `+(10 to 20)`, `(10 to 20)%`, `-(10 to 20)`               |
| `statRenderer.ts`   | `createStatRenderer(tables, strings).renderMods(mods) → { lines, warnings }`                                                   |

Rules taken from the docs pages (`statRenderer.oracle.test.ts`) rather than vanilla D2:

- Ranges read "+(10 to 20)" (prefixes.htm / suffixes.htm style).
- Fixed fire/lightning/cold/poison/bleed min+max merge into "Adds X-Y … Damage" (rolled ranges stay separate minimum /
  maximum lines, as on the affix pages); min = max reads "Adds 75 …"; cold adds
  " over N Seconds" (length / 25); poison shows `value × length / 256`. Physical and magic min/max stay two lines.
- A `skill` and an `oskill` of the same skill read "+N to Skill (All Classes)" with N the sum.
- Per-level stats (`op` 2/4/5) show `value / 2^op param` (e.g. "+0.625 to Strength (Based on Character Level)").
- Multi-line strings (`\n`) are drawn bottom-up, so their lines are reversed. ESR's mythical descriptions
  (`item_mythicaldesc`, descfunc 23, format `.%1%0` with the text in monstats `NameStr`) drop the value and the leading dot.
- A `dgrp` set is the stats sharing `dgrp` + `dgrpstrpos` (ESR puts min and max elemental damage into one dgrp).

### Affix eligibility

`engine/affixEligibility.ts`: `affixLevel(ilvl, qlvl, magicLvl)` (vanilla formula) and `eligibleAffixes({ affixes, base,
ancestors, ilvl, quality, includeAutomagic })` → `{ alvl, prefixes, suffixes, automagic }` with `weight = freq / Σfreq`
per kind. Rules: `lvl ≤ alvl`, `maxLvl == 0 || alvl ≤ maxLvl`, an itype among the ancestors and no etype, `rare` for rare
items, `freq > 0`, class lock (base without class, affix without class, or the same class); automods by
`group == base.autoGroup` on any quality.

### Oracle

`statRenderer.oracle.test.ts` renders the runeword stats of every matched HTM runeword (and gem-only recipes via
gemwords.htm) and looks each line up in the HTM bonus lines (union of the three columns; both sides lowercased,
whitespace collapsed, colour codes, dashes, apostrophes and a trailing period normalised; the txt lines get the docs
parser's wrapped-line merge). It prints the identical share and the 40 most frequent mismatches. 2026-10-09: 96.5 %
(2882/2985); the floor is 94.5 %. Remaining differences: rolled runeword ranges (the docs show only the maximum), docs vs game
file version drift (docs 3.2.02, game files 3.2.10: changed values and mythical texts), and lines the docs parser puts
in the rune-bonus group.

## Warnings

Warnings are printed and stored in `manifest.warnings`; string conflicts are printed only (their number is in
`counts.stringConflicts`). Warnings do not fail the build.

| Warning                                                  | Meaning                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string "<key>": kept … ignored …` (console only)        | The same string key exists in several `strings/*.json` files with different English text. The kept value comes from the higher-priority file: `item-runes` > `item-nameaffixes` > `item-modifiers` > `item-names` > `skills` > other files alphabetically > `chinese-overlay` (the censored names of the Chinese release). Expected: ~85, almost all from `chinese-overlay`. |
| `bases: <code> … is not in its own tier family`          | The base's code is not listed in its `normcode/ubercode/ultracode`; treated as normal tier. ESR 3.2.10: `q86` Scissors Suwayyah, `qdf` Hunter's Guise.                                                                                                                                                                                                                       |
| `bases: <code> is mythical but its name string is …`     | Mythical accessories `mam`/`mrn`/`mjw` reuse the plain amu/rin/jew name strings; the `name` column ("Mythical Amulet") is used instead.                                                                                                                                                                                                                                      |
| `bases: dropped X (duplicate of Y)`                      | A base identical to an earlier one in every field except `code`/`family` is dropped (first in file order wins; count in `counts.duplicateBases`). ESR 3.2.10: `cx1`-`cx3` (copies of the `cm1`-`cm3` charms). `cm8`/`c11` Noob's Charms differ in reqLvl and are both kept.                                                                                                  |
| `bases: <code> name string … not found`                  | `namestr` has no string; the internal `name` column is used instead.                                                                                                                                                                                                                                                                                                         |
| `bases: … family code … does not exist` / `unknown type` | Broken references in the txt files; check the ESR data.                                                                                                                                                                                                                                                                                                                      |
| `itemtypes: … unknown parent / duplicate code`           | Broken Equiv references in itemtypes.txt.                                                                                                                                                                                                                                                                                                                                    |

## Code layout

```
scripts/generate-game-data.ts            CLI: arguments, git, file I/O
src/features/game-data/
  engine/      runtime + build time: schema.ts, itemTypes.ts, sockets.ts, matchRunewords.ts, bestBase.ts,
               affixEligibility.ts
  engine/browser/loadGameData.ts         browser-only loader (fetch, import.meta.env)
  build/       build only: tsv.ts, strings.ts, model.ts, esrSources.ts, bundleTypes.ts, bundleBases.ts,
               bundleRunewords.ts, bundleAffixes.ts, generateBundles.ts, writeBundle.ts
  build/stats/ stat renderer (see "Stat renderer")
```

`engine/` and `build/` are shared with the Node script, so they use relative imports ending in `.ts`, no `@/` aliases,
and no DOM/React. They are type-checked by `tsconfig.scripts.json`; `build/` is excluded from the app project.
The script runs with Node's built-in type stripping (Node ≥ 22.18).

UI files (Bases, Item Types):

```
src/features/game-data/
  index.ts                         route screen exports
  constants/{bases,urlParams}.ts
  store/gameDataSlice.ts           + gameDataSlice.test.ts (reducers + URL helpers)
  store/baseFiltersUrl.ts          encode/decode/hasBaseFilterParams
  hooks/{useGameData,useBasesUrlState}.ts
  utils/filterBases.ts             + test
  utils/{typeGroups,typeTree,format}.ts + typeTree.test.ts
  components/{GameDataVersionBanner,GameDataError,GameDataLoading,ComingSoon,BaseFilters,BaseCard}.tsx
  screens/{GameDataLayout,BasesScreen,BestBaseScreen,AffixesScreen,ItemTypesScreen}.tsx
```

UI files (Best Base):

```
store/character.ts            defaults, ranges, isCharacter validator, patchCharacter
store/bestBaseUrl.ts          encode/decode/hasBestBaseParams      (tests: store/bestBaseState.test.ts)
hooks/useBestBaseUrlState.ts  URL → slice on mount, share URL
hooks/useManifest.ts          manifest for the version notice (also used by GameDataVersionBanner)
utils/bestBaseResults.ts      collapseRowsBySockets, gameFileStats, summariseRejections, buildBaseGroups, resolveTxtSource, labels (+ test)
components/{CharacterForm,ComboPicker,EligibleBaseCard}.tsx
screens/BestBaseScreen.tsx
```

`TIER_BADGE_CLASS` moved from `BaseCard.tsx` to `constants/bases.ts` (shared by both cards).

UI files (Affixes):

```
screens/AffixesScreen.tsx         loader, mode switch, browse results
components/AffixRollPanel.tsx     base picker (ComboPicker), item level, Magic/Rare, automods
components/AffixFilters.tsx       search, kind, rare-only, class, level range, sort, item types, reset, share link
components/AffixRollResults.tsx   what-can-roll sections, grouped
components/AffixCard.tsx          one affix
components/AffixList.tsx          "Show more" paging (200 per page)
utils/filterAffixes.ts            filtering, sorting, grouping, formatting (+ test)
store/affixFiltersUrl.ts          URL encode/decode (tests: store/affixFilters.test.ts)
hooks/useAffixesUrlState.ts       URL → slice on mount, share URL
constants/affixes.ts              kinds, sort keys, labels, level range, page size
```

## Tests

- Build: `build/tsv.test.ts`, `build/strings.test.ts`, `build/bundleRunewords.test.ts`, `build/bundleAffixes.test.ts`,
  `build/stats/*.test.ts` (sprintf, expandProperty, descfunc, renderLines, propertyGroups)
- Engine: `engine/itemTypes.test.ts`, `engine/sockets.test.ts`, `engine/matchRunewords.test.ts`,
  `engine/bestBase.test.ts`, `engine/affixEligibility.test.ts`, `engine/browser/loadGameData.test.ts`
- UI: `store/gameDataSlice.test.ts`, `store/bestBaseState.test.ts`, `utils/filterBases.test.ts`,
  `utils/typeTree.test.ts`, `utils/bestBaseResults.test.ts`, `utils/filterAffixes.test.ts`, `store/affixFilters.test.ts`
- `bundleIntegrity.test.ts`: reads the committed JSON (counts, hashes, schema, type references, affix text). When the
  ESR clone is present it also regenerates the bundles in memory, checks they equal the committed files, and compares
  base names with the clone's `docs/weapons.htm` / `docs/armors.htm` (≥ 95 % overlap; misses are printed).
- `runewordMatching.integration.test.ts`: skips without `test-fixtures/runewords.htm`, `runewords.json` or `types.json`;
  prints the match histogram and unmatched lists, asserts ≥ 95 %.
- `statRenderer.oracle.test.ts`: see "Oracle"; skips without the fixtures or bundles.
- `scripts/lib/updateSummary.test.ts`: summary formatting of `game-data:update` (count diffs, porcelain parsing).
