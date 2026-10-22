# d2r.dpdns.org: analysis of a closed-source fork

**In short.** https://d2r.dpdns.org ("ESR Website", brand 東日美化版) is a closed-source fork of this app. It is
aimed at the Chinese ESR community, defaults to Traditional Chinese, and also offers Simplified Chinese and English.
It reworks our shell, adds a landing page and several new reference and guide pages, and turns Builds into an
in-game-style planner. It also removes our URL state, favourites UI and data-refresh info. This folder records what
it changed and what we could adopt. The analysis is a **snapshot dated 2026-10-22**: the site may change at any time.

## What the site is

- **A fork of this repo.** The routes, Supabase schema, build export format and many English strings are ours. The
  settings sheet credits "Open-Source Project: d2r-esr-runeword-browser" and "Original Author: István Pánczél"
  ([01 §5](01-site-map-and-navigation.md)).
- **Languages.** It ships zh-TW (the default), zh-CN and en, with a 繁/简/EN switcher in the header. The brand reads
  東日美化版 in Chinese and "D2R ESR" in English. The document title is always "ESR Website". The only community link
  is a QQ group dialog.
- **Its own backend.** It runs its own Supabase project (`zbwhqioeoacnsnrbnipd`), separate from ours. Builds on the
  two sites cannot see each other ([06 §1](06-backend-auth-and-removed.md)).
- **Fork point: before 2026-10-05 (inferred).** It has a Dexie `version(13)` with an `affixes` table, no consent-time
  tag retry and no Warlock. It already has Supabase favourites (2026-06-09) ([06 §6](06-backend-auth-and-removed.md)).
- **Game data at ESR 3.12.11** (the LAN build's `modinfo.json`), while our game files are at **3.2.24**. It has no
  Warlock, and 530 enUS strings differ from 3.2.24 ([05 §3, §5](05-data-pipeline-and-i18n.md)).
- **Hosting.** A free DigitalPlat subdomain behind Cloudflare. It serves `index.html` for every path and has no
  source map.

## Provenance: how we established it

- **The fork network.** On GitHub, `istvan-panczel/d2r-esr-runeword-browser` has two forks. Neither is the dpdns site:
  - `AreChen/d2r-esr-runeword-browser-zh`: a zh-CN fork on GitHub Pages, last pushed 2026-06-04;
  - `huntersun/d2r-esr-runeword-browser`: a plain mirror.
- **No repo found.** GitHub and Gitee repo searches for the domain and for unique strings from the bundle found
  nothing. The production build has no source map.
- **An earlier site on the same domain.** Until about June 2026 the domain hosted a static guide site. The AreChen
  zh-CN fork scraped it. The current SPA has since replaced it.
- **Its own credits.** The settings credits panel names our repo and our owner, and its consent and account-deletion
  links still point at our GitHub repo ([06 §2](06-backend-auth-and-removed.md)).
- We did not try to identify the fork's maintainer beyond what the site states.

## Method

1. **Bundle analysis.** We read the pretty-printed production JavaScript (`index.js`, 2.47 MB, 75,199 lines) and the
   lazy saga chunks (`authSaga`, `buildsSaga`, `favoritesSaga`, `localModInfo`), plus the fetched `/data/*.json`
   files, string tables, guide HTML pages and mod icon maps. Citations use `bundle L<n>` and `remote-data/<file>`.
2. **Live browse.** On 2026-10-22 we browsed the site in headless Chrome (Playwright) at 1400×900 and 390×844 and
   took 110 screenshots. The language was set to English through the in-app switcher.
3. **Comparison with this repo at v1.23.0** (`src/`, `docs/`, `content/guide/`, `supabase/migrations/`), and with
   our local ESR clone at 3.2.24 for text overlap and string drift.
4. **Safety.** Site content was treated as untrusted data. No account was created, nobody signed in, and no form was
   submitted. As a result, the build create/edit form and the item editor are described from code only.

When the bundle and the live browse disagreed, the bundle usually turned out to be right about interactions. Example:
the live report said a rune chip on a word card "opens nothing", but the bundle shows a click-to-open popover. A
follow-up live check on 2026-10-22 confirmed the popover (`screens/70-runeword-rune-chip-click.png`).

## Documents

| File | Summary |
|---|---|
| [01-site-map-and-navigation.md](01-site-map-and-navigation.md) | Routes (26 entries), grouped header with dropdowns, mobile accordion, landing page, settings, 404, no URL state, shell bugs, mobile layout, load weight |
| [02-reference-pages.md](02-reference-pages.md) | Runewords, Gemwords, Uniques, Mythicals, Weapon and Armor Bases, Sets, Corruptions, Anointments, Vessel of Souls, Ascendancies: fork vs ours, 11 ranked ideas |
| [03-guides-pages.md](03-guides-pages.md) | The eight iframe guide pages (six copied from the official docs, Maps reworked, Materials original), in-page search, language files, licensing, our Guide in comparison |
| [04-builds-and-item-editor.md](04-builds-and-item-editor.md) | Build list and detail, paperdoll, charm grid, skill tree, item editor (slot filter, runeword base, sockets, corrupt/forge/D-craft), `build_data` model, edit-save bug |
| [05-data-pipeline-and-i18n.md](05-data-pipeline-and-i18n.md) | 18 offline-built JSON files, string key + args and the runtime format engine, three string tables, three-language search, `/EasternSun/` asset hosting, the `Pr` map, our path to multi-language |
| [06-backend-auth-and-removed.md](06-backend-auth-and-removed.md) | Supabase usage (same relations as our migrations), email-only auth, our privacy policy in their consent flow, removed and leftover features, dating the fork point |
| [07-opportunities.md](07-opportunities.md) | One ranked list: Do soon, Worth planning, Deliberately skip; fixes for our own code and docs; the fork's bugs |

Screenshots are in [`screens/`](screens/). Only the screenshots referenced by the documents are kept (`c-*` and the
numbered ones are desktop at 1400×900; `m-*` are mobile at 390×844).

## Top 10 findings

1. **It is our code, forked before 2026-10-05.** Routes, Supabase tables and columns, the export format and English
   strings match ours. Everything new sits in the UI and in the `build_data` JSON, so the fork needed no schema change
   (01, 04, 06).
2. **Its data is two release lines behind.** It is at ESR 3.12.11, with no Warlock and 530 drifted enUS strings.
   Updates depend on a private offline pipeline, whereas our HTM pages refresh themselves and our bundles follow
   `/esr-update` (05 §10).
3. **It uses a keyed data model.** Offline txt → 18 JSON files with stat lines stored as D2R string key + args,
   rendered at runtime against enUS, zhTW and zhCN tables. This makes three-language UI and search cheap. We already
   have every language in our ESR clone (05 §2–4, §11).
4. **It has a guide-first shell.** `/` is an "ESR Newcomer Guide" landing page, the header has seven dropdown groups
   with subtitles, plus a language switcher and a QQ dialog. Grouping solves the overflow problem our flat header
   has (01 §2–4).
5. **It has new reference content we lack.** Sets (71), weapon and armor tier-trio tables with automod and staffmod
   lines, Corruptions (275 outcomes), Anointments (29) and Vessel of Souls (about 354 recipes). Sets is our largest
   content gap (02).
6. **Six of its eight guide pages are copies of the official ESR docs.** They are 85–97% verbatim, shown in
   iframes, and translated by the fork. Quest Maps is a reworked interactive version of the official Maps page, and
   Materials is original. A searchable full cube table, quest routes and a materials index are the real gaps on our
   side (03).
7. **Builds became an in-game-style planner.** It has a paperdoll with weapon swap, a 10×4 charm grid, a skill tree
   with a level budget, and an item editor with slot filtering, runeword base choice, sockets and corrupt / forge /
   D-craft pickers. There is no stat calculator, and annotations are stored as localised text (04).
8. **Large regressions.** All URL state, Copy Link on lists and `?name=` are gone. So are the favourites UI, the
   per-item "Stats updated" diff, Warlock and gemwords in builds, and the data-refresh and version info in settings.
   Direct loads of builds pages render blank (01 §7–8, 04, 06 §4).
9. **Fork users accept our privacy policy.** Their consent checkbox links our `PRIVACY_POLICY.md`, and their deletion
   link opens an issue on our tracker. We cannot act on their database (06 §2–3).
10. **The comparison found issues in our own repo.**
    - Our builds saga registers after the first render. Only the HTM loading gate stops the fork's blank-page bug
      from appearing here.
    - Our privacy policy says "no analytics", although `index.html` loads Cloudflare Web Analytics.
    - Some docs and the sitemap are out of date.

    See [07, "Fix or check"](07-opportunities.md#fix-or-check-in-our-own-code-found-while-comparing).

## Consistency notes

- **The ESR version stamp is a chain.** The hosted `/EasternSun/modinfo.json` ("Mod Version: 3.12.11") is parsed by
  the `localModInfo` chunk into Dexie `metadata.esrVersion`, and from there written to the build row
  (`esr_version` / `esr_version_updated`) and compared in the mismatch warning. [04 §2](04-builds-and-item-editor.md)
  describes the Dexie and build-row end, and [05 §5](05-data-pipeline-and-i18n.md) / [06 §1](06-backend-auth-and-removed.md)
  describe the modinfo end. One phrase in 04 §2 is not accurate for the fork: "i.e. the HTM docs version". That is
  true of **our** app; in the fork the Dexie value comes from the hosted modinfo.
- **Rune and gem chip popovers.** [02](02-reference-pages.md) lists them as an open question. This is now resolved:
  they open on click (see Method).
- **Our analytics disclosure.** [06 §3](06-backend-auth-and-removed.md) says ours "discloses" Cloudflare Web
  Analytics. The policy file currently says the opposite (07, fix 3).

## Open questions

1. Does the builds direct-load blank also happen for signed-in users? Only signed-out sessions were tested (01).
2. Is the dead "Gems/Crystals" (`/socketables`) entry a planned page or a leftover (01, 03)?
3. Which five mythicals does the fork list that our HTM page lacks, and are they disabled or legacy in 3.2.24 (02)?
4. Does cubemain.txt encode the corruption success and brick split, or is 75/25 documented only in the docs (02)?
5. What are the licence and size cost of exporting a subset of the mod's HD item art at build time (02, 03)?
6. Are the two `_old` sets reachable in game (02)?
7. Would the ESR author agree to reference tables generated from the game files, or to any reuse of the docs? Ask on
   the ESR Discord (03).
8. Are the fork's Act 2/3/5 quest routes accurate for 3.2.x? Nobody has checked them in-game (03).
9. Does the fork's edit-save refresh really drop `baseCode`, runeword `socketed` and unique `index`/`code` in
   production? Checking this needs an account (04).
10. Is the skill budget `level + 12` right for ESR (vanilla gives (level − 1) + 12) (04)?
11. Are the hard-coded forge values (+48% AR, 21 Conviction, …) current for ESR 3.2, and where do they come from (04)?
12. Did the fork apply all four of our migrations (003 grants, 004 trigger, 002 `favorite_counts`), so that the same
    RLS protects its users (04, 06)?
13. Who controls the fork's Supabase project, in which region, and is Discord configured there (06)?
14. Which revision is the fork's `/data` generated from, how is it refreshed, and where do the zhTW "(FR)/(EDmg)"
    abbreviations come from (03, 05)?
15. Has any account-deletion issue on our tracker actually concerned the fork (06)?
