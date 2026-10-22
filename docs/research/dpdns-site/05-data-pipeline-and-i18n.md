# Data pipeline and i18n: d2r.dpdns.org vs this repo

**In short.** The fork does not parse anything in the browser. An offline pipeline that is not shipped turns the
mod's txt files into 18 JSON files under `/data/`. Stat lines are stored as *D2R string key + arguments* and rendered
at runtime by a small printf-style engine against one of three string tables (`enUS`, `zhTW`, `zhCN`). That design
makes three-language UI and three-language search cheap. The cost is that the data is as fresh as the last time the
maintainer ran the pipeline. The fork currently hosts **ESR 3.12.11 (LAN build)**, while this repo's game files are
at **3.2.24**. We combine runtime scraping of easternsunresurrected.com with build-time txt→JSON bundles and render
text to English at build time. A path to multi-language for us exists and mostly reuses what we already have (see §11).

Sibling docs: [01-site-map-and-navigation.md](01-site-map-and-navigation.md) (language switcher, settings),
[02-reference-pages.md](02-reference-pages.md) (what each data file feeds),
[06-backend-auth-and-removed.md](06-backend-auth-and-removed.md) (Dexie leftovers, removed settings).

---

## 1. The fork's data files

**Fork.** All game data is fetched as static same-origin JSON from `/data/<kind>/<kind>.json` (loader `yFe`,
bundle L57779; other loaders listed per row). No `.txt`/`.tbl` file reaches the client. The sizes below are for the
copies in `remote-data/`. The gzip column is `gzip -9` measured locally; Cloudflare's real transfer size may differ.

| File (`remote-data/…`) | Raw | gzip | Top level | Records | Key fields |
|---|---:|---:|---|---:|---|
| `data_runewords_runewords.json` | 1.53 MB | 89 KB | array | 409 variants | `id` ("Runeword580#1"), `nameKey`, `sockets`, `reqLevel`, `isGemword`, `variant`, `materials[]` (codes), `typeKeys[]`, `typeCodes[]`, `etypeCodes[]`, `allowedBaseCodes[]` (≈670 codes per row), `lines[]` |
| `data_gemwords_gemwords.json` | 3.85 MB | 69 KB | array | 590 variants | same as runewords; `isGemword: true` |
| `data_runewords_materials.json` | 126 KB | 6 KB | object code → material | 142 | `nameKey`, `color` (D2R colour code char, e.g. `"P"`), `family` (gem, jewel, esr, lod, attr, skull), `tier`, `semantic`, `reqLevel`, `self.{weapon,helm,shield}[]` lines |
| `data_uniques_uniques.json` | 1.88 MB | 104 KB | array | 1,030 | `id`, `index`, `code`, `nameKey`, `baseItemKey`, `categoryKey`, `itemLevel`, `reqLevel`, `gambleItemKey`, `isAncientCoupon`, `acquisition` (drop 26 / gamble 670 / coupon 334), `noteKey` (18 set), `page` (weapons 554 / armors 371 / other 105), `lines[]`, `specialLines[]` |
| `data_mythicals_mythicals.json` | 103 KB | 6 KB | array | 46 | same schema as uniques |
| `data_sets_sets.json` | 619 KB | 30 KB | array | 71 sets | `nameKey`, `index`, `itemCount`, `reqLevel`, `itemLevel`, `version`, `items[]` (`index, id, code, nameKey, baseItemKey, categoryKey, itemLevel, reqLevel, rarity, lines, bonusGroups[][]`), `partialGroups[]`, `fullLines[]` |
| `data_weapons_weapons.json` | 374 KB | 16 KB | array | 390 | 32 keys: `id, code, nameKey, categoryKey, family, quality, familyKind`, then weapons.txt column names (`mindam, maxdam, 2handmindam, …, gemsockets, gemapplytype, invwidth, invheight`), `automodLines[]` |
| `data_armors_armors.json` | 233 KB | 9 KB | array | 239 | same 32 keys |
| `data_bases_gemsockets.json` | 18 KB | 5 KB | object code → max sockets | 2,267 | e.g. `"hax": 2` |
| `data_corruptions_corruptions.json` | 88 KB | 3 KB | array | 11 slot groups | `slot`, `slotLabel` (zhTW text), `icon` (emoji), `input`, `qualities[]`, `outcomes[{lines}]` (20–30 per slot) |
| `data_anointments_anointments.json` | 9 KB | 1 KB | array | 1 group, 29 outcomes | same shape as corruptions |
| `data_vessels_vessels.json` | 169 KB | 7 KB | array | 5 tiers | `tier`, `tierLabel` (zhTW, e.g. "第1階"), `soulDefault`, `outcomes[{affix, inputs[] ("hrt,qty=2"), soulCost, lines}]`: 177 / 36 / 23 / 89 / 29 |
| `data_ascendancies_ascendancies.json` | 53 KB | 2 KB | array | 15 | `id`, `name` ("Arcanist Ascendancy Stone"), `displayName` (zhTW), `tiers[{tier, lines}]` ×5 |
| `data_skills_skills.json` | 58 KB | 11 KB | array | 7 classes (no Warlock) | `class`, `className.enUS`, `tabs[{page, name{enUS,zhTW,zhCN}, bg, skills[{key, name{3 langs}, row, col, iconCel, icon, reqlevel, mana, maxlvl, reqskills}]}]` |
| `data_dcraft_dcraft.json` | 36 KB | 1 KB | array | 7 slots | `slot`, `slotLabel`, `icon`, `craft[{lines, maxCraft, icon ("SS","DS",…)}]`: 15–21 per slot |
| `data_strings_enUS.json` | 355 KB | 100 KB | object key → text | 7,184 | see §3 |
| `data_strings_zhTW.json` | 346 KB | 117 KB | object | 7,184 | |
| `data_strings_zhCN.json` | 346 KB | 117 KB | object | 7,184 | |

Total: about **10.4 MB raw / 0.72 MB gzip** of data, plus 225 KB raw of icon maps (§5). The word files are large
because each record repeats a precomputed `allowedBaseCodes` list. They compress about 50×.

Sample records (trimmed):

```jsonc
// data_uniques_uniques.json
{"id":110,"index":"Lifebane","code":"9ba","nameKey":"Lifebane","baseItemKey":"9ba","categoryKey":"Axe",
 "itemLevel":39,"reqLevel":39,"gambleItemKey":"bax","isAncientCoupon":false,"acquisition":"gamble",
 "noteKey":"note_110","page":"weapons",
 "lines":[{"key":"ItemExpansiveChanc1","args":[5,25,"skillname82"],"priority":160,"mythical":false,"perLevel":false},
          {"key":"ModStr4m","args":["20-30"],"priority":145,"mythical":false,"perLevel":false},
          {"key":"ModStr2j","args":[2],"priority":128,"mythical":false,"perLevel":true}],
 "specialLines":[{"key":"lifebanedesc","args":[],"priority":330,"mythical":true,"perLevel":false}]}
// data_runewords_materials.json → "r01"
{"nameKey":"r01","color":"0","family":"esr","tier":1,"semantic":"t1","reqLevel":2,
 "self":{"weapon":[{"key":"strModEnhancedDamage","args":[15],"priority":100}],
         "helm":[{"key":"ModStr1i","args":[30],"priority":71}],"shield":[{"key":"ModStr1i","args":[30],"priority":71}]}}
// data_vessels_vessels.json → tier 1, outcome 0
{"affix":"att-skill 1","inputs":["Vessel of Souls","hrt,qty=2","eyz","hrn","fng"],"soulCost":350,
 "lines":[{"key":"ItemExpansiveChancX","args":[6,60,"spearstorm1"],"priority":160,"mythical":false,"perLevel":false}]}
// data_skills_skills.json → ama / tab 0 / skill 0
{"key":"spearstorm","name":{"enUS":"Spearstorm","zhTW":"長矛風暴","zhCN":"长矛风暴"},"row":1,"col":2,
 "icon":"spells/amazon/amskillicon.26.png","reqlevel":1,"mana":8,"maxlvl":20,"reqskills":[]}
```

A few records are not fully language-neutral. `slotLabel`, `tierLabel` and ascendancy `displayName` are baked-in
Traditional Chinese, and the UI uses them as fallbacks. For example, the vessel tab label is `e("localVessels.tier"+n) ?? tierLabel`
(bundle L62644).

**Ours.** There are two sources:
- *Runtime:* nine pages scraped from easternsunresurrected.com, about 4.4 MB raw / 0.29 MB gzip (measured on
  `test-fixtures/`), parsed with `DOMParser` into Dexie (`src/features/data-sync/`, `docs/features/CORE-DATA.md`).
- *Build time:* seven bundles in `public/game-data/` (manifest, types, bases, runewords, affixes, sources,
  lootfilter), 2.41 MB raw / 0.26 MB gzip, generated from the local ESR clone at 3.2.24 (`scripts/generate-game-data.ts`,
  `docs/features/GAME-DATA.md`).

**Difference.** The fork's bundles cover more kinds (sets, corruptions, anointments, vessels, dcraft, skills, base
stats with automods), and every reference page reads them. Our bundles cover what our Game Data, loot filter and
sources features need. Our browse pages (runewords, uniques, socketables…) still come from the HTM pages.

---

## 2. Stat line model and the client-side format engine

**Fork.** A stat line is `{key, args[], priority, mythical, perLevel, classOnly?}`:
- `key` is a D2R string id from itemstatcost `descstrpos`/`descstr2` or a mod-specific key (`ModStr1j`,
  `ItemExpansiveChanc1`, `lifebanedesc`);
- `args` are numbers, range strings (`"20-30"`), decimal strings (`"2.5"`), or further string keys that are looked up
  in the same table (`"skillname82"`, `"SorOnly"`);
- `priority` is the descpriority used for sorting (inferred: the values match itemstatcost `descpriority`).

The offline step has already chosen the string and the argument order per descfunc. The browser only does printf.

Rendering (`NM` L57803 and nine identical copies, e.g. `vf` L58534 and `jS` L60048):
1. `fmt = table[line.key] ?? line.key`;
2. each string arg becomes `table[arg] ?? arg`;
3. `Wr(fmt, args)` (L57756);
4. if `perLevel`, append `table.increaseswithplaylevelX ?? "(Based on Character Level)"`;
5. if `classOnly`, append `table[classOnly]`.

Placeholder grammar of `Wr` (token regex `fFe`, L57726):

| Token | Behaviour (`zy`, L57729) |
|---|---|
| `%d`, `%D`, `%i` | integer (`Math.trunc`); a range string `"a-b"` becomes `(a-b)` |
| `%+d` | number with a forced sign (`+5`, `-3`); range `"5-10"` → `+(5-10)`, `"-5-10"` → `-(5-10)` |
| `%s`, `%S` | the argument as is (a looked-up string or a number) |
| `%0`…`%9` | positional, **0-based**, rendered as `%d` |
| `%1$d`, `%2$s`, `%3$i` | positional, **1-based**, with a type |
| `%c<n>` | colour code, removed |
| `%%` | literal `%` |

Other tokens consume arguments in order. Ranges use a hyphen (`+(20-30)`) and not the docs' "to" style.
Per-level values are shown as the stored per-level figure (`"2.5"`), followed by the suffix. Neither the bundle nor
the data shows the computed value at level 1–99 (inferred from `perLevel` handling; the args are pre-divided).

**Ours.** Rendering happens at build time in `src/features/game-data/build/stats/`:
- `expandProperty.ts` expands properties `func1-7`;
- `descfunc.ts` applies itemstatcost `descfunc` and `descval` placement;
- `renderLines.ts` sums duplicate stats, merges damage pairs and `dgrp` groups, hides descfunc 0 and sorts by descpriority;
- `sprintf.ts` supports `%d %+d %i %s %%` and `%0-%9`, with docs-style ranges `+(10 to 20)`.

Bundles store the finished English `text`. An oracle test (`statRenderer.oracle.test.ts`) checks our output against
the HTM pages: 96.5 % identical lines on 2026-10-09. The HTM-sourced pages show whatever text the ESR site prints.

**Difference / takeaway.**
- The fork's split is simpler at runtime and language-neutral. All descfunc logic lives in the hidden pipeline.
- Ours is checked against the official pages, but it is baked into English strings, so it cannot switch language
  without a re-render.
- The fork shows no sign of line merging (one line per stat; inferred from the samples). Its range style differs
  from the ESR docs.

---

## 3. The string tables

**Fork.** `/data/strings/{enUS,zhTW,zhCN}.json` are flat `key → text` maps with 7,184 keys each and an identical key set.
Colour codes (`ÿc@` etc.) are stripped. I compared them with the ESR clone's
`Eastern_Sun_Resurrected.mpq/data/local/lng/strings/*.json` at 3.2.24:
- 6,974 of the keys exist in ESR. The other 210 are pipeline-made or older keys, e.g. `note_110` (33 `note_*` keys
  hold the uniques Notes column), `u25`…`u36`, `Hellfire Torch New`.
- After stripping colour codes, 6,444 enUS values are identical to 3.2.24 and **530 differ**. This is version drift.
  For example, `strModAllResistances` is "All Resists %+d" in the fork and "All Resistances %+d" in 3.2.24, and
  "Keep in Charm Inventory" became "Keep in Inventory".
- zhTW: only 1,562 values are identical to ESR's own zhTW. The fork's values carry community abbreviations, e.g.
  `ModStr1j` "火焰抗性(FR) %+d%%" (ESR: "火焰抗性 %+d%%") and `strModEnhancedDamage` "%+d%% 傷害強化(EDmg)". zhCN is
  closer (4,735 identical). The zhTW table therefore does not come from ESR (inferred: a third-party "美化"
  string pack, or a hand-edited one).
- The two zh files have the same byte size (345,871) and different contents. This is consistent with
  character-by-character Traditional↔Simplified conversion (inferred).

**Ours.** `build/strings.ts` reads the same ESR string JSONs but keeps **only `enUS`** (14,784 strings,
85 conflicts logged, `manifest.counts`). The ESR files carry all 13 D2R languages per entry
(`enUS, zhTW, zhCN, deDE, esES, esMX, frFR, itIT, jaJP, koKR, plPL, ptBR, ruRU`). zhTW differs from enUS in 14,340 of
14,884 entries, so ESR-specific strings (e.g. `lifebanedesc` "每有 100 點最大生命值…") are already translated upstream.

**Takeaway.** We already have the multi-language source material in the clone. The fork's zh texts are a
stylistic choice (abbreviations that Chinese players know). They are not the only option.

---

## 4. Searching in three languages at once

**Fork.** For most kinds, a second loader fetches **all three** string tables (`Ha = ["zhTW","zhCN","enUS"]`, L16994)
and builds a lower-cased `searchText` per record from the name, base, category, rendered lines and notes in every
language (uniques `LFe` L58545, words `dje` L60059, plus mythicals L58963, sets L61454, corruptions L61641,
anointments L62029, vessels L62446, ascendancies L62784, dcraft L71263). Query tokens and quoted phrases must
all match. An English query therefore works while the UI is in Chinese, and the other way round.

Exceptions: **weapon/armor bases** (`Bs`, L57852) index only the current language's table. Skills carry their own
three-language names.

Cost: the first visit to a page such as Uniques downloads all three tables (about 1.05 MB raw / 0.33 MB gzip) and
renders every line three times. Every loader module keeps its own `Map` of string-table promises (ten copies). The
HTTP cache avoids refetches, but the parsed objects can exist several times in memory (inferred from the code
structure).

**Ours.** There is one English `searchText` (`src/core/utils/searchTerms.ts`: AND terms, quoted phrases) over
HTM text or bundle text.

---

## 5. Hosting the mod folder under `/EasternSun/`

**Fork.**
- `/EasternSun/modinfo.json` is the LAN build's modinfo (`remote-data/EasternSun_modinfo.json`, BOM-prefixed,
  `name: "EasternSunLANx"`). It has a comment block with "Mod Download: github.com/CelestialRayOne/Eastern_Sun_Resurrected_Lan",
  "**Mod Version: 3.12.11**", news ("Fixed immolation arrow fires dealing weapon damage") and the author links.
  The lazy chunk `localModInfo` reads it as text, extracts `/Mod Version\s*:\s*([^\s]+)/` and stores it in Dexie
  `metadata.esrVersion` (`syncEsrVersion`). Builds are stamped with this value (see 06).
- Icon maps are the mod's own `data/hd/items/*.json`, served raw and loaded by `mFe` (L57656) into lookup objects:
  - `items.json`: 2,103 base codes → `{asset: "axe/hand_axe"}`;
  - `uniques.json`: 632 entries keyed by **snake-cased unique name** (`the_gnasher`, not the numeric index) →
    `{normal, uber, ultra}`;
  - `sets.json`: 201 entries.
- Path resolution (`Fr` L57683, `Ib` L57650). The item name is normalised (`hFe`: lower-case, drop apostrophes,
  non-alphanumerics → `_`) and looked up in the uniques map, falling back to the base code in the items map. The
  asset's first path segment then picks a folder through `dFe` (axe/bow/… → `weapon`, armor/belt/helmet/… → `armor`,
  amulet/charm/rune/… → `misc`), giving `/EasternSun/data/hd/global/ui/items/<weapon|armor|misc>/<asset>.png`.
- The mod ships these icons as `.sprite` files (1,985 in our clone's `data/hd/global/ui/items`), so the fork has
  converted them to PNG (inferred). Skill-tree art comes the same way from `/EasternSun/data/hd/global/ui/{panel,spells}/`.

**Ours.**
- No item icons on browse cards except mythicals and ascendancies, which hotlink the docs site's images (`imageUrl`).
- The loot-filter editor has a `.sprite` decoder for minimap icons (`src/features/loot-filter/engine/`).
- No mod files are rehosted. The game-data bundles carry no icon paths.

**Takeaway.** Icons are cheap to add at build time: we already have the decoder and the mapping JSONs in the clone.
Rehosting 100 MB of sprites is not needed; only the PNGs we reference would be exported (see 07).

---

## 6. The legacy English→Chinese map (`Pr`)

**Fork.**
- Three object literals, `Xae` (enUS, an identity map), `DSe` (zhTW) and `a5e` (zhCN), with **7,009 entries each**.
  They span bundle L28466–L55125 (about 26.7k pretty-printed lines, ≈1.5 MB of the pretty file) and are combined as
  `Pr = {enUS, zhTW, zhCN}` at **L55125**.
- They hold item names, item types, `family:name` rune keys, affix templates with `#` placeholders and
  `[Skill]`/`[Class]` captures ("#% Chance to Cast Level # [Skill] on Melee Attack"), doc labels ("D2R ESR" →
  "東日美化版", L43229) and notes.
- `g5e` (L55245) is a fuzzy matcher: numbers become `#`/`#-#`, suffixes such as "(Based on Character Level)" are
  stripped, singular/plural variants are tried, and the numbers are put back (`Ym`).
- Live uses: `BS()` (L55313) in Corruptions (`translateUiLabel`, L61737), Anointments and Vessels
  (`translateItemName`, L62094/L62561), plus direct `Pr[lang]` lookups for ascendancy stone names (L62460, L62797,
  L62847, L62872, L69456).

**Takeaway.** This is the fingerprint of an earlier approach that translated our scraped English HTM text after the
fact (inferred). It now makes up a large share of the 2.47 MB main bundle (742 KB gzip, `site/index.js`) for a
handful of labels. We should not copy it: translating rendered English is fragile, and keyed strings make it
unnecessary.

---

## 7. Caching and storage

**Fork.**
- Game data has module-level in-memory promise caches only. Nothing is persisted, so freshness depends on HTTP
  caching. The HTML is served `cache-control: public, max-age=0, must-revalidate` (`site/headers.txt`); data-file
  headers were not captured.
- Dexie DB `d2r-esr-runeword-browser` `version(13)` (L68680) still declares `gems, esrRunes, lodRunes, kanjiRunes,
  crystals, runewords, gemwords, affixes, htmUniqueItems, mythicalUniques, ascendancies, metadata`. Only
  `metadata.esrVersion` is written. The other tables are a leftover of our schema before our v14 (which dropped
  `affixes` on 2026-10-05, `src/core/db/db.ts`). This dates the fork point to before that commit (inferred).
- localStorage: `d2r-language`, `theme`, `textSize`, `useDiabloFont`, the legacy favourites keys and
  `d2r-esr.favorites.migratedToCloud.v1` (06), and the Supabase session. sessionStorage: `d2r-auth-return-to`.

**Ours.**
- HTM data persisted in Dexie v14. A changelog version check refetches only when the version changes.
- Store sanity check (refuses empty or <50 % results).
- Offline fallback with a warning, plus "Force Refresh Data" and version info in settings.
- Game-data bundles fetched with `?v=<sha256>` (immutable-cache friendly) and kept in a module cache.

---

## 8. Language switching and UI i18n

**Fork.**
- The slice `i18n` (L16994–L17026) has the default **`zhTW`** and does not detect the browser language. It is
  persisted in `localStorage["d2r-language"]` and sets `html[lang]` to `en` / `zh-Hant` / `zh-CN` and `html[data-lang]`.
- Switchers: the header dropdown (繁/简/EN) and the settings segmented control (繁體中文 / 简体中文 / English).
- UI strings come from `St()` (L28441), `t(key, {vars})` with `{name}` interpolation, falling back to the key. The
  dictionaries are `kM`/`CM`/`AM` (L26302/L27017/L27729): **707 keys in enUS, 708 in zh**.
- Some texts bypass i18n:
  - the landing page has its own inline `{enUS, zhTW, zhCN}` table;
  - set labels are hard-coded Chinese ("件套", "全套", "舊版");
  - saga toasts are hard-coded English.
- Switching language re-renders every page from the new string table. The data does not change, so no reload is
  needed.
- Unused keys: the inventory's figure of 238 is too high (see Corrections). By my count **about 211** keys are dead:
  `builds.picker.*`, `builds.itemSearch.*`, `search.help.*`, `copy.help.*`, `socketables.*`, `settings.data.*`,
  `settings.info.*`, `class.*`, `lang.*` and others.

**Ours.** English only. There is no i18n library, the strings are hard-coded in components, and `<html lang="en">`.

---

## 9. Comparison at a glance

| Aspect | Fork | Ours |
|---|---|---|
| Source of truth | mod txt + string JSONs, offline (not shipped) | ESR docs HTM at runtime + ESR txt at build time |
| Current version | 3.12.11 (LAN modinfo); no Warlock; 530 enUS strings differ from 3.2.24 | HTM: whatever the site serves (checked on every start); bundles: 3.2.24 (`manifest.json`) |
| Update after an ESR release | maintainer reruns the pipeline and redeploys | HTM pages update themselves; bundles via `/esr-update` + deploy |
| Text rendering | runtime printf over string keys (any language) | HTM text as published; bundles pre-rendered English with descfunc renderer + oracle test |
| Coverage | words, uniques, mythicals, sets, bases, corruptions, anointments, vessels, ascendancies, skills, dcraft | words, socketables, uniques, mythicals, ascendancies (HTM); bases, types, affixes, runeword rows, sources, loot-filter refs (bundles) |
| Languages | zhTW (default), zhCN, enUS; search spans all three | enUS |
| Data transfer | ≈0.72 MB gzip if every page is visited; per-page lazily | ≈0.29 MB gzip HTM at first start (then IndexedDB) + bundles on demand |
| Main JS bundle | 2.47 MB raw / 742 KB gzip, one chunk (`Pr` map ≈46 % of the pretty-printed file) | route-split; largest chunk 702 KB raw (`dist/assets`) |
| Offline | none beyond the HTTP cache | IndexedDB cache of HTM data (no service worker either) |
| Third-party dependency at runtime | none (same origin) | easternsunresurrected.com must be reachable on first load |
| SEO | `<title>ESR Website</title>`, no meta description, CSR only; guide pages are static HTML (crawlable) | full meta/OG tags, sitemap, robots; still CSR |
| Icons | rehosted mod PNGs everywhere | almost none |

---

## 10. Trade-offs, frankly

- **Freshness.** Our HTM path is the only part of either app that updates itself after an ESR release. That
  matters because ESR ships often (3.2.01→3.2.24 in about three weeks). The fork is two release lines behind
  (3.12.11 vs 3.2.x) and still lacks the Warlock class. Its whole advantage depends on someone rerunning a private
  script. Our build-time bundles share that weakness, but `game-data:update` + `esr:diff` + the `/esr-update` skill
  make it a routine step. The ESR docs themselves sometimes lag the game files (docs 3.2.02 vs files 3.2.10 on
  2026-10-09, GAME-DATA.md), so neither path is always right.
- **Correctness.** The txt files are what the game runs. HTM is what the author publishes and may differ. The
  fork gets txt truth for every page but loses ESR's own rendering choices (range style, merged lines). Our
  renderer copies the docs' style and is measured against it. Fragility: our HTM parsers break when the site markup
  changes (3.12 and 3.2 both did), and the fork's pipeline breaks when txt columns change. We would only notice the
  latter at build time, which is better.
- **Maintenance.** Two pipelines cost more than one. Moving the browse pages to txt bundles would remove the parser
  breakages but give up auto-freshness and the "matches the official site" guarantee. A middle ground is to keep HTM
  for the pages it serves well and add new kinds (sets, corruptions, base stats) from txt, as the Game Data
  section already does.
- **Bundle size.** Keyed strings plus three tables is efficient over the wire. The fork wastes its savings on the
  `Pr` map in the main chunk and on repeating `allowedBaseCodes` per record. Our pre-rendered text is about as large
  as keyed text after gzip, so size is not a reason to switch.
- **Offline.** Ours works from IndexedDB after one load. The fork has nothing persistent, but it has no external
  runtime dependency either.
- **SEO.** Neither app prerenders. Multi-language without per-language URLs (both apps use localStorage) gives
  search engines nothing extra. Real gains would need `/<lang>/` routes or prerendered pages.

---

## 11. What a path to multi-language would look like for us

1. **Keep the strings in the bundle.** Extend `build/strings.ts` to keep `zhTW`, `zhCN` (and optionally the other
   10 D2R languages) next to `enUS`. The data is already in the clone, with no third-party pack.
2. **Render per language at build time.** Our renderer is a pure function of `(tables, strings)`, so run
   `createStatRenderer` once per language and write `runewords.<lang>.json` / `affixes.<lang>.json`, or store
   `{key,args}` like the fork and render in the browser. Build-time rendering keeps our descfunc logic and oracle
   test. Runtime rendering keeps bundles language-neutral. Build-time fits our architecture better: no runtime
   engine and the same `?v=` caching.
3. **The HTM pages are the blocker.** The scraped pages exist only in English. Multi-language browse pages need
   their content from txt: runewords/gemwords from `runes.txt` + gems, uniques from `uniqueitems.txt`, mythicals,
   ascendancies. That is a real migration (M–L), not a toggle. Until then a language switch would cover Game Data,
   the loot filter and the UI chrome only.
4. **UI strings.** Add a small typed dictionary hook (the fork's `t(key, vars)` is about 15 lines) or a library.
   Expect around 700 keys, judging by the fork. The guide notes (`content/guide/`) would need translated markdown,
   which is the largest cost and the one that goes stale fastest.
5. **Search.** Build `searchText` from every enabled language, as the fork does, so names typed in any language work.
6. **URLs/SEO.** Prefer `?lang=` or `/<lang>/` over localStorage only, so links keep the language.

---

## Corrections to `analysis/site-bundle-inventory.md`

- **Unused i18n keys: about 211, not 238.** The usage scan only searched the main bundle. 15 `auth.error.*` /
  `auth.toast.*` keys are used in `authSaga` (`n("auth.error.loadProfile")` etc.). 7 `builds.classes.*` and 5
  `localVessels.tier*` keys are built dynamically (`` r(`builds.classes.${c}`) `` L68881, `` e(`localVessels.tier${n}`) `` L62644).
- **`gemsockets.json` has 2,267 codes, not 2,307.**
- **Bases search is not three-language.** `Bs` (L57852) builds `searchText` from the current language only. The
  other kinds do span three languages.
- **The `Pr` map is assembled at L55125, not L55133.** The source data starts at L28466.
- **String tables have 7,184 keys** (inventory: "about 7,200"). The zh files are not copies of ESR's zh strings
  (only 1,562 of the zhTW values match).
- **The unique icon map is keyed by snake-cased unique name**, not by unique index (`hFe` L57643 + `Fr` L57683).
- `setLang` sets `html[lang]` to `zh-Hant` (not `zh-TW`) for Traditional Chinese. `zh-TW` is only the static
  `index.html` default.
- `dcraft.json` groups use the field `craft[]` (not `crafts`).

## Open questions

1. Is the fork's `/data` generated from the hosted 3.12.11 LAN files or from another revision? (The enUS drift vs 3.2.24 fits 3.12.)
2. Where do the zhTW texts with "(FR)/(AR)/(EDmg)" abbreviations come from?
3. Are `/data/*.json` served with long-lived cache headers? (Not captured.)
4. How are per-level `args` (e.g. `"2.5"`) derived, and does the pipeline sum or merge stats like our `renderLines`?
5. Does the pipeline handle descfuncs we special-case (mythical `item_mythicaldesc` descfunc 23, multi-line reversal)?
   The fork's `Doomfletch's Prism Desc` text differs from 3.2.24 in wording, which looks like version drift and not a renderer issue.
