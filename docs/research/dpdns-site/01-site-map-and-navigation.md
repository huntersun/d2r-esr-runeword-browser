# 01 - Site map, navigation and app shell

**In short.** The fork (d2r.dpdns.org, "ESR Website" / 東日美化版) keeps our app's skeleton (one layout route, a header, a
right-side settings sheet, the same `/builds`, `/build/:id` and `/user/:id` routes) but rebuilds the information architecture
around a Chinese-community "newcomer" reading flow. `/` becomes an "ESR Newcomer Guide" landing page, runewords move to
`/runewords`, and the flat header becomes seven groups (Guides / Cube / Ascendancy / Runewords / Equipment / Enhance /
Builds) with dropdown panels that carry icons and subtitles. It adds a language switcher (繁/简/EN), a QQ group dialog,
eight iframe guide pages and several new reference pages. It also drops all URL query state, so nothing on the site is
shareable or deep-linkable. It has none of our Guide notes, Game Data, Loot filters, Socketables or Favourites UI.

Sources: `analysis/site-live-inventory.md` (live browse on 2026-10-22, 1400x900 and 390x844), the fork's main bundle
`site/index.pretty.js` (cited as `bundle L<n>`), and our `src/core/router/index.tsx`, `src/core/components/Header.tsx` and
`docs/technical/NAVIGATION.md`. Sibling documents: page content is in `02-reference-pages.md` and `03-guides-pages.md`,
builds in `04-builds-and-item-editor.md`, data and i18n in `05-data-pipeline-and-i18n.md`, and auth, favourites and the
removed URL state in `06-backend-auth-and-removed.md`.

---

## 1. Route tree

### Fork

All routes are children of one layout `rFe` (bundle L57330: header `w5e`, `<main>`, settings sheet `k5e`, auth dialogs,
toaster). The router is a `createBrowserRouter` at the site root with no basename (bundle L75066-75100). Every page
component is in the main bundle. Only the auth, builds, favourites and mod-info sagas are lazy chunks (bundle L17581-17635).

Record counts are the H1 counts seen live (the fork puts the count in the H1, e.g. "Runewords (409)").

```
/                         ESR Newcomer Guide landing (React)                         lFe L57465
├── Guides ▾
│   ├── /maps             Map & Quest Guide            iframe                        pi page="maps"
│   ├── /materials        Materials ("Item Guide")     iframe
│   ├── /kill-ledger      Kill Ledger                  iframe
│   ├── /skill-information Skill Info                  iframe
│   ├── (/socketables)    Gems/Crystals                dead link, no route
│   └── /endgame-maps     Endgame Maps                 iframe
├── /cube-recipes         Cube Recipes                 iframe (plain nav link, no panel)
├── Ascendancy ▾
│   ├── /ascendancy-challenges  Ascendancy Trials      iframe
│   └── /ascendancies     Ascendancy Classes (15 cards)                               LHe L62943
├── Runewords ▾
│   ├── /runewords        Runewords (409)                                             KM kind=runewords
│   └── /gemwords         Gemwords (590)                                              KM kind=gemwords
├── Equipment ▾
│   ├── /mythicals        Mythical Uniques (46)   featured tile; desktop only          UFe L59064
│   ├── /uniques          Unique Items (1030)                                          HFe L58661
│   ├── /sets             Sets (71)                                                    _je L61576
│   ├── /weapons          Weapon Bases (390)                                           RC kind=weapons
│   └── /armors           Armor Bases (239)                                            RC kind=armors
├── Enhance ▾
│   ├── /anointments      Anointments (29; the banner says "30 total")                 fHe L62376
│   ├── /corruptions      Corruptions (11 slot cards)                                  aHe L61963
│   ├── /vessel-of-souls  Vessel of Souls (tier tabs: Tier 1 177 / Tier 2 36 / ... / Completion 29)   AHe L62617
│   └── /weapon-mastery   Weapon Mastery               iframe
├── /builds               Builds list (30 cards seen; page size 50)                    XHe L69155
│   ├── /builds/new       create (signed out: redirects to /builds)                    CWe L74214
│   └── /builds/:buildId/edit                                                          AWe L74252
├── /build/:buildId       Build detail                                                 LWe L74451
├── /user/:userId         Public profile + builds                                      PWe L74898
└── *                     404                                                          FWe L75049
```

There are 26 route entries in total: 1 landing page, 12 React reference or system pages, 8 iframe guides, 5 builds routes
and the 404. The nav may link only to routes in the allowlist `Zu` (bundle L55564-55587). An item whose `to` is not in `Zu`
is rendered as a non-link (section 3.4). `/` is not in `Zu`, but it is reached through the brand link, which bypasses the
allowlist.

### Ours (v1.23.0)

`src/core/router/index.tsx`: `createBrowserRouter` with `basename: import.meta.env.BASE_URL` (GitHub Pages subpath). Every
screen is `React.lazy` + `Suspense`, and a guard test (`src/core/router/routeCodeSplitting.test.ts`) keeps it that way.
There are three nested sections (`/guide`, `/game-data`, `/loot-filters`), each with a layout route. The table in
`docs/technical/NAVIGATION.md` lacks `/guide/map`, which the router defines (line 152).

### Route comparison

| Area | Ours | Fork | Notes |
|---|---|---|---|
| Home `/` | Runewords browser | "ESR Newcomer Guide" landing | Fork's runewords live at `/runewords` |
| Runewords | `/` | `/runewords` | Same feature, different path |
| Gemwords | `/gemwords` | `/gemwords` | |
| Uniques | `/uniques` | `/uniques` | |
| Mythicals | `/mythicals` | `/mythicals` | Fork: missing from the mobile drawer |
| Ascendancies | `/ascendancies` | `/ascendancies` | |
| Builds list / new / edit / detail / user | `/builds`, `/builds/new`, `/builds/:buildId/edit`, `/build/:buildId`, `/user/:userId` | identical paths | Fork: blank on direct load (section 8) |
| 404 | `*` NotFoundScreen | `*` FWe | Fork shows raw i18n keys |
| Guide spine | `/guide` | none | Fork's "Guides" are iframe pages instead |
| Guide map | `/guide/map` | none | |
| Guide note | `/guide/:slug` | none | |
| Socketables | `/socketables` | none (dead "Gems/Crystals" nav item) | |
| Game Data: Bases | `/game-data/bases` | partly `/weapons` + `/armors` | Fork's are static tier tables (see 02) |
| Game Data: Best Base | `/game-data/best-base` | none | |
| Game Data: Affixes | `/game-data/affixes` | none | |
| Game Data: Item Types | `/game-data/types` | none | |
| Loot filters | `/loot-filters`, `/loot-filters/:id` | none | |
| Favourites | per-page star + "Favourites only" toggle (not a route) | none (the saga runs, but there is no UI) | See 06 |
| Landing page | none | `/` | |
| Sets | none | `/sets` | We have no set items browser |
| Weapon / Armor bases as separate pages | none (one Bases page with a kind filter) | `/weapons`, `/armors` | |
| Corruptions | none | `/corruptions` | |
| Anointments | none | `/anointments` | |
| Vessel of Souls | none | `/vessel-of-souls` | |
| Iframe guides | none (we link out to ESR Documentation) | `/cube-recipes`, `/maps`, `/materials`, `/kill-ledger`, `/skill-information`, `/endgame-maps`, `/ascendancy-challenges`, `/weapon-mastery` | See 03 |
| External links | header "ESR Documentation", "Changelog", GitHub icon | none in the header; links only in the settings credits | |

---

## 2. Header

**Fork** (`w5e`, bundle L55600-55985; `02-menu-*.png`, `c-01-home.png`). Sticky, `bg-card`, `min-h-14`. From left to right:

1. A hamburger (below `lg`, 1024 px) that opens the left drawer.
2. The brand link to `/`: `t("brand")` = "D2R ESR" in English, "東日美化版" in zhTW, "东日美化版" in zhCN (`00-home-zh.png`).
3. The desktop `NavigationMenu` (shown at `lg` and wider), centred: the `eC` groups plus a Builds link. The Builds link only
   renders when Supabase is configured (`AR` = `isConfigured`, bundle L17152).
4. On the right:
   - the auth control `y5e` ("Sign In" button, or an avatar menu with My Builds, Profile and Sign Out; both menu items link
     to `/user/:id`, bundle L55392-55393);
   - the language dropdown, which shows `繁`/`简`/`EN` and lists 繁體中文 / 简体中文 / English with a check mark
     (`13-language-menu.png`);
   - the QQ button. Its icon is the QQ penguin silhouette path (`S5e`, bundle L55589); at 16 px it reads as a bell, which
     is how the live inventory describes it. Its aria label is "Join QQ Group".
   - the settings gear.

Live, the order on the right is Sign In, EN, QQ, gear. This matches the code, where `y5e` comes first (bundle L55820).
The bundle inventory lists the controls in a different order.

**QQ dialog** (bundle L55986-56000, `11-qq-group.png`): a 300 px dialog. It has the title "Join Discussion", the hint "Scan
the QR code to join the QQ group", the image `/QQ.jpg` and the line "Group ID: 821435926" (`b5e`, bundle L55563). This is
the fork's only community link. There is no Discord or GitHub link in the header.

**Ours** (`src/core/components/Header.tsx`): brand, a flat list of links (Runewords, Guide, Gemwords, Socketables, Uniques,
Mythicals, Ascendancies, Game Data, Loot Filters, Builds when Supabase is configured, plus external "ESR Documentation" and
"Changelog"), with priority-plus overflow into a "More" menu. The desktop nav starts at `md` (768 px). On the right are a
theme toggle, a GitHub link, the auth controls and the settings cog.

**Difference / takeaway.**
- The fork drops our quick theme toggle, the GitHub icon and the external ESR Documentation and Changelog links. It adds the
  language switcher and the QQ dialog.
- Grouping replaces priority-plus overflow. Seven top-level labels fit at 1024 px, so the fork needs no "More" menu.
  Our ten-plus flat links already overflow on mid-size screens.

---

## 3. Navigation groups and dropdown panels

### 3.1 Structure (`eC`, bundle L55444-55562)

| Group | Kind | Items (label, subtitle as in `en-flat.txt`) |
|---|---|---|
| Guides | group | Map "Walkthrough maps and guides" · Materials "Material uses and info" · Kill Ledger "Monster kill ledger" · Skill Info "Skill system info" · Gems/Crystals "Gem and crystal bonuses" (disabled) · Endgame Maps "Boss map info" |
| Cube | link | `/cube-recipes` |
| Ascendancy | group | Ascendancy Trials "Trial challenges" · Ascendancy Classes "Classes and tier bonuses" |
| Runewords | group | Runewords "Rune combinations and bonuses" · Gemwords "Gem combinations and bonuses" |
| Equipment | group with a featured tile and 2 columns | featured: Mythical Uniques "Mythical unique items"; column 1: Unique Equipment "Unique items", Sets "Set items"; column 2: Weapon Bases "Weapon base data", Armor Bases "Armor base data" |
| Enhance | group | Anointment · Corruption · Vessel of Souls · Weapon Mastery (each "... system") |
| Builds | link | rendered separately, only when Supabase is configured |

In zhTW the groups read 遊戲攻略 / 盒子公式 / 昇華系統 / 符文之語 / 裝備資訊 / 裝備強化 / 流派構建 (`00-home-zh.png`).

### 3.2 Panels

- **Plain groups** render a `<ul>` grid, 440 px wide (560 px at `lg`, two columns). Each item shows a lucide icon
  (`size-4`, 70 % opacity), a bold label and a one-line subtitle (`line-clamp-1`) (bundle L55720-55765,
  `02-menu-guides.png`, `02-menu-runewords.png`).
- **Equipment** is the only group with `featured` + `columns`. The panel has a 176 px (`w-44`) featured tile on the left: a
  gradient background, a large crown icon, "Mythical Uniques" and its subtitle. Next to it are two item columns
  (bundle L55640-55718, `02-menu-equipment.png`).
- The subtitles are thin. Most only restate the label ("Unique items", "Anointment system").

**Ours:** no dropdowns. Every header entry is a plain tab-style `NavLink` (`navTabClasses.ts`). Sub-navigation exists only
inside `/game-data` (Bases | Best Base | Affixes | Item Types) and in the loot filter editor tabs.

**Takeaway.** A grouped menu is a cheap fix for our header overflow (S effort). The natural groups for us would be
Recipes (Runewords, Gemwords, Socketables), Items (Uniques, Mythicals, Bases), Tools (Best Base, Affixes, Item Types,
Loot Filters), Guide and Builds. The featured tile is decoration and not worth copying on its own.

### 3.3 Mobile accordion drawer (bundle L55875-55984; `m-09-nav-drawer-mobile.png`, `m-10-nav-drawer-expanded-mobile.png`)

- A left `Sheet`, 288 px wide (`w-72`), titled with the brand.
- Each group is a full-width bold button with a chevron. It expands with a `grid-template-rows` 0fr to 1fr animation, and
  only one group is open at a time (`f`/`y` state).
- Group items appear as an indented list (`border-l`) with labels only: no icons and no subtitles.
- Cube is a plain link. Builds is a bold link at the bottom, shown only when Supabase is configured.
- **Mythical Uniques is missing.** The drawer builds each group's items with
  `b.items ?? b.columns.flatMap(c => c.items)` (bundle L55917). This ignores `featured`, so the Equipment group lists only
  Unique Equipment, Sets, Weapon Bases and Armor Bases. On a phone, `/mythicals` is reachable only through the landing page's
  Reference card.
- The header row keeps Sign In, EN, the QQ icon and the gear at 390 px.

**Ours:** a left `Sheet` titled "Navigation" with every entry as a flat list, plus `AuthControls` at the bottom
(`Header.tsx` lines 133-166).

### 3.4 Dead "Gems/Crystals" item

`/socketables` is in `eC` (bundle L55467) but not in the `Zu` allowlist, and no route exists for it. On desktop it renders as
`<a href="#">` with `preventDefault`, so a click does nothing. In the mobile drawer it renders as a `<span>` whose click only
closes the drawer (bundle L55928-55937). Live: `66-gems-crystals-link.png`. All `socketables.*` i18n keys are unused, which
suggests our Socketables page was dropped and the slot was kept for later (inferred).

---

## 4. Landing page vs our runewords-first home

**Fork** (`lFe`, bundle L57465-57594; `c-01-home.png`, `c-01-home-tall.png`, `01-home-en-full.png`,
`m-01-home-mobile.png`). The copy is in a page-local table `sFe` (bundle L57343-57455) with inline enUS/zhTW/zhCN values,
not in the i18n dictionaries.

- **Hero:** H1 "ESR Newcomer Guide" (zhTW "東日美化版｜新人攻略首頁") and "Stuck on a quest? Unsure what an item does?
  Everything is one click away."
- **Two hero cards** with an emoji, a coloured border and "Open →":
  - 🗺️ "Quest Maps", "Stuck? Follow the full quest routes", links to `/maps` (red);
  - 📖 "Item Guide", "Unsure what an item does? Check its use, source and crafts", links to `/materials` (gold).
- **SYSTEMS** (4 cards):
  - 🧪 Blessing System links to `/materials`. Its keys are `home.cubeTitle` / `home.cubeDesc`, so the card was probably
    re-pointed from the cube page (inferred).
  - ⚗️ Corruption links to `/corruptions`.
  - 🔥 Endgame Maps ("The endgame grinding core after level 99") links to `/endgame-maps`.
  - ⬆️ Ascendancy Challenges ("15 class specializations") links to `/ascendancy-challenges`.
- **REFERENCE** (4 cards):
  - ⚔️ Mythical Uniques links to `/mythicals`, using the keys `home.weaponsTitle` / `home.weaponsDesc` (also re-pointed,
    inferred).
  - 🛡️ Uniques links to `/uniques` (`home.armors*`).
  - 👑 Sets links to `/sets`.
  - 🧙 Skills links to `/skill-information`.
- **NEWCOMER TIPS:** four rows with a yellow left border: "Level cap is 110; endgame maps open after level 99.", "Three
  enhancement routes: Bless, Forge and Corrupt.", "Check the Cube Recipes before crafting.", "Stuck? Check the quest maps
  first."
- **Footer line:** "ESR — fan-made reference. Enjoy the game!"
- The page has no controls and no live data. On mobile the hero cards stack and the card grids become two columns.
- Neither runewords nor builds is linked from the landing page.

**Ours:** `/` is the Runewords browser itself (filters, cards and Copy Link). New-player orientation lives at `/guide`: a
five-step "Start here" spine with 31 notes, note search and "I found something" questions, marked "Experimental".

**Difference / takeaway.**
- The fork assumes visitors arrive with a question ("where is the quest", "what is this item") and routes them to static
  guide pages. We assume they arrive to look up runewords.
- Our `/guide` spine already covers the same need, with better content. What the fork gets right is discoverability: its
  entry point is the home page, while ours is one header tab among ten.
- A low-cost option would be a small "New to ESR? Start here →" banner on our runewords home that links to `/guide`. That
  keeps runewords-first deep links (`/?name=...`) working.

---

## 5. Settings sheet

**Fork** (`k5e`, bundle L56045-56240; provider `b_`, bundle L26260-26300; `10-settings.png`, `14-settings-light.png`). A
right-side sheet with the following sections:

| Section | Fork | Ours (`src/core/components/SettingsDrawer.tsx`) |
|---|---|---|
| Theme | Dark (default) / Light, `localStorage.theme` | same |
| Language | segmented 繁體中文 / 简体中文 / English, `localStorage["d2r-language"]`, default `zhTW` | none (no i18n) |
| Font | "Use Diablo 2 style font", `localStorage.useDiabloFont` | same |
| Text size | slider from 14 to 20 px in 1 px steps (`RS=14`, `DS=20`, `f_=1`, bundle L26230-26232), default 16, 4 labels under it (Small / Normal / Large / Extra Large), `localStorage.textSize` as a number. The value is also posted to the iframe guides. | 4 discrete steps (small 14 / normal 16 / large 18 / extralarge 20, `src/features/settings/constants/textSize.ts`) |
| Data | none (the `settings.data.*` keys are unused) | "Force Refresh Data" |
| Info | none (the `settings.info.*` keys are unused) | app version, ESR version, last updated, cached-data warning |
| Credits & License | "Original Mod Author: Celestialray", Eastern Sun Resurrected (easternsunresurrected.com), "Open-Source Project: d2r-esr-runeword-browser ↗", "Original Author: István Pánczél ↗" | none |

- The fork keeps settings in React context (`b_`/`TS()`), not Redux, and applies them in a mount `useEffect`.
- Its `index.html` is a bare Vite shell (`<html lang="zh-TW" class="dark">`, no inline script). A light-theme or large-text
  user therefore probably sees a dark, 16 px first paint (inferred).
- Ours applies theme, font and text size before first paint with an inline script in `index.html`.

**Takeaway.** The credits block is a nice touch and costs nothing. The 7-position slider adds nothing over our 4 steps.
Dropping the version and refresh info removes the only place a user can see which ESR data version they are looking at.

---

## 6. 404 page

**Fork** (`FWe`, bundle L75049-75064; `67-404.png`): a large yellow "404" (`#F7D51D`), then `t("notFound.title")`,
`t("notFound.message")` and a yellow button `t("notFound.backHome")` that links to `/`. None of the three `notFound.*` keys
exists in the dictionaries (`analysis/en-flat.txt` has only feature-scoped keys such as `builds.notFound`), so the page shows
the raw keys in every language. `/builds/create` and `/builds/<anything>` also land here.

**Ours** (`src/core/router/NotFoundScreen.tsx`): "Page Not Found", "The page you are looking for does not exist." and a
"Back to Runewords" button. Because we host on GitHub Pages, deep links first pass through `public/404.html`, which stores
the URL for the SPA. The fork's Cloudflare host serves `index.html` for any path; for example, a request for
`/assets/index.js.map` returned the HTML shell (`site/index.js.map`, 494 bytes).

---

## 7. URL state and deep links

**Fork.** The page code never calls `useSearchParams` or `URLSearchParams` and never reads `?name=` or `location.hash`
(bundle inventory section 1). Live, no search, filter, tab or toggle changed the address bar on any React or iframe page
(`site-live-inventory.md`, "No URL state"). Links between iframe guides change only the iframe's document, so the SPA URL
stays on the first guide. The only shareable URLs are paths: `/build/:id` (copied with "Copy Link", which copies
`window.location.href`) and `/user/:id`. The `copy.help.*` and `search.help.*` keys survive unused.

**Ours.**
- Filter params (`search`, `sockets`, `maxlvl`, `items`, `runes`, `tierpts`, `gems`, `name`, plus per-page keys such as
  `cats`, `coupon`, `categories`, `onlyHighest`, and the Game Data and loot-filter `tab` keys) are read on mount and then
  removed from the address bar.
- `CopyLinkButton` rebuilds a share URL from the current state. It is used on the runeword, gemword, socketable, unique,
  mythical, ascendancy, bases, affixes and best-base filters, and on build detail.
- `?name=<Name>` gives an exact-name focus with a dismissible "Showing: <Name> ×" chip
  (`docs/technical/NAVIGATION.md`). Guide notes link to items through it.

**Takeaway.** This is the largest shell regression in the fork. A Chinese-community QQ group shares screenshots rather than
links, which may explain why it was cut (inferred). For us, Copy Link and `?name=` are load-bearing: guide links and Best Base
links depend on them. More in `06-backend-auth-and-removed.md`.

---

## 8. Notices, bugs and rough edges in the shell

| Item | Fork | Ours |
|---|---|---|
| "Experimental" / "Under development" frames | None. No page carries a status notice, including the fork-authored Maps and Materials guides. | `DevNotice` (amber, `src/core/components/DevNotice.tsx`) on every `/guide*` page ("Experimental.") and every `/loot-filters*` page ("Under development."), from `GuideLayout.tsx` and `LootFilterLayout.tsx` |
| Direct load of `/builds`, `/build/:id`, `/user/:id` | Renders an empty shell (list) or an empty `<main>` (detail, profile). No Supabase query is sent, even after 30 s, in a fresh context (`24b-build-detail-direct-load.png`). It works after in-app navigation. Shared "Copy Link" URLs therefore open blank. | Works |
| Light theme | Search and number inputs and the three rune-filter pills stay black with dark text, which is nearly unreadable (`15-runewords-light-d2font.png`, `14-settings-light.png`) | No known issue |
| 404 copy | Raw i18n keys | Translated (English only) |
| Dead nav item | "Gems/Crystals" | none |
| Mobile drawer | Mythical Uniques missing | All entries present |
| Mobile Builds search | Collapses to a sliver between Create Build and the class select (`m-04b-builds-loaded-mobile.png`) | n/a |
| Document title | Always "ESR Website" | Always the static `index.html` title ("ESR Runeword Browser - ..."); no per-page titles either |
| SEO metadata | `index.html` has no description, OG or Twitter tags | description, OG and Twitter tags, `sitemap.xml`, `robots.txt` |

**Likely cause of the direct-load bug (inferred).**
- The fork renders the router first and only then imports and registers the auth, builds and favourites sagas
  (`vH()`, `SH()`, `wH()` after `createRoot().render`, bundle L75103-75107 and L17581-17635).
- A builds page that mounts immediately dispatches its fetch action before `buildsSaga` is listening, so the action is lost.
- In our app the same late-registration pattern exists (`src/main.tsx` lines 55-68, `src/core/startup.ts`). It is hidden
  because `AppLayout`'s HTM "Loading data..." gate delays mounting `/builds*` until the data sync has initialised
  (`STATIC_BUNDLE_ROUTE_PREFIXES` exempts only `/guide` and `/loot-filters`).
- The fork removed the HTM gate (its data is pre-built JSON), which exposes the race.
- Worth remembering if we ever exempt `/builds` from the gate.

---

## 9. Mobile layout (390 px)

Observed live (`m-01-home-mobile.png` to `m-11-build-detail-mobile.png`):

- No page scrolls horizontally at 390 px.
- The landing hero cards stack, and the Systems and Reference grids become two columns.
- The reference pages' card grids become one column, and the icon-tile category pickers become four columns
  (`m-02-runewords-mobile.png`, `m-03-uniques-mobile.png`, `m-06-weapons-mobile.png`).
- The iframe guides keep their own responsive styling inside the auto-height iframe (`m-05-cube-mobile.png`,
  `m-08-maps-mobile.png`).
- The header keeps four right-side controls, so the brand plus the hamburger are all that fit on the left.
- Our mobile header and drawer were not re-measured for this comparison.

---

## 10. Load time and shell weight

- **Fork:** each page reached `networkidle` in about 3.3-3.9 s in headless Chrome. There was no long first-load parse, and
  the only console error was the blocked Cloudflare Insights beacon.
- Every page also requests `/EasternSun/modinfo.json` and the Supabase `favorite_counts` (on the fork's own project,
  `zbwhqioeoacnsnrbnipd`).
- All page components are in one main script of 2,468,150 bytes minified (`site/index.js`, 75,199 lines when
  pretty-printed). About 7,000 game-string entries per locale and three UI dictionaries are inlined in that script
  (see 05). Page data then comes from per-page JSON.
- **Ours:**
  - route-level code splitting;
  - lazy Supabase SDK;
  - a first visit that scrapes and parses the ESR HTM pages in the browser (behind "Loading data..."), then reads from the
    IndexedDB cache.
- We did not measure our own load time for this document, so no head-to-head number is given.

---

## 11. Five most notable shell and IA differences

1. **Landing page instead of runewords at `/`.** The fork opens on an "ESR Newcomer Guide" hub of static cards, and
   runewords move to `/runewords`. Our home is the runewords browser, and onboarding is a separate `/guide` tab.
2. **Grouped nav with descriptive dropdowns.** Seven groups (Guides / Cube / Ascendancy / Runewords / Equipment / Enhance /
   Builds) with icon and subtitle panels and a featured Mythicals tile, replacing our flat priority-plus header. The mobile
   drawer is an accordion, but it silently drops the featured item (Mythicals).
3. **No URL state at all.** There are no query params, no Copy Link on lists and no `?name=` focus. Only build and profile
   paths are shareable, and those render blank on a direct load.
4. **Three-language shell plus a QQ community hook.** The 繁/简/EN switcher sits in the header and the settings (default
   zhTW), alongside a QQ QR dialog and credits. Our theme toggle, GitHub icon, external ESR Documentation and Changelog links,
   and the data-refresh and version info are gone.
5. **A different content scope.** The fork adds a landing page, Sets, separate Weapon and Armor base pages, Corruptions,
   Anointments, Vessel of Souls and eight iframe guides. It lacks our Guide notes and map, the Game Data section (Best Base,
   Affixes, Item Types), Loot filters, Socketables (a dead link) and the Favourites UI. It also has no
   "experimental" or "under development" framing anywhere.

---

## Open questions

- Is `/socketables` ("Gems/Crystals") planned, or a leftover? The nav keeps the slot, but the page and its keys are unused.
- Does the direct-load blank on builds routes happen for signed-in users too? Only signed-out sessions were tested, and the
  cause given above is inferred from the startup order.
- Does the light theme or large text flash dark or 16 px on first paint? This is inferred from the missing pre-paint script
  and was not observed.
- Is the fork's 3.3-3.9 s `networkidle` dominated by the 2.47 MB main script or by the per-page JSON? It was not broken down
  per request.
