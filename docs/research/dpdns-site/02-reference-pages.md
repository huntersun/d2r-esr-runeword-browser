# Reference pages: fork vs ours

**In short.** The fork rebuilt every data page from offline-generated JSON (`/data/*/*.json`, keyed D2R string IDs plus args) and gave them one visual language: an H1 with the result count, a search box, number inputs, chip filters, a tabbed **icon-tile picker drawn from the mod's own HD item art**, and a card or table grid. Seven pages are new to us in form or substance: Sets, Weapon/Armor Bases as tier-trio tables, and the three "Enhance" pages (Corruptions, Anointments, Vessel of Souls) drawn as cube-recipe diagrams. What the fork lost is just as clear. No filter state reaches the URL, nothing deep-links, the cards open nothing, there are no favourites, and its data is from ESR 3.12.11 (we have game files at 3.2.24). Our strongest assets in comparison are URL state, Copy Link, `?name=` focus, Source lines, the strict rune filter with tier points, Best Base and the type tree. The art-driven pickers, the Sets page and the recipe-card presentation of enhancement outcomes are the ideas most worth borrowing.

Related: [01-site-map-and-navigation.md](01-site-map-and-navigation.md) (routes, nav), [05-data-pipeline-and-i18n.md](05-data-pipeline-and-i18n.md) (record format, string keys), [07-opportunities.md](07-opportunities.md) (overall ranking).

Evidence conventions: `bundle L<n>` = line in the fork's `site/index.pretty.js`; `remote-data/<file>` = the fork's JSON as fetched; `screens/<file>.png` = live screenshots (2026-10-22, 1400×900 unless `m-` = 390 px). All stat lines in the fork's records have the shape `{key, args[], priority, mythical?, perLevel?}` and are formatted at runtime by a D2R-style format engine (`Wr()`, bundle L57741). Samples below keep only a few fields.

## Shared pattern on the fork

| Aspect | Fork (all React reference pages) |
|---|---|
| Header | H1 with live count, e.g. "Runewords (409)", "Unique Items (26)" after filtering (`screens/48-uniques-acquisition.png`) |
| Controls | Search (space tokens + `"quoted phrases"`, AND, matched against a lower-cased text built from enUS+zhTW+zhCN, `Eje`/`Lje` bundle L61008-61016), optional `type=number` inputs, chip groups, optional icon-tile picker with tabs, "Selected: …" footer and Clear |
| Results | "Showing N …" line, 3-column card grid (1 column on phone), `card-visibility-auto`, scroll-to-top button |
| State | Local `useState` only (e.g. `KM`, bundle L61021-61026). Nothing in the URL or localStorage; navigating away resets every filter |
| Interactions | Cards, titles and table rows have no handlers. The only interactive element inside a card is the rune/gem chip popover on Runewords/Gemwords (see below) |
| Art | Category tiles use `/EasternSun/data/hd/global/ui/items/<weapon\|armor\|misc>/<asset>.png` (`Ib`, bundle L57650) resolved through the mod's raw `items.json`/`uniques.json`/`sets.json` icon maps (`remote-data/EasternSun_data_hd_items_*.json`) |
| Data version | `/EasternSun/modinfo.json` says "Mod Version: 3.12.11". No Warlock items in uniques/weapons/armors (`grep -c warlock` = 0) |

**Ours:** the same broad layout, but every list page reads its filters from the URL once (`useUrlInitialize`), offers Copy Link (`src/core/components/CopyLinkButton.tsx`) and supports `?name=` exact-name focus (`src/core/utils/itemName.ts`). Item-type and category filters are checkbox lists, not art tiles. We show no item icons except the HTM images on mythicals and ascendancies.

---

## 1. Runewords (409) and Gemwords (590)

Screens: `screens/c-11-runewords.png`, `screens/40-runewords-search.png`, `screens/41-runewords-rune-dropdown.png`, `screens/42-runewords-type-sword.png`, `screens/c-12-gemwords.png`, `screens/45-gemwords-gems-dropdown.png`, `screens/m-02-runewords-mobile.png`, `screens/15-runewords-light-d2font.png` (light-theme contrast bug).

**Fork – data.** Both pages are one component, `KM({kind})` (bundle L61017). Records come from `remote-data/data_runewords_runewords.json` (409) and `data_gemwords_gemwords.json` (590). Enigma looks like this:

```json
{"id":"Runeword849#1","nameKey":"Runeword849","sockets":3,"reqLevel":65,"variant":1,
 "materials":["r81","r56","r80"],"typeKeys":["Armor"],"typeCodes":["tors"],"etypeCodes":[],
 "allowedBaseCodes":["…105 codes"],"lines":[{"key":"ModStr3k","args":[5],"priority":158}, …]}
```

- The 409 records cover 379 names. Socket ranges are **expanded into one record per socket count**: 11 names have several, e.g. Moonlight 3/4/5/6 and Shinigami 2–6. Gemwords: 590 records for only 21 names (America, Ancient, Holy, Rainbow …), one per gem × socket count.
- `materials` codes resolve through `remote-data/data_runewords_materials.json` (142 entries, families esr 46, gem 42, lod 33, attr 14, skull 6, jewel 1). Each entry is `{nameKey, color, family, tier, semantic, reqLevel, self:{weapon[],helm[],shield[]}}`, for example `r01` = tier 1 ESR rune, req 2, weapon `strModEnhancedDamage 15`, helm/shield `ModStr1i 30`.
- `allowedBaseCodes` is precomputed but the list page never uses it. Only the build item editor reads it (bundle L72071).

**Fork – filters and controls** (`Cje` L60462, pipeline L61070-61090):

| Control | Behaviour |
|---|---|
| Search "Search name, runes or properties…" | AND tokens and quoted phrases, three-language index |
| Sockets (number) | Exact match only (`sockets === d`). A range cannot be typed |
| Max Req Lvl (number) | `reqLevel <= m` |
| Rune pills (Runewords only, `Tje` L60779) | Three popover multi-selects: **New Runes** (esr, yellow dot), **Original Runes** (lod, grey dot), **Kanji Runes** (attr, blue dot), each with "Select all". Semantics are **"contains any selected rune"** (`materialCodes.some(...)`), and an empty selection means no filter |
| Gem pill (Gemwords only, `Bje` L60910) | Ruby, Sapphire, Emerald, Topaz, Amethyst, Diamond, Obsidian, Skull, Jewel; "any" semantics |
| Item Types panel (Runewords only, `Rje` L60649) | Tabs Weapons / Ranged / Armor / Class / Charms, each a grid of **game-art icon tiles** (`screens/42-runewords-type-sword.png`), header "Not filtered"/"Selected" + Clear, footer chips. It matches the record's `typeKeys` **exactly**: Sword does not match words that allow "Weapon" or "Melee Weapon" |
| Sort | Fixed: req level, then name, then variant |

**Fork – card** (`qM`, L60359):
- Gold name, "N Socket" and "Lvl N" badges.
- One chip per rune/gem, coloured by the D2 colour code. Each chip is a **click-to-open Radix Popover** (`wje` L60274; `HS/IS/WS` L60170-60188 render `data-slot="popover"`), not a hover card. It shows the material's req level and its own bonuses under "Weapons/Gloves", "Helms/Boots" and "Armor/Shields/Belts". This is the same pattern as our `RuneTooltip` (`src/features/runewords/components/RuneTooltip.tsx`), which also uses `Popover`.
- "Items: Weapon, Missile".
- Stat lines centred in `#8080E6`, mythical lines in orange.
- **Per-slot socketable bonuses.** The card computes these itself (`Gb` L60351): it maps each type name to weapon/helm/shield with a keyword table (`xje`, e.g. "staff", "orb", "ring" count as helm), then concatenates each material's `self[slot]` lines. They are **not summed**. Gemword cards therefore repeat a line per gem: "Replenish Life +5" appears three times. When a word fits only one slot class, the socket lines are appended to the main stat list without a heading; with two or more they show in a two-column grid ("Charm: … / Armor: …").
- No favourite star (the favourites slice still loads counts; see [06-backend-auth-and-removed.md](06-backend-auth-and-removed.md)), no excluded types, no tier points, no Best Base link, no Source line.

**Ours.** `/` and `/gemwords` (`src/features/runewords`, `src/features/gemwords`, `docs/features/RUNEWORDS.md`) read HTM pages at runtime:
- Search: AND terms with quotes (`src/core/utils/searchTerms.ts`).
- **Sockets:** a text input accepting exact or range (`4`, `2-4`, `-4`, `4-`) with a help popover (`src/core/utils/socketRange.ts`). Socket ranges stay **one card** ("3-6 Socket").
- Max req level.
- Item-type checkboxes by category on **both** pages (`src/core/components/ItemTypeFilter.tsx`). Like the fork, these match the listed type names, not the type hierarchy.
- **Strict rune filter.** Everything is checked by default, and unchecking a rune hides every word that uses it: "what can I make with what I have". Tiers are coloured, with tri-state group toggles.
- Max tier points per rune category/tier.
- Favourites-only toggle (signed in).
- URL params `search, sockets, maxlvl, items, runes, tierpts, gems, name`, plus Copy Link.
- Cards add tier-point totals, jewel info, "Excluded:" types, a favourite star with public count, and the hammer link to `/game-data/best-base?rw=…`. Per-column bonuses come from the HTM `columnAffixes` (already resolved by the docs), and gemword random bonus pools are shown.
- Runeword cards have **no** Source line; that line exists only on uniques, mythicals and socketables.
- Gemword filters persist to localStorage `d2r-esr.gemwords.filters.v1`.

**Difference / takeaway.**
- The fork's "any rune" filter answers "which words use Ber?"; ours answers "what can I build from my stash". Both questions are real, and we only answer the second. Rune-name search covers part of the first.
- The icon-tile item-type picker reads much faster than our checkbox list and works well on phones (4 columns at 390 px, `screens/m-02-runewords-mobile.png`). We would need item art: see idea 1.
- Fork regressions to avoid copying: no range sockets, no type picker on gemwords, unsummed per-gem lines, one card per socket count, no URL state.
- **Borrow:** icon tiles for item types; a "contains any of these runes" mode next to the strict mode; showing the material colour on chips (we already colour by tier).

## 2. Unique Items (1030)

Screens: `screens/c-14-uniques.png`, `screens/46-uniques-search.png`, `screens/48-uniques-acquisition.png`, `screens/m-03-uniques-mobile.png`.

**Fork – data.** The page is `HFe` (L58661), reading `remote-data/data_uniques_uniques.json`:

```json
{"id":915,"index":"Harlequin Crest","code":"uap","nameKey":"Harlequin Crest","baseItemKey":"uap",
 "categoryKey":"Helm","itemLevel":69,"reqLevel":55,"gambleItemKey":null,"isAncientCoupon":true,
 "acquisition":"coupon","noteKey":null,"page":"armors",
 "lines":[{"key":"ModStr3k","args":["1-3"],…}],"specialLines":[{"key":"harlequincrestdesc","mythical":true,…}]}
```

- `acquisition` counts: gamble 670, coupon 334, drop 26.
- 18 records have a `noteKey`, and 207 have `specialLines`, shown in amber.

**Fork – filters** (`MFe` L58072):
- Search "Search name or properties…".
- Max Req Lvl.
- **Acquisition** chips "Coupon" / "Gambleable" / "Non-Gambleable" (L58053). These are **single-select toggles**: clicking the active chip clears it (L58173-58175, filter `acquisition === d` at L58674). The live report's "Coupon + Non-Gambleable = 26" is just Non-Gambleable, i.e. the 26 `drop` records: jewels, charms and the like (`screens/48-uniques-acquisition.png`).
- **Categories** panel (`Qm` L57915-58015) with tabs Weapons / Ranged Weapons / Armors / Class Specific / Rings / Amulets / Charms / Jewels / Quivers and art tiles. Weapons: Axe, Club, Hammer, Hand to Hand 1, Hand to Hand 2, Knife, Knuckle, Mace, Polearm, Scepter, Spear, Staff, Sword, Wand. Uncategorised keys fall into "Other".
- Sort: req level, then name.

**Fork – card** (`PM` L58431):
- Gold name, category badge, "Level:N".
- Base with code, e.g. "Shako (uap)".
- An acquisition line, purple or red: "Ancient Coupon Unique", "Gamble: Javelin" or "Non-Gambleable".
- Special lines, then property lines, then the note.
- **No item image on the card.** Icons appear only on the tiles.

**Ours.** `/uniques` (`src/features/htm-unique-items`, `docs/features/UNIQUE-ITEMS.md`):
- Search covers name, base, category, properties and notes.
- Max req level.
- Grouped category checkboxes (9 groups + "New").
- An "include Ancient Coupon items" toggle (`coupon=0`).
- Favourites-only, `?name=`.
- Card: coupon indicator, "Gamble: X" (`HtmUniqueItemCard.tsx` L52), properties, ESR 3.12 notes, **Source line** from `public/game-data/sources.json` (boss, maps, cube, buy, gamble), favourite star + count.

**Difference / takeaway.** The data is equivalent. The fork's acquisition labels come from its txt pipeline and ours from HTM plus `sources.json`. Ours is richer on acquisition: the Source line names bosses and NPCs, where the fork only says "Non-Gambleable". The fork wins on the picker UI and on letting you *show only* coupon items; our toggle can only *exclude* them.
**Borrow:** a three-way "Acquisition" chip row (Coupon / Gamble / Drop only), driven by our existing `isAncientCoupon`/`gambleItem`; art tiles for categories.

## 3. Mythical Uniques (46)

Screens: `screens/c-13-mythicals.png`, `screens/49-mythicals-weapons.png`.

**Fork.**
- `UFe` (L59064) reads `remote-data/data_mythicals_mythicals.json`, with the same schema as uniques. Example: `{"id":1069,"code":"m01","nameKey":"Doomfletch's Prism","categoryKey":"Bow","itemLevel":100,"reqLevel":90,"acquisition":"drop",…}`. All 46 records are `drop`, and 15 have a `noteKey`.
- Filters: search, Max Req Lvl, group chips "Clear selection / Weapons / Armors / Jewelry & Charms" (`IM` L58720). Weapons gives 28.
- Card: like uniques, with the "Non-Gambleable" tag, the base with code ("Mythical Gemstoned Armor (m06)"), special lines and an italic note paragraph.
- No image. The page is missing from the mobile drawer ([01-site-map-and-navigation.md](01-site-map-and-navigation.md)).

**Ours.**
- `/mythicals` (`src/features/mythical-uniques`): about 41 items from `unique_mythicals.htm`.
- Search and category checkboxes. **No max-level filter** (`MythicalUniqueFilters.tsx`).
- `?name=`.
- Card **with the HTM item image**, special properties in orange, notes and a Source line. No favourites.

**Takeaway.** The fork lists 46 against our ~41, because its list comes from uniqueitems.txt rather than the docs page (inferred). Ours shows images and sources; the fork adds a level filter. **Borrow:** a Max Req Lvl input (trivial). It is also worth checking which five mythicals the docs page omits; our `bases.json`/`sources.json` could reveal them.

## 4. Weapon Bases (390) and Armor Bases (239)

Screens: `screens/c-16-weapons.png`, `screens/51-weapons-elite-bows.png`, `screens/c-17-armors.png`, `screens/53-armors-helm.png`, `screens/m-06-weapons-mobile.png`.

**Fork – data.** `RC({kind})` (L59933) loads `remote-data/data_weapons_weapons.json` / `data_armors_armors.json` plus `data_bases_gemsockets.json` (2,267 code → max sockets). Records keep the txt column names:

```json
{"id":"hax","code":"hax","nameKey":"hax","categoryKey":"Axe","family":"hax","quality":"normal",
 "familyKind":"weapons","mindam":1,"maxdam":9,"durability":60,"rangeadder":2,"speed":null,
 "strBonus":100,"level":3,"levelreq":0,"gemsockets":2,"invwidth":1,"invheight":3,"automodLines":[]}
```

- Quality split: weapons 170 normal / 110 exceptional / 110 elite; armors 83 / 78 / 78.
- `automodLines` is set on 128 weapons and 42 armors.
- `speed` is `null` on 281 of 390 weapons. The txt leaves it blank when it is 0, so the Attack Speed column shows mostly "—". `durability` is null on 53 weapons; Dark Bow shows "—" (`screens/51-weapons-elite-bows.png`).

**Fork – filters.**
- Search "Search name or category…".
- **Quality** chips Normal / Exceptional / Elite. Filtering hides the other rows of each trio, so "Elite + Bows" shows single-row family tables.
- **Categories** art tiles. Weapons use 17 consolidated groups (`NS` L59236): Swords … Throwing Weapons. Armors use the raw categories: Armor, Auric Shields, Belt, Boots, Circlet, Cloak, Gloves, Helm, Pelt, Primal Helm, Robe, Shield, Spirit Crown, Voodoo Heads. Plus "Clear selection".

**Fork – display.**
- Section headers by category and handedness (`eje` L59573), e.g. "Bow · Two-Hand", "Paladin Sword · Two-Hand".
- Each **family card** (`ZFe` L59413) shows the base icon, a category badge and a table with **normal / exceptional / elite as rows side by side**.
- Weapon columns (`YFe` L59279): Base, One-Hand Damage, Two-Hand Damage, Sockets, Req Level, Attack Speed, Throw Damage, Range, Req Str, Req Dex, Qlvl, Durability. Damage headers are red pills; Sockets and Req Level are green.
- Armor columns: Base, Defense, Req Level, Sockets, Smite, Block, Req Str, Req Dex, Durability, Qlvl, Attack Speed.
- Under the table, a **"Skills" (staffmods)** box and an **"Automod"** box (`SC`/`vC` L59342-59420). `vC` splits `automodLines` by key: `skilltab_N`/`NonClassSkill` go to staffmods, the rest to automods. Identical lists across the trio collapse into one list.
- A transposed per-group table exists in the DOM for phones.
- Rows and headers do nothing: no sort, no detail, no link.

**Ours.** The Game Data section, built from txt at build time (`src/features/game-data`, `docs/features/GAME-DATA.md`; `public/game-data/bases.json`, ESR 3.2.24: 369 weapons, 255 armors, 29 misc):

| | Fork Weapon/Armor Bases | Our `/game-data/bases` |
|---|---|---|
| Layout | Family tables, N/X/E as rows | One card per base (`BaseCard.tsx`), N/X/E as family **links** that set the search |
| Filters | Search, quality chips, category tiles | Search, min sockets, max req lvl, kind (weapon/armor/misc), tier incl. **mythical**, class-only, grouped item-type picker, sort (name/qlvl/reqLvl/dmg/def/speed ±), Reset, Copy Link |
| Stats | 1H/2H/throw damage, range, speed, str/dex req, qlvl, durability, defense, smite, block | Damage 1H/2H/throw, defense, block, speed, reqs, str/dex bonus, **socket caps per ilvl band**, qlvl, class/indestructible badges |
| Automods | Rendered as lines (automod + staffmods) | Only the group number ("Automod N"); no lines, no staffmods |
| Missing on our side | — | Durability, range, smite, item art |
| Links out | None | "What can roll" (`/game-data/affixes?base=`), type pages; Best Base and Item Types (`/game-data/types`) have no fork equivalent |

**Takeaway.** Our data and filters are deeper: per-ilvl socket caps, sort, mythical tier, affix links and Best Base. The fork's tier-trio table is the better *reading* layout for "which base should I upgrade to", and its automod/staffmod lines are information we drop.
**Borrow:** an optional family-table view (already deferred as "Bases family view" in our loot-filter plan); render automod lines and staffmods (we already parse automagic.txt for the affix browser); add durability/range; item art.

## 5. Sets (71)

Screens: `screens/c-15-sets.png`, `screens/50-sets-3pc.png`.

**Fork – data.** `GS()` (L61544) reads `remote-data/data_sets_sets.json`:

```json
{"nameKey":"Arcanna's Tricks-Sor","index":"Arcanna's Tricks-Sor","itemCount":3,"reqLevel":1,"itemLevel":5,"version":"0",
 "items":[{"index":"Arcanna's Sign","id":150,"code":"amu","baseItemKey":"amu","categoryKey":"Amulet","reqLevel":1,"rarity":8,
           "lines":[…],"bonusGroups":[[{"key":"ModStr3k","args":[1]},…]]}],
 "partialGroups":[{"threshold":2,"lines":[{"key":"ModStr2g","args":[10]},…]}],"fullLines":[{"key":"ModStr3d","args":[2]},…]}
```

- 245 items in 71 sets. `itemCount`: 3 → 41, 4 → 24, 5 → 5, 1 → 1.
- Two leftovers ship as-is: "Tyrael's Sanctuary_old" and "Malek's Charge_old" (the latter with 1 item).
- `version`: "0" → 54, "100" → 15, "" → 2.

**Fork – filters and card** (`Hje` L61131, `Ije` L61227):
- Search "Search set, item or affix…", Max Req Lvl.
- **Pieces** chips "2 件 / 3 件 / 4 件 / 5 件" plus "Clear count". There is no chip for the 1-item set.
- Wide card. The header has a green set name, an "N件套" badge and "Lv N".
- Left column, one row per item: **item icon** (from the mod's `sets.json` icon map), green name, "base · category", own lines in blue, then per-item partial bonuses (`bonusGroups`) under green "2件加成 / 3件加成" pills.
- Right column: gold boxes for set-wide partial bonuses "2 件", "3 件", "4/5 件" (4 and 5 merged) and "全套" (full set), with labels **hard-coded in Chinese** (L61238-61241).
- A "舊版" (legacy) badge renders only when `version === "1"` (L61263). No set has that value, so it never shows (correction to the bundle inventory, which said "0").
- Cards are not interactive.

**Ours.**
- **No sets page.**
- Set items exist only as `sources.json` labels (270 set items, from setitems.txt at 3.2.24) and as loot-filter set ids. Builds cannot hold set items (`docs`: out of scope).

**Takeaway.** This is the largest content gap on the reference side. We already read setitems.txt in `scripts/generate-game-data.ts` for sources, and our descfunc stat renderer could format the set bonuses at build time. We would need the sets.txt partial/full columns and the per-item `aprop` groups.
**Borrow (whole page):**
- Sets list with search, max level and piece count.
- Item rows with per-item partial bonuses and set-wide partial/full boxes.
- `?name=` focus and Copy Link from day one.
- Source line per item.
- English labels ("2 items", "Full set").
- Hide `_old` rows.

## 6. Corruptions (11 slots)

Screens: `screens/c-19-corruptions.png`, `screens/54-corruptions-helm.png`, `screens/m-07-corruptions-mobile.png`.

**Fork.**
- `aHe` (L61963) reads `remote-data/data_corruptions_corruptions.json`: 11 groups `{slot, slotLabel (Chinese, e.g. "頭盔"), icon (emoji), input, qualities[], outcomes[{lines}]}`. One outcome example: `{"lines":[{"key":"strModEnhancedDamage","args":["150-200"]}]}`.
- Outcome counts: Weapon 30, Quiver 30, Body Armor/Belt/Amulet 25, others 24, Charm 20; 275 in total.
- Qualities shrink by slot: Ring/Amulet `Unique, Set, Crafted, Rare`; Quiver `Unique, Crafted, Rare`; Charm `Unique`.
- Red banner: "Transmute a Worldstone Shard with any equipment for a 75% chance to add 1 random corruption affix (66% for Unique Charm). Brick ignored."
- Search "Search corruption affix…" and **slot pill tabs** All / Weapon / … / Charm (`eHe` L61870).
- **Card** (`Zje` L61735):
  - Header: emoji, slot name, quality words coloured by rarity (labels, not clickable), "Corrupted" badge.
  - Recipe diagram: Worldstone Shard ➕ Any <slot> → "Corrupted" → "Same Item | Random Affix".
  - Rates **hard-coded** as "75% Success / 25% Brick" (66/34 for charms, L61739-61740).
  - One pill per possible outcome (`screens/54-corruptions-helm.png`).

**Ours.**
- Only the guide note **`content/guide/notes/corruption-anointment.md`** (kind `link`): one paragraph. It says corruption cubes an item with a Worldstone Shard, can brick it into a random rare, and that Astrogha's Petrified Heart clears the status.
- It links to the official "Special crafting outcomes" page and has a `::source[Worldstone Shard]` block.
- **No outcome list, no rates.** Related notes: `enhancement-order.md`, `avoid-disasters.md`. The guide engine lives in `src/features/guide`; the cube families in `src/features/guide/build/cubeFamilies.ts` have no corruption family.

**Takeaway.** The fork's page is a complete outcome reference; ours explains the mechanic and sends the reader away for the list. Its numbers are hard-coded, its slot labels in the data are Chinese, and its data is 3.12.11.
**Borrow:** a corruption outcomes block generated from cubemain.txt at build time: either a `::recipes[corruption]`-style family in the guide, or a small `/game-data/corruptions` page with slot tabs. It should list rates only where the game files state them (inferred: cubemain may not encode the 75/25 split; check before showing numbers).

## 7. Anointments (29 outcomes)

Screens: `screens/c-18-anointments.png`, `screens/56-anointments-search.png`.

**Fork.**
- `fHe` (L62376) reads `remote-data/data_anointments_anointments.json`, which holds **one** group: `{"slot":"Unique Charm","slotLabel":"暗金咒符","icon":"✨","input":"Diablo's Demonic Horn, Baal's Demonic Eye, Mephisto's Demonic Brain, Unique Charm","qualities":["Unique"]}` with 29 outcomes, e.g. `strModEnhancedDamage "40-50"`.
- Purple banner: "Transmute an Orb of Anointment with a Unique Charm for 1 random anointment (30 total)". The H1 says **29** and the banner **30**; the card footer key says "30 random bonuses, 1 per slam". The data has 29.
- The banner names the Orb of Anointment for the charm recipe, but the charm card shows the three Demonic organs.
- Search only. No "Showing" line when filtered.
- Two recipe cards:
  - **Equipment** is not in the data; it is built from i18n labels. Orb of Anointment ➕ Normal / Magic / Rare / Crafted Equipment → "Same Item | Random Bonus" → "Random highest tier suffix". A stray "1 條" appears in English mode.
  - **Unique Charm**: the three organs ➕ Unique Charm → one pill per outcome.

**Ours.**
- The same note, `corruption-anointment.md`. It says anointment applies to non-runeword, non-unique gear with an Orb of Anointment, or to a unique charm with the three Demonic organs, and cannot brick.
- `unique-charms.md` (line 50) mentions the organ recipe. `vessel-of-souls.md` notes that the Vessel is the only unique an Orb of Anointment works on, which the fork does not mention.
- No outcome list.

**Takeaway.** Same gap as corruptions; the fork's two-card diagram is a clear way to show "two recipes, one mechanic". Our note is more precise about eligibility. **Borrow:** the charm outcome list (29 lines) and the equipment rule as a guide block, generated from cubemain.

## 8. Vessel of Souls

Screens: `screens/c-20-vessel-of-souls.png`, `screens/57-vessel-tier2.png`, `screens/58-vessel-completion.png`.

**Fork.**
- `AHe` (L62617) reads `remote-data/data_vessels_vessels.json`: 5 tiers `{tier, tierLabel ("第1階" … "完成階段"), icon, soulDefault, outcomes[{affix, inputs[], soulCost, lines}]}`.
- Tier sizes and soul costs:

| Tier | Outcomes | Soul cost |
|---|---|---|
| 1 | 177 | 350 (164) / 700 (13) |
| 2 | 36 | all 42 |
| 3 | 23 | all 7 |
| 4 | 89 | 1–5 |
| Completion | 29 | 0 |

- Tier 1 sample: `{"affix":"att-skill 1","inputs":["Vessel of Souls","hrt,qty=2","eyz","hrn","fng"],"soulCost":350,"lines":[{"key":"ItemExpansiveChancX","args":[6,60,"spearstorm1"]}]}`.
- Completion sample: `{"affix":"Mythical Ancient Maul","inputs":["Vessel of Souls","gpb","gpk","gpw"],"soulCost":0,"lines":[{"key":"TransformToMythical",…}]}`.
- The H1 carries the tier ("Vessel of Souls Tier 2").
- Teal "About Vessel" banner, and the note "Each Tier 1 recipe consumes 350 souls…", which **still says Tier 1 on every tier** (`screens/57-vessel-tier2.png`, where every card says 42 Souls).
- Tier tabs; search "Search affix, material…".
- Soul-cost chips "魂耗: 全部 (177) / 350 魂 (164) / 700 魂 (13)", Tier 1 only, untranslated.
- Cards: "N Souls" badge, "Materials:" chips (translated item names, "Heart x2" from `qty=`), and the result line in a violet box. Completion cards say "Transform to Mythical Ancient Maul".

**Ours.**
- Guide note **`content/guide/notes/vessel-of-souls.md`**: three paragraphs. It explains that it drops in Endgame Maps, must not be worn, takes five organs per recipe (some take a Flag), has four tiers done in order, and turns into a mythical weapon with three Blemished gems.
- The note embeds **`::recipes[vessel-transform]`**, a generated table of the transform recipes (`src/features/guide/build/cubeFamilies.ts` L1050).
- Per-tier organ → bonus recipes are not listed; the note defers to the official page.

**Takeaway.** We match the fork on the completion step and beat it on explanation. The fork alone lists the ~325 tier recipes with souls and materials. The data is in cubemain, so a generated per-tier table is feasible. Avoid the fork's mistakes: the static "Tier 1" note and a soul filter on one tier only.
**Borrow:** tier tabs plus a material/soul table, as a guide block or a game-data page. Optionally a filter for "recipes using material X".

## 9. Ascendancy Classes (15 × 5 tiers)

Screens: `screens/c-10-ascendancies.png`, `screens/59-ascendancies-search.png`.

**Fork.**
- `LHe` (L62943) reads `remote-data/data_ascendancies_ascendancies.json`: `{"id":"arcanist_ascendancy_stone","name":"Arcanist Ascendancy Stone","displayName":"秘術師","tiers":[{"tier":1,"lines":[{"key":"ModStr3a","args":[1]},…]}…]}`. In English the names come from `Pr[lang]["<name> Ascendancy Stone"]` with the stone suffix stripped (L62872).
- Search "Search name or recipe…" ("mana" → 5); "Showing 15 ascendancies".
- Card (`OS` L62893): orange display name, Tier 1–5 headings with bonus lists, and an optional notes paragraph.
- **No stone icon.** The icon helper `mIe` (L69440) belongs to the build paperdoll; this corrects the bundle inventory's "with the stone icon".
- No recipe: neither the gem colours nor the orbs. The "Ascendancy Trials" iframe page covers the challenges ([03-guides-pages.md](03-guides-pages.md)).

**Ours.**
- `/ascendancies` (`src/features/ascendancies`): 15 cards from `ascendancies.htm`, each with the **stone image**, "<Name> Ascendancy", per-tier bonuses and HTM footnotes. Search only (`?search=`).
- The guide note `content/guide/notes/ascendancies.md` adds the orb drop locations, `::source` blocks and `::recipes[ascendancy]` (gem-colour → stone recipes), and links back to the page.

**Takeaway.** Parity. Ours has images, footnotes and the recipe via the guide. Nothing to borrow beyond, at most, showing the Blemished-gem recipe on each card. That would also be a natural `?name=` target for the guide.

---

## Comparison matrix

| Page | Fork | Ours | Edge |
|---|---|---|---|
| Runewords | 409 records (socket ranges split), search, exact Sockets, Max Lvl, rune pills (any-match), icon-tile item types, click popovers, concatenated slot bonuses; no URL, no favourites | ~390, search, socket ranges, max lvl, type checkboxes, strict rune filter, tier points, favourites, Best Base link, URL + Copy Link + `?name=` | **Ours** (features); fork on picker UX |
| Gemwords | 590, search, Sockets, Max Lvl, gem pill; no type filter | ~590, same + item types, random pools, favourites, URL, localStorage | **Ours** |
| Uniques | 1030, acquisition chips (single), art category tiles, acquisition line, notes; no image | 1030, grouped checkboxes, coupon exclude toggle, Gamble line, notes, Source line, favourites, URL | Ours on data, fork on chips/tiles |
| Mythicals | 46, Max Lvl, group chips, note; no image | ~41, category checkboxes, image, Source line, `?name=` | Mixed (fork +5 items, +level filter) |
| Weapon/Armor bases | Tier-trio family tables, quality chips, art tiles, automod + staffmod lines, durability/range/smite | `/game-data/bases`: cards, more filters + sort, socket caps per ilvl, mythical tier, affix links; plus Item Types, Best Base | Ours on depth; fork on layout + automod lines |
| Sets | 71 sets, piece chips, item icons, per-item and set-wide bonuses; Chinese labels | **None** | **Fork** |
| Corruptions | 11 slot cards, slot tabs, 275 outcomes, hard-coded 75/25 | Guide note only (`corruption-anointment.md`) | **Fork** |
| Anointments | 2 recipe cards, 29 outcomes, 29/30 mismatch | Guide note only (same note, `unique-charms.md`) | **Fork** (list); ours (eligibility text) |
| Vessel of Souls | 5 tier tabs, ~354 recipes with materials and souls, stale "Tier 1" note | Guide note + `::recipes[vessel-transform]` | **Fork** (tiers); ours (explanation) |
| Ascendancy Classes | 15 cards, tiers, no icon | 15 cards with images + footnotes; guide note with orbs + recipe | **Ours** |
| Socketables | No page (bonuses only in popovers) | `/socketables` with Source lines | **Ours** |
| Affixes / Item Types / Best Base | None | Built | **Ours** |

## Ranked borrowable ideas

| # | Idea | Why | Effort |
|---|---|---|---|
| 1 | **Sets page** (`/sets` or `/game-data/sets`) built from setitems.txt + sets.txt in `generate-game-data.ts`. Item rows with per-item partial bonuses, set-wide partial/full boxes, piece-count filter, max lvl, `?name=`, Copy Link, Source line, `_old` rows hidden | Largest content gap; the generator already reads setitems for sources | L |
| 2 | **Corruption outcomes** per slot from cubemain (guide block `::recipes[corruption]` or a game-data page with slot tabs) | Users ask "what can this roll"; we currently send them to the docs | M |
| 3 | **Vessel of Souls tier tables** (materials, soul cost, result) as a generated guide block or tabbed page | ~325 recipes nobody else lists in English with search | M |
| 4 | **Icon-tile category pickers** using the mod's HD item art (`hd/items/items.json` maps code → asset) for runewords/gemwords item types, uniques and bases | Faster scanning, better on phones; needs art copied or extracted at build time (licence/size check) | M–L |
| 5 | **Render automod and staffmod lines** on base cards (we only show "Automod N"), plus durability, range and smite | Data we already parse; small renderer change | S |
| 6 | **Bases family-table view** (N/X/E as rows of one table), toggle beside the card view | Easier upgrade comparison; already on our deferred list | M |
| 7 | **Anointment outcome list** (unique-charm pool + equipment rule) as a generated guide block in `corruption-anointment.md` | Completes the enhancement trio cheaply once #2 exists | S |
| 8 | **"Contains any of these runes" mode** next to the strict rune filter | Answers "which words use Ber?" without typing | S–M |
| 9 | **Acquisition chips on Uniques** (Coupon only / Gamble / Drop only) replacing the exclude-only coupon toggle | Makes "show me coupon uniques" possible | S |
| 10 | **Max Req Lvl on Mythicals** | Parity with every other list | S |
| 11 | **Recipe-diagram card style** ("X ➕ Y → Same Item \| Random Affix") for cube-based guide blocks | Clearer than plain rows for one-recipe mechanics | M |

Deliberately not worth copying: the per-socket-count split of runeword records, exact-only socket input, concatenated (unsummed) gem lines, hard-coded rates, the stale Vessel note, the 29/30 mismatch, and the absence of URL state.

## Inventory corrections

- Rune/gem chips on word cards are **click-to-open Radix Popovers** (`HS/IS/WS` L60170-60188, `data-slot="popover"`), not hover popovers. The live report's "rune chip opens nothing" was wrong: verified live on 2026-10-22, clicking the "I" chip on the Boar card opens a popover with "I Rune, Req Lvl 2" and the three per-slot bonus lines (`screens/70-runeword-rune-chip-click.png`).
- Uniques **Acquisition chips are single-select** (L58173-58175, L58674). The live report's "they combine" is wrong; Coupon + Non-Gambleable = 26 is simply the 26 `drop` records.
- **Ascendancy cards show no stone icon** (`OS` L62893). `mIe` L69440 is used elsewhere. The cards do render a `notes` paragraph.
- The **Sets "舊版" badge** checks `version === "1"` (L61263), not "0", and no set has that value, so it never renders.
- Item-type and rune/gem filters on words use exact `typeKeys` and **any-material** matching (L61073-61085). `allowedBaseCodes` is unused on the list page.
- The Corruptions slot control renders as pill tabs (live), not a select.
- Anointments' "Equipment" card is UI-only; the data file has one group.
- The guide notes live in `content/guide/notes/*.md`; `src/features/guide` holds the engine and `build/cubeFamilies.ts`.

## Open questions

- Which five mythicals does the fork list that our HTM page lacks? Are they disabled or legacy in 3.2.24?
- Does cubemain.txt encode the corruption success/brick split, or is 75/25 docs-only?
- Licence and size cost of shipping the mod's HD item PNGs for icon tiles. Could we extract a small sprite subset at build time?
- Are the two `_old` sets reachable in game, and does the fork show them?
