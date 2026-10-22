# Guide pages: the fork's eight iframe pages vs our Guide

**In short.** The fork ships eight static HTML guide pages (Cube Recipes, Materials, Quest Maps, Endgame Maps, Skill Info,
Kill Ledger, Weapon Mastery, Ascendancy Trials) and shows them inside an auto-height iframe in its React shell, one HTML file
per language. Six of the eight English files are restyled copies of the official ESR docs (85–97% of their word 6-grams
appear verbatim in our ESR 3.2.24 clone of easternsunresurrected.com). Quest Maps is a reworked, interactive version of the
official Maps page. Materials is the only page that is original. The Chinese files are the fork's own translations, not the
official zhTW/zhCN pages. We publish none of the official docs as pages. Our Guide has 31 short notes whose numbers come from
the game files, and it links out to the official docs. The clear gaps on our side are a searchable cube recipe reference,
a quest-route walkthrough and a materials index.

Sibling docs: [01-site-map-and-navigation.md](01-site-map-and-navigation.md) (nav groups, landing page shell),
[05-data-pipeline-and-i18n.md](05-data-pipeline-and-i18n.md) (language handling across the app),
[07-opportunities.md](07-opportunities.md) (ranked adoption list).

## 1. Landing-page cards that lead to the guide pages

**Fork.** The landing page `/` ("ESR Newcomer Guide", `lFe` bundle L57465-57594, strings in the page-local table `sFe`
L57343-57455) mostly links to these iframe pages (`c-01-home.png`, `01-home-en-full.png`, `m-01-home-mobile.png`):

| Card | Section | Target | Notes |
|---|---|---|---|
| "Quest Maps": "Stuck? Follow the full quest routes" | hero, red | `/maps` | bundle L57483 |
| "Item Guide": "Unsure what an item does? Check its use, source and crafts" | hero, gold | `/materials` | L57484 |
| "Blessing System": "Bless, enhance and upgrade your gear" | Systems | `/materials` | L57491. The string key is `home.cubeTitle`, so this was probably a Cube card that was later relabelled (inferred). Materials' "Blessed Items" section links to `/anointments` as "Equipment Blessing", so "blessing" seems to be the fork's word for anointing (inferred). |
| "Endgame Maps": "The endgame grinding core after level 99" | Systems | `/endgame-maps` | L57493 |
| "Ascendancy Challenges": "15 class specializations" | Systems | `/ascendancy-challenges` | L57494 |
| "Skills" | Reference | `/skill-information` | L57504 |

The nav reaches the same pages: Guides ▾ (Map, Materials, Kill Ledger, Skill Info, a dead "Gems/Crystals" `href="#"`,
Endgame Maps), Cube (`/cube-recipes`), Ascendancy ▾ (Ascendancy Trials) and Enhance ▾ (Weapon Mastery) (bundle
L55444-55562, `02-menu-guides.png`, `66-gems-crystals-link.png`).

**Ours.** `/` is the Runewords browser. The guide starts at `/guide` ("Start here": a 5-step spine plus "I found something"
questions such as "I found an Ancient Coupon" and "A cube recipe does nothing", `content/guide/spine.yml`). The header has
an external "ESR Documentation" link to `https://easternsunresurrected.com/` (`src/core/components/Header.tsx` L21, L53).

**Takeaway.** The fork's landing page promises guide content first ("Stuck on a quest? … Everything is one click away").
Our spine sorts the same topics by game stage, but it is one click deeper. A few task-shaped entry cards ("Quest routes",
"What is this item?", "Cube recipes") would be cheap to add on `/guide`.

## 2. How the pages are embedded

**Fork.** The routes `/cube-recipes` … `/ascendancy-challenges` all render `pi({page})` (bundle L75084-75091; component
L62984-63020):

- `src = /pages/<page>/<page>_<TW|CN|US>.html`, picked from the UI language (`NHe = {zhTW:"TW", zhCN:"CN", enUS:"US"}`,
  default US). When the language changes, the src changes and the iframe reloads.
- **Auto height**: on `load`, a `ResizeObserver` watches `contentDocument.body` and sets
  `iframe.style.height = body.scrollHeight + 40px`. The initial height is `80vh`. The parent page scrolls as one long page
  (Cube is about 94,000 px tall, per the live crawl). The iframe has no own scrollbar.
- **Text size**: a second effect posts `{type:"text-size", value}` with target origin `"*"` whenever the setting or the
  src changes. The page script (`common_search.js`, served as `/pages/common/search.js`) also reads
  `localStorage.textSize` on load (same origin) and accepts 14–20 px or the legacy names
  `small/normal/large/extralarge` → 14/16/18/20. Those legacy names are **our** settings values, inherited from
  our app. The first postMessage probably fires before the iframe has loaded and is lost, but the localStorage read covers
  that case (inferred). It sets `html { font-size }`, so only rem/em-sized content scales.
- **Back to top**: the iframe page creates its own button only when it is opened standalone (no parent). Inside the SPA,
  the shell's `hr` button handles it (L63017).
- `title` attribute of the iframe = the slug (`"cube-recipes"`), not a readable name.
- **Navigation inside the iframe**: links between guide pages are relative (`../kill-ledger/kill-ledger_US.html`,
  `../cube-recipes/cube-recipes_US.html#legendary`). They load in the iframe, so the address bar keeps the old route, and
  the language suffix is hard-coded in the link. Links to React pages (`/anointments`, `/corruptions`,
  `/vessel-of-souls`) use `target="_top"`.
- **No URL state**: neither the search text nor the section (jump button, Maps tab) reaches the URL. Nothing inside a
  guide page can be deep-linked from outside, apart from raw `#anchor` links to the static file.

**Ours.** Guide notes are React components rendered from a static JSON bundle (`public/guide/guide.json`, built by
`scripts/generate-guide.ts`). They use the app's theme, font and text-size settings directly, and every note has its own
URL (`/guide/:slug`). App links such as `rw:Enigma` become `?name=` focus links (`src/features/guide/engine/linkSchemes.ts`).

**Takeaway.** The iframe is a quick way to drop legacy HTML into a SPA. It costs routing, theming (the pages bring their
own `page.css` with dark-only colours) and accessibility. We should not copy this pattern. If we ever add long reference
tables, they should be React screens fed from data.

## 3. The in-page search (`common_search.js`)

**Fork.** One shared script (comments in Traditional Chinese: "共用攻略頁搜索框 — 所有 public/pages/<key>/ 的靜態 HTML 共用"),
loaded by seven of the eight pages (Maps does not load it):

- It needs `<input id="page-search">` and filters on every `input` event.
- Query: `value.trim().toLowerCase()`. It is **one substring**, with no tokens, AND terms or quoted phrases, and it only
  matches text in the current language file (unlike the fork's React pages, which search all three languages; see
  [05-data-pipeline-and-i18n.md](05-data-pipeline-and-i18n.md)).
- **Tables**: rows are grouped. A row that contains a `td[colspan]` starts a group (section title or table header). If
  the group header matches, the whole group shows. If not, member rows are matched one by one, and the header stays
  visible as a label when any member matches. A table with no visible group is hidden.
- **Card grids**: `.card-grid` / `.item-card` elements are filtered the same way. No current page uses them; the
  class names are 0 hits in all eight files.
- **Jump buttons**: `scrollToSection(id)` calls `scrollIntoView({behavior:'smooth'})`. This scrolls the parent page too,
  because the iframe has full height.
- There is no "no results" message. Prose outside tables never hides.

**Placeholders** (US files): Cube "Search 搜尋配方 / 材料…", Kill Ledger "Search 搜尋擊殺獎勵 / BOSS…", Skill Info
"Search 搜尋技能 / 傭兵…", Endgame Maps "Search 搜尋 BOSS / 地圖…", Ascendancy Trials "Search 搜尋昇華試煉…", Weapon Mastery
"Search 搜尋材料 / 技能…", Materials "Search items…", Maps: no search box.

**Ours.** Our guide search (`src/features/guide/components/GuideSearch.tsx`) searches notes, not table rows. Our browse
pages use the shared AND-term search with quotes (`src/core/utils/searchTerms.ts`). Inside a note, `::recipes` tables are
short (at most 12 rows) and have no filter.

**Takeaway.** The group-aware row filter is a nice touch: matching "Forging" keeps the whole Forging table. On Cube, "Ber"
cut 894 rows to 53 (`60-cube-search.png`). It is also the main thing a reader gets from these pages that the official docs
lack. If we build a recipe reference, keep the "header match shows the group" rule, but use our token search and say
"no matches".

## 4. Page-by-page

Sizes are bytes of the fetched files in `scratchpad/remote-pages/`. "Overlap" is the share of the fork's English word
6-grams that appear verbatim in the matching page of our ESR clone (`../Eastern_Sun_Resurrected/docs`, ESR 3.2.24), with
script, style, nav and head stripped. The fork's mod copy says "Mod Version: 3.12.11", so some drift is expected.

| Route | Source file (US / TW / CN bytes) | Official counterpart | Overlap | Verdict | Structure | Search |
|---|---|---|---|---|---|---|
| `/cube-recipes` | `cube-recipes_US.html` 464,430 / 455,837 / 455,837 | `Eastern Sun Resurrected Cube Recipes.html` (554,501) | 85% (official in fork 83%) | **Copy**, restyled; adds Runes, Kanji and Gem Melding (`gemfusion`) sections; anchors converted from `<a name>` to `id` | 25 jump buttons (5×5), 3 red notice boxes, 29 tables, 894 rows (141 group rows), no headings, no images | yes, bilingual placeholder |
| `/materials` | `materials_US.html` 33,274 / 32,209 / 32,118 | none (0% against index, gems, installation guide) | 0% | **Original** | 9 jump buttons, 12 tables (Item / Use / Source), 97 images under `./img/Materials/` (Aurastone, EndMap, Organs, Stocker), Translation Notes table, "Original Red Portal Guide - Torch" box | yes, "Search items…" |
| `/maps` | `maps_US.html` 41,456 / 41,475 / 41,473 | `Eastern Sun Resurrected Maps.html` (46,778) | 16% (official in fork 23%) | **Reworked adaptation**: the same zone graph, Teleport restrictions and Special Areas list as the official page, redrawn as an interactive flowchart with fork-written legends, quest lists and notes | 4 tabs (Act 2, Act 3, Act 5, Special Areas), CSS-grid flowcharts with hover-lit arrows (`data-next`), 11 headings, own `style.css`, inline `switchTab` script | **none** |
| `/endgame-maps` | `endgame-maps_US.html` 69,592 / 63,042 / 63,042 | `endgame_maps.htm` (73,370) | 95% | **Copy** | warning box, 2 tables (20 rows), 18 boss images (`./images/map-bosses/…`, the same file names as the official `images/map-bosses/`) | yes |
| `/skill-information` | `skill-information_US.html` 21,022 / 20,138 / 20,138 | `skill_information.htm` (50,193) | 87% | **Copy** (keeps the author's "please contact me on discord") | 3 tables (58 rows): mercenaries (Hireling, Subtype, Skills, Price), oskills | yes |
| `/kill-ledger` | `kill-ledger_US.html` 17,156 / 16,894 / 16,894 | `kill_ledger.htm` (40,308) | 97% | **Copy** | intro, 3 tables (27 rows): Kill Bonuses and boss bonuses as Input / Output | yes |
| `/weapon-mastery` | `weapon-mastery_US.html` 20,708 / 19,610 / 19,610 | `weapon_mastery.html` (48,437) | 91% | **Copy** | intro, 3 tables (24 rows): General Recipes and class tables | yes |
| `/ascendancy-challenges` | `ascendancy-challenges_US.html` 20,161 / 19,413 / 19,410 | `ascendancies.htm` (64,091), challenge section only | 79% (official in fork 27%) | **Copy of one section**; the class bonuses are on the React page `/ascendancies` | rules box, 5 `h3` "Tier N Challenge", 12 tables (37 rows), 11 orb icons (`./img/ascendancies/orb_of_*.png`) | yes |

Screenshots: Cube `c-02-cube-recipes.png`, `60-cube-search.png`, `61-cube-category-runes.png`, `m-05-cube-mobile.png`;
Maps `c-04-maps.png`, `62-maps-act3.png`, `63-maps-special.png`, `m-08-maps-mobile.png`; Materials `c-05-materials.png`,
`64-materials-runes.png`, `65-materials-search.png`; Kill Ledger `c-06-kill-ledger.png`; Skill Info
`c-07-skill-information.png`; Endgame `c-08-endgame-maps.png`, `c-08-endgame-maps-tall.png`; Ascendancy Trials
`c-09-ascendancy-challenges.png`; Weapon Mastery `c-21-weapon-mastery.png`.

### Notes per page

- **Cube Recipes.** Most of the 15% that is not shared is version drift. For example, the fork has "(Giant Sword <-> Long
  Battle Bow)" and "(Katana -> Wrecking Arm -> Assassin Crossbow)", where 3.2.24 has "(Giant Sword <-> Scythe)" and
  "Scissors Suwayyah". So the fork's cube page is a pre-3.2 snapshot (inferred from the 3.12.11 modinfo). The jump labels
  are translated from the Chinese file ("Ancient Relics" stands for the official "Ancient Coupons" section, `rel`).
  In-text links go to Kill Ledger, Anointments, Corruptions and Vessel of Souls.
- **Quest Maps.** HTML comments (167 CJK runs) show the design work: "依 ACT3.xlsx 設計" (designed from ACT3.xlsx), with
  corrections to the original arrows ("原標記為 →… 故改為 ↓"). The Special Areas tab lists the official page's 19 areas
  (Secret Cow Level … Nihlathak's Domain) with 📍 locations, and the official CAUTION text ("Naraku and below are extremely
  difficult areas … 99% people don't use personalize. ;)"). The act notes paraphrase the official notes (Viper Amulet without
  Lost Farm, Teleport restrictions) and add a few of the fork's own, such as "You can enter the Sewers from Lut Gholein's
  southern entrance". There is no Act 1 or Act 4.
- **Materials.** It reads as a guide written in Chinese first: the US text is a translation (terms such as "Ancient
  Decal", "Han Runes", "Soul Vessel"). Its **Translation Notes** table (zhTW "翻譯小知識") maps official item terms to
  Chinese community slang ("咒符=板子", "Charm = Board"; "護身符=項鍊", "Amulet = Necklace"; "獨特裝備=暗金", "Unique = Gold").
  It helps Chinese readers and makes little sense to English readers. "Original Red Portal Guide - Torch" is a section about
  the vanilla Uber Tristram / Hellfire Torch portals. It is not an author credit.
- **Skill Info, Kill Ledger, Weapon Mastery, Endgame Maps.** Close copies, re-wrapped into the fork's styling. The
  official side-navigation, ads and analytics are stripped, which explains most of the size difference (inferred).

## 5. Language handling

**Fork.**

- There are three files per page. The `_TW` and `_CN` files are **independent of the official zhTW/zhCN docs**: their
  text overlap with `docs/zhTW/*` and `docs/zhCN/*` is 0–4%, and the terms differ (fork Kill Ledger "死亡筆記", official
  zhTW "殺死賬本"). So the fork translated the English pages itself (inferred) and ignored the official Chinese pages.
- `_CN` files are mostly Simplified. Cube CN keeps a few Traditional characters (the jump buttons, e.g. "超級/終局地圖配方"),
  and Maps CN keeps some in comments.
- **What stays Chinese in the US files:**
  - the six bilingual search placeholders (§3);
  - one stray "。" on Ascendancy Trials;
  - Chinese HTML/CSS/JS comments (Maps, `common_search.js`);
  - six of the eight US files declare `<html lang="zh">`. Only Maps and Materials say `lang="en"`.
- The live crawl found no other CJK in English body text (`site-live-inventory.md`).

**Ours.** No i18n; everything is English (`<html lang="en">`).

**Takeaway.** Mirroring official pages per language makes the fork maintain 24 static files by hand, and they already lag
the mod. The official site has 13 locales of its own (`docs/zhCN`, `docs/zhTW`, `deDE`, …). Linking to the official locale
is cheaper than translating copies.

## 6. Accessibility and SEO implications

- **Wrong language tag**: `lang="zh"` on English content makes screen readers use a Chinese voice. Search engines may
  also mis-classify the page (inferred).
- **No heading structure**: Cube, Endgame, Kill Ledger, Materials, Skill Info and Weapon Mastery have no `h1`–`h4` at all
  (titles are styled `div`/`b`). Jump buttons are `onclick` buttons, not links, so sections cannot be bookmarked.
- **Iframe title** is the slug, for example "cube-recipes".
- **Theming**: the iframe pages have fixed dark colours (`background: #0a0b0e` on the iframe), so the fork's light theme
  does not reach them (inferred from the hard-coded background).
- **SEO**: the SPA route `/cube-recipes` has no content of its own. The indexable text lives at
  `/pages/cube-recipes/cube-recipes_US.html`. A search hit there opens a page with no site navigation. The language
  versions are not linked with `hreflang` (none of the files has it) (inferred). Whether the fork serves a sitemap or
  robots rules is unknown.
- **Search feedback**: nothing tells you when a filter hides everything (`65-materials-search.png`).

Our guide renders notes as real React pages with headings, per-note URLs, theme support and `lang="en"`. Our
`public/sitemap.xml` has 11 URLs. It lists `/guide`, but none of the `/guide/:slug` notes and not `/guide/map`.

## 7. Known issues

| Issue | Evidence | Status |
|---|---|---|
| Materials search "Jah" → 0 rows, and the page goes blank below the buttons | `65-materials-search.png` | **Not a search bug**: the Runes table lists rune *families* (LoD, Ancient Decal, ESR, Rune/Decal Stocker, Kanji), not single runes. "Jah" does not appear in the file. It is a content gap with no "no results" feedback. |
| Bilingual search placeholders in English | §3 | confirmed |
| `lang="zh"` on six US files | §5 | confirmed |
| Iframe links change content without changing the URL; back/forward and sharing break | `site-live-inventory.md` "Iframe-based guide pages" | confirmed (live) |
| Pages lag the mod (cube drift vs 3.2.24) | §4 Cube notes | confirmed against our clone |
| "Gems/Crystals" guide entry is a dead `href="#"` (route `/socketables` not enabled) | bundle L55703-55711, `66-gems-crystals-link.png` | confirmed |
| Skill Info keeps "please contact me on discord" (the ESR author's line) | `skill-information_US.html`, official `skill_information.htm` L145 | confirmed; misleading out of context |

## 8. Comparison with our Guide

| Aspect | Fork guide pages | Our Guide (`src/features/guide`, `content/guide/`, `docs/features/GUIDE.md`) |
|---|---|---|
| Unit | 8 long reference pages | 31 short notes (target 150–250 words, warning above 400), 5 spine steps, 47 glossary terms |
| Source of truth | HTML copied from the official docs, edited by hand | Markdown written by us; numbers come from directives over the game files (`::recipes[family]` with 33 curated cubemain families, `::secret-recipes`, `::recipe-output`, `::source`, `::vendor`, `::card`, `::difficulty-penalties`) |
| Freshness | none (no version stamp; content is from 3.12.x) | `verified` ESR version, `.verify-lock.json` block hashes, patch-note mention scan, draft / fresh / review / old badges (`engine/freshness.ts`). All 31 notes are still draft (no `verified:` stamp yet). |
| Navigation | nav menus, in-iframe relative links, no URL state | per-note URLs `/guide/:slug`, `[[wikilinks]]`, backlinks, local graph, `/guide/map` (d3-force), "Next on your path" |
| Links into the app | 3 `target=_top` links (Anointments, Corruptions, Vessel) | `rw:`, `gw:`, `unique:`, `mythical:`, `socketable:`, `base:`, `type:`, `bestbase:`, `affixes:`, `page:` → `?name=` focus or filtered pages; the build fails on a broken target |
| Official docs | mirrored and translated | linked: `docs:` scheme and the `officialDocs` frontmatter (e.g. `kill-ledger.md` → `docs:kill_ledger.htm`, `cube-basics.md` → the cube page). "The official site is linked, never mirrored" (`docs/features/GUIDE.md` Attribution). |
| Drop info | Materials "Source" column (free text such as "Buy from [Gheed] in Act 1") | `sources.json` labels in `::source` blocks + "Look it up in the Drop Finder ↗" (`dropfinder:` scheme, no deep links) |
| Search | substring row filter per page | note search on the spine screen; AND-term search on browse pages |
| Languages | 3 | English only |
| Topic coverage | cube (all), materials, Act 2/3/5 routes, special areas, endgame bosses, mercs/oskills, Kill Ledger, Weapon Mastery, ascendancy trials | the same systems as short notes (`kill-ledger`, `weapon-mastery`, `mercenaries-oskills`, `endgame-roadmap`, `maps-keys-ascendancy`, `ascendancies` with in-game-checked orb locations, `stockers`, `dragon-stones`, `loot-triage`, `cube-basics`, `secret-recipes`, `tinkering`, `forging`, …); **no** full cube table, **no** quest routes, **no** materials index |

## 9. What each side offers

**The fork offers readers what we lack:**

1. **One searchable page with every cube recipe** (894 rows, 25 jump buttons). We show 33 curated families of at most
   12 rows each, inside notes, and send readers to the official page for the rest.
2. **A quest-route walkthrough** for Acts 2, 3 and 5, as clickable flowcharts with waypoints, one-way warnings and quest
   locations. Our guide has nothing like it, and `endgame-roadmap` / `hell-survival` only mention special areas.
3. **A materials index** (Item / Use / Source with icons) for ESR's new drops: stockers, aura stones, organs, red portal
   items, blessed charms. Our closest pieces are the `loot-triage` and `stockers` notes, the Socketables page and the
   loot-filter Misc browser. None of them is one "what is this item and what do I do with it" table.
4. Chinese-language versions of all of the above.

**We offer what the fork's pages lack:**

1. Numbers generated from the game files of the current release, and a build that fails when a referenced item or
   recipe disappears.
2. Staleness tracking per note, with the reasons shown.
3. Deep links: per-note URLs, `?name=` item focus, share links. The fork has no URL state anywhere.
4. Content that is ours. The guide does not republish the official docs, so it doesn't lag them and raises no copying
   questions.
5. Live item cards (`::card`), glossary hovers, a note graph and the `/guide/map` overview.

## 10. A sensible path for us

1. **Cube recipe reference generated from `cubemain.txt`, not copied from the docs.** We already parse cubemain at build time
   (`src/features/guide/build/cubeFamilies.ts`, `cubeText.ts`, the stat renderer). A `/game-data/cube` screen (or a
   `::recipes[*]` "all families" view) could list every row: inputs, outputs, output bonus, grouped by family/section, with
   our token search, "header match shows the group" filtering, `?search=` / `?family=` URL state and an empty-state
   message. Caveats: cubemain `description` cells are developer labels, so readable inputs need `cubeText.ts`; there are
   about 17.8k non-empty lines (includes trap and marker rows that we already hide). Keep a "See the official Cube Recipes
   page ↗" link for the caveat text (Forging notes, Stockers at Gheed). Effort M–L.
2. **Link to the official docs, per locale where useful.** We already link with `docs:`. A "Reference" strip on `/guide` with
   the official Cube, Maps, Endgame Maps, Kill Ledger, Weapon Mastery and Skill Information pages would cover the fork's
   six copied pages at almost no cost. Effort S.
3. **Quest-route walkthrough as our own notes.** If the owner wants it, write short Act 2/3/5 route notes in our voice,
   based on facts checked in-game and on the official Maps page. Draw any diagram ourselves (inline SVG or a Mermaid-style
   list). Do not reuse the fork's flowchart markup or wording. Effort M (writing), S per act.
4. **Materials index from data.** `sources.json`, `lootfilter.json` and the misc browser groups already know the ESR misc
   items and how each is obtained. A "Misc items" table (icon, name, how to get, used in → recipe family / note) would answer
   "what is this item?" from data. Effort M. The guide's "I found an item I don't recognise" question could link to it.
5. **Skip**: iframe embedding, per-language HTML copies, and the Translation Notes glossary (it is Chinese community slang).
   Revisit translation only if we ever add i18n (see [05-data-pipeline-and-i18n.md](05-data-pipeline-and-i18n.md)).

## 11. Licensing considerations (not legal advice)

- The official ESR docs carry no explicit licence: no LICENSE file in the ESR repo clone, and no licence or copyright line
  in `docs/*.htm*`. With no licence, reuse rights are unclear, so copying or translating them should be treated as needing
  the author's permission. This is a consideration, not legal advice.
- Six of the fork's pages are such copies. Our current policy avoids the question: "The official site is linked, never
  mirrored", and the CC BY-SA 3.0 community wiki is "consulted for facts only; no text or images are copied"
  (`docs/features/GUIDE.md`, `content/guide/_sources.yml`).
- Tables generated from the mod's game files (cubemain) are a different case from copying the authored HTML. Our app
  already ships derived game-data bundles. Credit ESR as the source on such a page, as `_sources.yml` does for notes.
- The fork's original pages (Maps flowcharts, Materials) are the fork's own work, and the fork is closed source with no
  stated licence. Do not copy their text, markup or images. Using them as a pointer to which topics readers want is fine.
- The boss images and orb icons on the fork's pages are the official docs' and the mod's art. If we ever show mod art, take
  it from the mod files and credit it. Do not take it from the fork.

## 12. Open questions

1. Does the fork plan more original pages? The dead "Gems/Crystals" entry (`/socketables`) suggests one is planned (inferred).
2. Was the fork's cube page taken from 3.12.x docs on purpose, and is it updated per ESR release? There is no version stamp
   on the page.
3. Does the fork serve a sitemap or robots rules that expose `/pages/*.html` directly?
4. Our `public/sitemap.xml` lists only `/guide`, not the 31 notes. Should the guide generator write note URLs into it?
5. Would the ESR author agree to us mirroring or generating reference tables from the docs? Asking on the ESR Discord would
   settle the licensing question for item 1 of §10 (generated from game files) and any future docs reuse.
6. Are the fork's Act 2/3/5 routes accurate for 3.2.x? The official Maps page is the only comparison point. Nobody has
   checked them in-game.
