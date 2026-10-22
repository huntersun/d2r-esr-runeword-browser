# 07 - Opportunities: what to adopt from the fork, and what to skip

**In short.** This merges the takeaway lists of documents 01–06 into one ranked, de-duplicated list. About a dozen ideas
are small and worth doing soon: a grouped header, a guide entry point on the home page, generated outcome tables for
corruption, anointment and the Vessel, a few filter additions, and a slot filter in the build item picker. The larger
items are a Sets page, a full cube recipe reference, a materials index, build-time item icons, and a richer build
model (runeword base and sockets, structured crafting, skill tree). Multi-language support is possible but depends on
moving the HTM pages to txt bundles first. Several of the fork's choices should not be copied. Comparing the two apps
also turned up a few things to fix in our own code and docs. The most important is a latent saga-registration race in
our startup, which our loading gate currently hides.

Sources: [01](01-site-map-and-navigation.md) shell, [02](02-reference-pages.md) reference pages ("Ranked borrowable
ideas" #1–#11), [03](03-guides-pages.md) guides (§10), [04](04-builds-and-item-editor.md) builds ("Takeaways" 1–10),
[05](05-data-pipeline-and-i18n.md) data and i18n (§5, §11), [06](06-backend-auth-and-removed.md) backend and policy (§3).

**Fit** says which of our four data paths an item belongs to:
- **HTM**: runtime-scraped pages in Dexie (`src/features/data-sync/`);
- **Bundle**: build-time txt→JSON in `public/game-data/` (`scripts/generate-game-data.ts`);
- **Guide**: markdown notes and directives (`content/guide/`, `src/features/guide/`);
- **Builds**: Supabase and `build_data` (`src/features/builds/`).

**Shell** means header, layout or settings. **Value** is judged for an audience of about 20 users: H = most visitors
would notice or use it, M = useful to some, L = nice to have.

---

## Tier 1: Do soon (high value, S–M)

| # | Item | From | Fit | Effort | Value | Depends on |
|---|---|---|---|---|---|---|
| 1 | **Grouped header nav** with dropdown panels, for example Recipes (Runewords, Gemwords, Socketables), Items (Uniques, Mythicals, Bases), Tools (Best Base, Affixes, Item Types, Loot Filters), Guide, Builds. This replaces priority-plus overflow. The mobile drawer gets an accordion that lists every item. | 01 §2, §3.2–3.3 | Shell (`Header.tsx`) | S | H | none |
| 2 | **"New to ESR? Start here →" banner** on the runewords home, linking to `/guide`. Add a few task-shaped entry cards on `/guide` ("Quest routes", "What is this item?", "Cube recipes"). Keep `/` as the runewords browser so `/?name=` links still work. | 01 §4, 03 §1 | Shell + Guide | S | H | the cards' targets: #18, #19, #20 (until those exist, link to notes) |
| 3 | **Official docs "Reference" strip on `/guide`**, linking the official Cube, Maps, Endgame Maps, Kill Ledger, Weapon Mastery and Skill Information pages. This covers the fork's six copied pages without copying them. | 03 §10.2 | Guide (`docs:` scheme) | S | M | none |
| 4 | **Corruption outcomes per slot**, generated from cubemain: a `::recipes[corruption]`-style guide block in `corruption-anointment.md`, or a small `/game-data/corruptions` page with slot tabs. Show rates only if the game files state them. | 02 §6, #2 | Bundle + Guide (`cubeFamilies.ts`) | M | H | none; the rate check (open question in 02) |
| 5 | **Anointment outcome list**: the 29-line unique-charm pool plus the equipment rule, as a generated block. | 02 §7, #7 | Guide | S | M | #4 (same generator) |
| 6 | **Vessel of Souls tier tables**: tier tabs with materials, soul cost and result, and optionally "recipes using material X". | 02 §8, #3 | Guide or Bundle | M | M | #4 (same cubemain path) |
| 7 | **Automod and staffmod lines** on base cards (today only "Automod N"), plus durability, range and smite. | 02 §4, #5 | Bundle (automagic.txt is already parsed) | S | M | none |
| 8 | **Acquisition chips on Uniques** (Coupon only / Gamble / Drop only). They replace the exclude-only coupon toggle, using our existing `isAncientCoupon` / `gambleItem`. | 02 §2, #9 | HTM | S | M | none |
| 9 | **Max Req Lvl on Mythicals**, for parity with the other lists. | 02 §3, #10 | HTM | S | L | none |
| 10 | **"Contains any of these runes" mode** next to the strict rune filter. It answers "which words use Ber?". | 02 §1, #8 | HTM | S–M | M | none |
| 11 | **Filter the build item picker by slot**, using the fork's slot→category sets and runeword allowed-base→slot checks. Our picker lets a helm go into a ring slot. | 04 §8.1, #1 | Builds + Bundle (`types.json`) | S | M | none |
| 12 | **Player / Skills / Mercenary tabs** on build detail. This shortens the long stacked page without needing a paperdoll. | 04 §2, #7 | Builds | S | M | none |
| 13 | **Credits block in settings** (ESR author, ESR site, our repo). | 01 §5 | Shell (`SettingsDrawer.tsx`) | S | L | none |

Ordering rationale: #1–#3 make existing content easier to find and cost almost nothing. #4–#6 fill the largest gap
that users ask about ("what can this roll"), and they share one cubemain generator, so build #4 first. #7–#12 are
small, independent quality gains.

## Tier 2: Worth planning (M–L)

| # | Item | From | Fit | Effort | Value | Depends on |
|---|---|---|---|---|---|---|
| 14 | **Sets page** (`/sets` or `/game-data/sets`) from setitems.txt + sets.txt. It needs item rows with per-item partial bonuses, set-wide partial and full boxes, a piece-count filter, max level, `?name=`, Copy Link, a Source line, English labels and hidden `_old` rows. This is the largest content gap. | 02 §5, #1 | Bundle (the generator already reads setitems for sources) | L | H | none |
| 15 | **Set items in builds**, with an "{n}-piece bonus" display. Today this is out of scope in our spec. | 04 #9 | Builds | S–M | M | #14 (no sets data without it) |
| 16 | **Runeword base and socket model** in builds: a `baseCode` chosen from allowed bases with enough sockets, plus socket fillers. This gives correct column bonuses for the chosen base. `refreshBuildData` / `resolveCurrentRef` must carry the new fields, with a test (the fork loses them on edit). | 04 §8.2–8.3, #2, #6 | Builds + Bundle (`gemsockets`, `gemapplytype`) | M | M | #11 |
| 17 | **Structured crafting annotations** (corrupt / forge / D-craft pickers), stored as ids or string key + args, never as rendered text. The forge table should be derived from game data, and `asBuildData` validators and diff support added. | 04 §8.3–8.4, #3 | Builds + Bundle | M | M | #4 (corruption data), #16 |
| 18 | **Cube recipe reference** (`/game-data/cube`) generated from cubemain. Every row grouped by family, token search, the fork's "a header match keeps the whole group" rule, `?search=` / `?family=` state, an empty-state message, and a link to the official page for caveat text. | 03 §3, §10.1 | Bundle + Guide (`cubeText.ts`) | M–L | H | none; the #4–#6 generator helps |
| 19 | **Materials / misc items index** (icon, name, how to get, used in → recipe family or note), built from `sources.json`, `lootfilter.json` and the misc browser groups. The guide's "I found an item I don't recognise" would link to it. | 03 §9.3, §10.4 | Bundle + Guide | M | H | #21 for icons (optional) |
| 20 | **Quest-route notes** for Acts 2, 3 and 5, written in our voice, checked in-game, with our own diagrams. Do not reuse the fork's flowchart markup or wording. | 03 §9.2, §10.3 | Guide | M (S per act) | M | an owner decision and in-game verification |
| 21 | **Build-time item icons**: export only the referenced PNGs from the mod's `.sprite` files with our existing decoder and the mod's `hd/items/*.json` maps. Do not rehost the mod folder. | 02 #4, 05 §5 | Bundle | M | M | licence and size check (see Tier 3) |
| 22 | **Icon-tile category pickers** for word item types, unique categories and bases. They are faster to scan and work well on phones. | 02 §1–§2, #4 | HTM + Bundle | M | M | #21 |
| 23 | **Bases family-table view** (normal / exceptional / elite as rows of one table) as a toggle beside the cards. This is already on our deferred list. | 02 §4, #6 | Bundle | M | M | #7 |
| 24 | **Recipe-diagram card style** ("X ➕ Y → Same Item \| Random Affix") for one-recipe mechanics in guide blocks. | 02 #11 | Guide | M | L | #4–#6 |
| 25 | **Player level + skill allocation tree** built from skills.txt / skilldesc.txt at build time, Warlock included. Keep the free-text field. The fork's `level + 12` budget needs checking against ESR. | 04 §6, #4 | Builds + Bundle | M–L | M | none |
| 26 | **Paperdoll and charm grid.** If built, the charm grid should use real charm sizes (1×1 / 1×2 / 1×3), not art kinds. | 04 §4–5, #8 | Builds | L | L | #21 (needs HD art), #12 |
| 27 | **Multi-language path.** (1) Keep zhTW/zhCN (and other) strings from the ESR clone in `build/strings.ts`. (2) Render per language at build time. (3) Move the HTM browse pages to txt bundles: this is the blocker. (4) Add a small `t(key, vars)` UI dictionary of about 700 keys. (5) Build multi-language `searchText`. (6) Put the language in the URL (`?lang=` or `/<lang>/`). Guide-note translation is the largest and fastest-ageing cost. | 05 §11 | All four | L | L (no zh users today) | step 3 is a migration of its own; #14 and #18 reduce it |

## Tier 3: Deliberately skip

| Fork choice | Why we skip it | From |
|---|---|---|
| Copying the official ESR docs into iframe pages | The docs have no licence, so copies need the author's permission. Copies lag the mod (the fork's cube page is pre-3.2), and iframes break routing, theming, headings and SEO. We link instead ("linked, never mirrored"). | 03 §2, §11 |
| Per-language HTML copies of guide pages | 24 hand-maintained files that already lag. Linking to the official locale pages is cheaper. | 03 §5 |
| The Translation Notes slang glossary | It is Chinese community slang and means nothing to English readers. | 03 §4 |
| Hard-coded forge tables and hard-coded rates (75/25, 66/34) | They go stale without a trace. Derive from game files or leave them out. | 02 §6, 04 §8.3 |
| Localised text stored in builds (corrupt / forge / D-craft as rendered strings) | Viewers see the author's language, and values never update. Store keys and args. | 04 §8.4 |
| The `Pr` English→Chinese map and fuzzy matcher | About half the main bundle, a fragile way to translate rendered English. Keyed strings make it unnecessary. | 05 §6 |
| Removing URL state, Copy Link and `?name=` | Guide links and Best Base depend on them. This is the fork's largest regression. | 01 §7, 06 §4 |
| Replacing `/` with a static landing page | Breaks runewords-first deep links. Tier 1 #2 gets the discoverability for less. | 01 §4 |
| Per-socket-count word records, exact-only socket input, unsummed per-gem lines | All are regressions against our range input and single card. | 02 §1 |
| Dropping Warlock, gemwords in builds, the snapshot diff, `asBuildData` validation | Ours is better on each. Keep them. | 04 #5, #10 |
| Email-only sign-in | We already offer both providers. | 06 §2 |
| Rehosting mod art (or any art taken from the fork) | Not until the licence and size are checked. Then take it from the mod files with credit (Tier 2 #21), never from the fork. | 02 open questions, 03 §11 |
| Copying the fork's own pages (Maps flowcharts, Materials text) | Closed source, no licence. Use them only as a signal of which topics readers want. | 03 §11 |
| 7-position text-size slider; featured Mythicals nav tile | No gain over our 4 steps; the tile is decoration. | 01 §3.2, §5 |
| Fetching all three string tables up front for search | Only relevant once Tier 2 #27 exists, and then build-time `searchText` is cheaper. | 05 §4 |

---

## Fix or check in our own code, found while comparing

1. **Saga-registration race (latent).** Checked in `src/main.tsx`, `src/core/startup.ts`,
   `src/core/layouts/AppLayout.tsx`, `src/core/store/sagaRegistry.ts` and the builds screens.
   - `main.tsx` renders the router (L55–63) and only then calls `startBuilds()` (L67).
   - `startBuilds()` awaits `import('@/features/builds/store/buildsSaga')` before `registerSaga` / `runSagas`
     (`startup.ts` L67–78). The registry starts late registrations immediately, but redux-saga's `takeLatest` does
     not see actions dispatched before the watcher started.
   - The only guard is the gate in `AppLayout`: it shows "Loading data..." until the HTM data sync sets
     `isInitialized` (L49). `STATIC_BUNDLE_ROUTE_PREFIXES` (L15) exempts only `/guide` and `/loot-filters`.

   **What would break if `/builds` were exempted.** On a direct load or a reload, each screen's mount effect would
   dispatch before the builds saga listens:
   - `BuildsScreen` dispatches `fetchBuildsRequested` (L47–49). The reducer sets `listStatus = LOADING`, but no
     saga runs the query. The list stays on skeleton cards forever, with no error and no "Try again", because those
     appear only after a failure.
   - `BuildDetailScreen` (L73–79) and `EditBuildScreen` (L43) do the same with `fetchBuildRequested`, so
     `detailStatus` stays LOADING.
   - `UserProfileScreen` (L52–58) does the same with `fetchAuthorProfileRequested`.
   - Changing a list filter would recover the list, because `handleFilterChanged` runs after the saga has started.
     Detail and profile pages need a reload.

   This is exactly the fork's blank direct-load bug (01 §8). It would also apply to `/build/:id` and `/user/:id`,
   which are the URLs that Copy Link shares.

   Even today, the gate is a timing coincidence, not a guarantee (inferred, not observed). The data-sync chunk and
   the builds chunk load concurrently. If a warm-cache data sync ever finished before the builds chunk import
   resolved, the same loss would occur.

   Suggested fix (S): make the builds route chunks wait for registration, for example
   `lazy(() => Promise.all([import(screen), startBuilds()]))`. Alternatively, have the builds saga re-issue any
   request whose status is already LOADING when it starts. Add a test for the second option.
2. **`PRIVACY_POLICY.md` scope.** Add a sentence saying the policy covers only the deployment at
   istvan-panczel.github.io and our Supabase project, and that forks are responsible for their own. The fork's
   consent checkbox and its deletion link both point to our policy and our issue tracker (06 §2–3). Expect stray
   deletion issues from fork users, and answer them by pointing to the fork.
3. **`PRIVACY_POLICY.md` contradicts `index.html` on analytics.** The policy says "I do not use analytics or tracking
   tools" (L30), but `index.html` L91–92 loads the Cloudflare Web Analytics beacon. The decision recorded in
   `builds-feature-docs/FEATURE-BUILD-SHARING.md` L977/L981 was to disclose it. Document 06 §3 says ours "discloses
   it", which is not true of the current policy file. Fix the policy and bump "Last updated".
4. **`docs/technical/NAVIGATION.md` route table lacks `/guide/map`**, which the router defines
   (`src/core/router/index.tsx` L152). `docs/README.md` L65 also lists only `/guide, /guide/:slug`. The same file
   says "`/game-data` is the only nested section", but `/guide` and `/loot-filters` are nested too.
5. **`docs/README.md` L82–84 lists three game-data bundles** (`manifest.json`, `types.json`, `bases.json`). Seven
   exist in `public/game-data/`: those three plus `runewords.json`, `affixes.json`, `sources.json` and `lootfilter.json`.
6. **`public/sitemap.xml` (11 URLs) lists `/guide` but not the 31 notes (`content/guide/notes/`) or `/guide/map`.** It
   also omits `/loot-filters`. The guide generator could write the note URLs into it (03 §6, open question 4).
7. **Other items the documents flagged about us** (check, not necessarily fix):
   - We have no per-page document titles, only the static `index.html` title (01 §8).
   - Our mobile header and drawer were not re-measured, and our load time was not measured, so there is no
     head-to-head figure (01 §9–10).
   - The fork lists 46 mythicals against our ~41 from `unique_mythicals.htm`. Check whether the five missing ones
     are disabled or legacy in 3.2.24 (02 §3).
   - All 31 guide notes are still draft, with no `verified:` stamp (03 §8).
   - Before showing corruption success and brick rates, check whether cubemain encodes them (02 §6).
   - Our build version stamp comes from the HTM docs version, which can lag the game files (05 §10). This is worth
     remembering when the ESR mismatch warning fires.

## Bugs observed in the fork (the fork's, not ours; context only)

- **Direct load of `/builds`, `/build/:id` and `/user/:id` renders blank.** No Supabase query is sent, so shared
  links open empty (01 §8, `screens/24b-build-detail-direct-load.png`). Cause inferred: late saga registration with
  no gate (see fix 1 above).
- **The 404 page shows raw i18n keys** (`notFound.*`) in every language (01 §6, `screens/67-404.png`).
- **Light-theme contrast.** Search and number inputs and the rune pills stay black with dark text (01 §8,
  `screens/15-runewords-light-d2font.png`).
- **The mobile Builds search box** collapses to a sliver (01 §8, `screens/m-04b-builds-loaded-mobile.png`).
- **A dead "Gems/Crystals" nav item** (`/socketables` has no route) (01 §3.4, `screens/66-gems-crystals-link.png`).
  Mythical Uniques is also missing from the mobile drawer.
- **The Anointments H1 says 29 while the banner says "30 total".** The data has 29 (02 §7).
- **The Vessel of Souls note says "Each Tier 1 recipe…" on every tier** (02 §8, `screens/57-vessel-tier2.png`).
- **Edit-save snapshot loss** (inferred from code, not verified live). An edit drops the runeword `baseCode` and
  socketed jewels, and the unique `index`/`code`. The snapshot refresh is a no-op anyway, because the Dexie tables
  are never filled (04 §9, 06 §1).
