# Builds and the item editor

**In short.** The fork's Builds feature started from our code: the same routes, Supabase tables, list/detail/profile screens,
export format, ESR version stamp and English strings ("The backend may be waking up…", "This downloads a raw JSON snapshot…").
It then replaced our form-and-grid UI with an in-game-style experience: a PNG **paperdoll** (player, weapon swap, mercenary),
a **10×4 charm inventory** with real charm shapes, an **interactive skill tree** with a level-based point budget, and a modal
**item editor**. The editor filters items by slot, picks a runeword base, fills sockets with jewels or runes, and adds
corruption, forge and D-craft annotations. It does not calculate stats. Along the way the fork dropped our per-item
"Stats updated" diff, Warlock and gemwords in the picker, and it has a snapshot-refresh bug on edit (see "Edit-save refresh").

Siblings: backend and auth details in `06-backend-auth-and-removed.md`; data files and translation in
`05-data-pipeline-and-i18n.md`; the Corruptions and Ascendancy reference pages in `02-reference-pages.md`.

Evidence: `bundle L…` = line in `site/index.pretty.js`; `saga` = `chunks/buildsSaga-DpF1NxP1.pretty.js`.

---

## 1. Build list (`/builds`)

**Fork** (`XHe` bundle L69155, filter bar `JHe` L69024, card `nB` L68919; `screens/20-builds-list.png`)
- Filters: search "Search builds..." (300 ms debounce, `YHe` L69017), class select "All classes" plus 7 classes
  (`oB` L69010: Amazon, Necromancer, Barbarian, Sorceress, Paladin, Druid, Assassin, **no Warlock**), sort "Newest" / "Most liked",
  and a "My Builds" toggle when signed in.
- Query (saga `M`): `builds.select("*, profiles!builds_user_id_fkey(display_name, discriminator, avatar_url)")`,
  `ilike('name', %q%)`, `eq('class')`, `eq('user_id')` for My Builds, ordered by `likes_count desc` (Most liked) then
  `created_at desc, id desc`, with a keyset cursor built as a PostgREST `or(...)` string (saga `P`), `limit 50` (`cOe`).
  After each page it loads which of these build ids the viewer has liked, with one `likes` query.
- Infinite scroll with an IntersectionObserver; skeleton cards; "Builds are temporarily unavailable." + "Try again";
  empty states "No builds match your filters." / "No builds yet. Be the first to share a build!".
- Card: name, class badge, author avatar + display name, date, heart + count, "ESR {v}" badge with the hint
  "Created on a different ESR version than yours" when it differs.
- "Create Build" when signed out opens the email magic-link dialog "Sign in to create, like, and share builds."
  (`screens/23-builds-create-signedout.png`).

**Ours** (`src/features/builds/screens/BuildsScreen.tsx`, `components/BuildFilters.tsx`, `store/buildsQuery.ts`)
- The same thing: name search (`ilike`), class select, newest | most_liked, My Builds toggle, keyset infinite scroll with 50 per page,
  skeletons, liked-by-me heart, ESR badge. Our class list includes **Warlock** (`constants.ts`).

**Difference / takeaway:** none of substance. The fork's list is ours plus the i18n layer. The fork removed Warlock from the class
list (and from `skills.json`). That is a regression for ESR 3.2 players and the opposite of what we decided.

## 2. Build detail (`/build/:id`)

**Fork** (`LWe` bundle L74451; `screens/24-build-detail.png`, `24-build-detail-full.png`)
- Header: name, class badge, author (avatar, links to `/user/:id`), created date, "ESR {v}" badge, then the buttons
  like (heart + count, sign-in needed), "Copy Link", "Export". For the owner it adds Edit and a "More actions" menu with Delete,
  which confirms with "This permanently deletes "{name}" and all its likes. This action cannot be undone.".
- Version lines: badge tooltip "You are on ESR {v}" (L74642); "Created on ESR {created}, updated on ESR {updated}" when the
  two differ (L74651); an amber box "This build was created on ESR {build} (you are on {current}) — check the changelogs for
  balance changes." (L74708). "Current" is the viewer's local `metadata.esrVersion` in Dexie (L74465), which the fork fills from its hosted `/EasternSun/modinfo.json` (chunk `localModInfo`),
  not a game-file tag. Every build observed live is stamped "ESR 3.12.11".
- Description and free-text "Skills" sections (plain text, no markdown).
- Tabs **Player Gear / Skills / Mercenary Gear**, each with a zoom switch 100/85/75/60% (`EWe` L74443).
  - Player Gear: a read-only paperdoll (§4) with charms and the ascendancy slot (`screens/26-build-detail-slot-click.png`).
  - Skills: "Level {n}" and a read-only skill tree (§6) (`screens/29-build-skills-tab.png`).
  - Mercenary Gear: the same paperdoll without swap tabs; the inventory area is replaced by the merc notes (`screens/30-build-merc-tab.png`).
- Hover or tap on an item opens a tooltip (`Vb` L70731; `screens/25-build-hover-weapon.png`) with these parts, top to bottom:
  coloured CORRUPTED / FORGE / D-CRAFT blocks, then the item card (name, "6 Socket", "Lvl 60", rune/jewel chips, "Items:",
  property lines). For set items it shows "{n}-piece bonus" / "Full set" depending on the number of equipped pieces of that set
  (`AIe` L69756). Charms show their free-text label (`screens/25-build-hover-charm.png`).
- Not-found and load-failed states: "Build not found" / "This build may have been deleted.", and "Couldn't load this build. The backend may be waking up.".

**Ours** (`screens/BuildDetailScreen.tsx`)
- Same header, like, Copy Link, Export, owner Edit/Delete under "More actions", ESR badge and amber mismatch warning
  (we compare `esr_version_updated ?? esr_version` against the local version; the fork compares the created version).
- Sections: Equipment (text grids for Player Gear, Weapon Swap, Mercenary, 10 + 2 + 10 slots, `EquipmentGrid`, `WeaponSwapGrid`),
  Description, Skills (free text), Charms (badges), Ascendancy.
- Items render as our normal browse cards (`BuildItemCard`) with a per-item **"Stats updated"** diff against the saved snapshot
  (`utils/itemDiff.ts`) and the fallback "This item may no longer exist in the current ESR version." (`SlotCell.tsx`).

**Difference / takeaway:** the fork's detail page looks like the game, and the tooltips show item art, sockets, set bonuses and crafting.
Ours shows the full item cards at once and tells you when an item changed since the build was saved. The fork still has the
strings `builds.slot.statsChanged` / `statsUpdated` / `noLongerExists` / `savedWithBuild` but uses none of them, so it
**dropped the snapshot diff**.

## 3. Create / edit flow and sign-in gating

**Fork** (form `kB` bundle L73516-74190; edit `AWe` L74252)
- Fields: "Build name" (required, max 100, placeholder "e.g. Hammerdin MF"), class select, **Player Level** with −/+
  steppers and "MAX" (1…110, default 99; `td/Bm/eh` L69018-69020), "Description (optional)" (max 2000), "Skills (optional)"
  (free text, max 2000), "Ascendancy (optional)".
- Tabs **Player Gear / Skills / Mercenary Gear**, using the same paperdoll, charm grid and skill tree as the detail page, now editable.
  Before a class is chosen, Skills shows "Select a class first to allocate skill points.".
- Unsaved-changes guard: react-router blocker + `window.confirm("You have unsaved changes. Are you sure you want to leave?")`
  + `beforeunload` (`uIe` L69407).
- Submit is enabled only with a trimmed name of 1-100 characters and a class (L73588). Create inserts `{user_id, name, description|null, class,
  build_data, esr_version}` (saga `Me`); update writes `{name, description, class, build_data, esr_version_updated}` (saga `Ue`).
  Both version values come from the author's local `metadata.esrVersion`.
- Gating: the saga throws "You must be signed in to create a build."; liking, editing, deleting and profile edits need
  sign-in. Owner checks happen in the client; RLS is not visible from the bundle (see `06-…`). The only sign-in in the UI is the email
  magic link; Discord is in the code but no button reaches it.
- Toasts are hard-coded English in the saga ("Build created.", "Build updated.", "Could not save the build.").

**Ours** (`components/BuildForm.tsx`, `buildFormModel.ts`, `screens/CreateBuildScreen.tsx`, `EditBuildScreen.tsx`)
- Name, description, class (8 incl. Warlock), ascendancy picker (all names, not class-filtered), skills text, charms list
  (one text per charm, ≤100 chars), 22 inline slot pickers, per-slot notes (≤500 chars), the same unsaved guard. Sign-in + privacy
  consent gate. Discord OAuth and magic link. **No level field.**

**Difference / takeaway:** the fork's form is mostly visual (paperdoll + editor dialog), ours is a long form of pickers.
Player level only exists in the fork, where it drives the skill budget and required-level checks.

## 4. Paperdoll

**Fork** (`xf` bundle L69950-70681; slot backgrounds `DIe` L69875)
- Background `/planner/paperdoll/background.png` in a 1162×1507 coordinate space, scaled by zoom.
- 10 hotspots: helmet, amulet, armor, weapon, shield, gloves, ring1, belt, ring2, boots. The weapon and shield frames have
  **I / II swap tabs** (`tab.00/01.png`, label "Weapon Swap (I/II)") that switch to the `weapon2` / `shield2` slots.
- Each item is drawn with its D2R inventory icon (unique/set icons by `index`+`code`; runewords by `baseCode`). Socketed runes and
  jewels are overlaid in the game's socket patterns (`SIe` L69614, lookup tables `yIe` / `bIe`).
- Item colours by type (`LIe`): unique amber, mythical fuchsia, runeword orange, gemword sky, set green, freetext neutral.
- **Ascendancy slot** under the inventory: stone icon + name ("Sharpshooter Ascendancy Stone"), "No ascendancy selected — click
  to choose." while editing, and a card popover (`OS`) on detail.
- Mercenary: same slots, no swap tabs, inventory area becomes a merc-notes textarea (max 1000, L70120).
- Mobile: "Tap to view" and "Scroll down or press ↓ to page" hints (L70631).

**Ours:** no paperdoll. `EquipmentGrid` is a responsive grid of labelled slot cells.

**Takeaway:** the paperdoll is the most visible gain, but it needs D2R HD art (background, slot frames, item icons). The fork
serves that art from its own mod-asset host (see `05-…`). We ship no game art today.

## 5. Charm inventory (10×4)

**Fork** (`pIe` bundle L69473; shapes `xs` L69350)
- Grid `Pc`×`Fc` = 10×4 cells. There are five charm kinds with art and sizes:

| kind | label | w×h |
|---|---|---|
| `lilith_02` | Lilith 02 | 2×3 |
| `demon_tablet_02` | Demon Tablet 02 | 2×3 |
| `eternal_hourglass` | Eternal Hourglass | 1×2 |
| `hellfire_torch` | Hellfire Torch | 1×2 |
| `square` | Square Charm | 2×2 |

- You pick a kind, type a label (max 100, placeholder "e.g. Annihilus, 9x Paladin Combat GCs") and click "Add charm". It is
  **auto-placed first-fit** (`iB`, row-major). There is no dragging; charms are only removed (×) and re-added.
- Counters "Used {used}/{total}" and "{free} free"; "Not enough space" when nothing fits.
- Stored as `inventoryCharms: [{id, kind, text, x, y}]`. Our legacy `charms: string[]` is converted into square charms on load
  (`cB` L69390, `dB` L69670). The submit still writes a separate legacy `charms` string list next to `inventoryCharms` (L73600; whether it mirrors the grid labels is unclear, inferred).
- The charms are not items: they have no stats and are not linked to unique charm data. The "kinds" are art choices, not
  ESR charm bases (small/large/grand charms do not exist as shapes).

**Ours** (`components/CharmsEditor.tsx`, `utils/charms.ts`): a list of up to N free-text charm strings shown as badges.

**Takeaway:** the grid is good visually but carries no more information than our list, apart from the chosen art.
If we adopt it, it is worth mapping kinds to real charm sizes (1×1 / 1×2 / 1×3) instead of art.

## 6. Skill tree

**Fork** (`gB` bundle L70987-71232; helpers L70950-70985; data `remote-data/data_skills_skills.json`)
- Data: 7 classes (no Warlock), each `{class, className, tabs[3]}`; a tab is `{page, name{enUS,zhTW,zhCN}, bg, skills[]}`; a skill is
  `{key, name{…}, row, col, iconCel, icon, reqlevel, mana, maxlvl, reqskills[]}`. That is 245 skills in all, with 10-13 per tab
  and `maxlvl` 20 everywhere.
- Rendered with the D2R panel art (`/EasternSun/data/hd/global/ui/panel/panel_bg.png`, per-class tree backgrounds, skill icons and
  a "pressed" icon variant via `JIe`) with three tab buttons (`screens/29-build-skills-tab.png`).
- Controls: "Click to add 1 point, right-click to remove, Shift+click to max out.", with key legends.
- Rules (`CA` L70967): a point can be added only if the skill is below `maxlvl`, the total is below the **budget = level + 12**
  (`mB`, `VHe=12`; 111 points at level 99, 122 at 110), the skill's `reqlevel` is at most the build level, and every `reqskills`
  entry has at least 1 point (`fB`). Removing a prerequisite removes the points of the skills that depended on it, repeating
  until nothing changes (`VIe` L70968).
- UI: "{n} skill points remaining", "Reset points", a tooltip with "Required level {level}", "Mana", "Requires: {skills}",
  "{n} / {max} points" (`screens/29-build-skills-hover.png`).
- Stored as `skillAllocations: {skillKey: points}`. The free-text "Skills" field remains alongside.
- It does not handle +skills from gear, synergies or skill damage. It is an allocation chart only.

**Ours:** free-text "Skills" only. A structured tree is listed as out of scope in `builds-feature-docs/FEATURE-BUILD-SHARING.md`.

**Takeaway:** we could build this from our own build-time txt pipeline (`skills.txt` / `skilldesc.txt` give row, column, reqlevel,
reqskills and maxlvl, including Warlock) instead of a hand-made JSON. The "+12" budget constant should be checked against ESR's
quest rewards (inferred: vanilla is (level−1) + 12).

## 7. Public profiles (`/user/:id`)

**Fork** (`PWe` bundle L74898; `screens/32-user-profile.png`): avatar initials, `display_name#discriminator` (e.g. "Kuangtu91#7793"),
"Joined {Month Year}" from `profiles.created_at`, the user's builds (newest only, 50 per page), "Edit profile" on your own page.
Empty states "You haven't shared any builds yet." / "This user hasn't shared any builds yet.".

**Ours** (`screens/UserProfileScreen.tsx`): the same. The owner edits the display name and gets a new random discriminator,
with a retry on collision.

**Difference:** none (the fork's discriminator retry on `23505` is the same idea).

## 8. Item editor (modal "Item Editor")

Opened by clicking a paperdoll slot while editing (`wWe` bundle L71987-73509). It has two tabs: **Select** and **Edit**.

### 8.1 Select tab: what is offered per slot
- Type filter (`mWe` L71514): "Mythical Unique", "Unique Items", "Runewords", "Set Items". **Gemwords are not offered**
  (the model and refresh path still support `gemword`). Freetext: "Use "{text}"", shown as "(custom)".
- Items are limited to categories valid for the slot (`hWe` L71488):

| slot | allowed categories |
|---|---|
| weapon, shield (+ swap) | one shared set: all weapon categories (Bow … Barbarian Javs, quivers, orbs, claws, katanas) **plus** Shield, Auric Shields, Voodoo Heads |
| helmet | Helm, Circlet, Pelt, Primal Helm, Spirit Crown |
| armor | Armor, Robe, Cloak |
| gloves / boots / belt | Gloves / Boots / Belt |
| amulet | Amulet + 8 class amulet types (Viper Amulet, Amazonian Pin, …) |
| ring1/ring2 | Ring + 7 class ring types (Amazonian Loop, …) |

- A runeword is listed only if one of its `allowedBaseCodes` maps to a category valid for the slot. Rows show icon, "Items:",
  "Sockets:", "Base:".

### 8.2 Runeword base selection
Picking a runeword opens **Select Base** (L73400-73480): bases from the runeword's `allowedBaseCodes` that have
`gemsockets[code] ≥ runeword sockets` (`remote-data/data_bases_gemsockets.json`: a flat `{code: maxSockets}` map, 2,267 codes,
max 6). There is a category filter (All / Weapon / Shield / Helm / Armor / Gloves / Boots / Belt), "Search bases..." and each
base's socket count. The choice is saved as `baseCode` and drives the icon and the bonus display.

### 8.3 Edit tab (sub-tabs Sockets / Runes / Corrupt / Forge / D-Craft)
- **Sockets** (non-runeword items): pick 1…N. N = `hA(invW, invH, gemsockets, slotCap)` (L69653), the minimum of
  inventory cells (w×h), base max sockets ("Base max {n} sockets") and the slot cap `Kb` (L69658):
  weapon/shield/armor (and swaps) 6, helmet 4, gloves/boots/belt 2, amulet/rings 1. Prompt: "Select 1-6 sockets to show socket options".
- **Socket fillers** (`pWe` L71595): **Dark Jewels** (unique jewels `jew` + mythical jewels `mjw`, sorted by name),
  **New Runes** r01-r45, **Original Runes** r51-r83, **Kanji Runes** r84-r97 (sorted by number). Stored as
  `snapshot.socketed = [{name, code, index?}]`.
- **Runes** (runewords): the recipe is fixed ("Runeword sockets are fixed, cannot add more"). `jew` positions in the recipe
  become selectable jewel sockets.
- **Bonus display**: "{base} bonuses:" lists the runeword's rune/gem self bonuses for the chosen base's `gemapplytype`
  (0 weapon, 1 helm, 2 shield; L72836-72860); "Base rune bonuses:" lists the bonuses of runes socketed into a non-runeword item
  (L73095-73115). The lines are listed as they are; nothing is summed.
- **Corrupt**: searchable list of the outcomes for the slot's group in `corruptions.json` (`TA` L71329: Weapon, Shield, Body Armor,
  Helm, Gloves, Boots, Belt, Amulet, Ring), "Selected corruption:", Clear.
- **Forge**: a sub-mode switch "Affix / New Rune / Kanji Rune" (L73236). Affix uses the **hard-coded** table `gWe`
  (L71530-71594, enUS/zhTW/zhCN labels). The New Rune / Kanji Rune modes list rune names. Slot filter `oWe`
  maps weapon **and shield** to "weapon", armor to "armor", amulet to "amulet", everything else to "other":

| forge affix | allowed |
|---|---|
| +1 to All Skills; +1 to {class} Skill Levels (7 classes, no Warlock) | all |
| +48% Attack Rating; +48% Enhanced Damage; +64% DTU · +64% DTD | weapon + shield slots |
| +40% Better Chance of Getting Magic Items | all except weapon/shield slots |
| +20% IAS; +16% Max Life; +20% FCR; +16 All Res; +16% Max Mana | all |
| +32% Enhanced Defense | body armor |
| 12% Chance of Crushing Blow | all except weapon/shield/body armor |
| Level 10 Blessed Aim / 15 Concentration / 20 Defiance / 10 Vigor / 30 Thorns / 21 Conviction / 15 Meditation Aura | amulet |

- **D-Craft** (`vWe` L71858; slot map `iWe` L71374: Weapon, Shield, Torso (body armor), Helm, Armor (gloves/boots/belt), Amulet, Ring):
  rows of {searchable affix select, "Craft Qty" (digits only), "Max" button that fills `maxCraft`}, Add/Delete row, free text allowed.
  `remote-data/data_dcraft_dcraft.json` is `[{slot, slotLabel (zh), icon, craft:[{lines:[{key, args, priority, mythical, perLevel}], maxCraft, icon}]}]`:
  7 slot groups with 15-21 crafts each; `lines[].key` is a game string key formatted with `args`, and `maxCraft` ranges from 5 to 199.
- **Confirm / Delete / Reselect** commit the item and its annotations to the slot.

### 8.4 How annotations are stored: as display text
Corrupt, forge and D-craft choices are saved as **rendered strings in the author's UI language** (forge `MA(name1, locale)`,
L72037; D-craft rows `{val, num}` with `val` = text). On a Chinese author's build, English viewers see "汉符: 月" and
"+3% 穿透攻击 ×32" (`screens/25-build-hover-weapon.png`). Nothing is re-localised, and stat values do not update when ESR changes
a corruption or craft.

### 8.5 What it does not do
No stat calculator: no summed resistances, FCR/IAS breakpoints, life, damage, or +skills applied to the tree. Socket
fillers, forge and D-craft do not change the item's property lines; they are shown as separate annotations.

**Ours** (`components/EquipmentSlotPicker.tsx`, `hooks/useEquipmentItems.ts`, `utils/buildSnapshot.ts`)
- A cmdk popover per slot, grouped Unique Items / Mythical Uniques / Runewords / Gemwords / Custom, up to 8 per group, with
  variant hints for same-name uniques. **No slot filtering** (any item fits any slot), no base choice, no sockets, no set items.
  Crafting and corruption go into a free-text per-slot note (≤500 chars).

## 9. Build data model (`builds.build_data` JSON)

Assembled in `kB` submit (bundle L73590-73625); empty keys are left out.

```jsonc
{
  "items":      { "<helmet|weapon|armor|shield|gloves|belt|boots|ring1|amulet|ring2>": ItemRef },
  "weaponSwap": { "weapon2": ItemRef, "shield2": ItemRef },
  "mercenary":  { "<same 10 slots>": ItemRef },
  "itemNotes": {…}, "weaponSwapNotes": {…}, "mercenaryNotes": {…},   // legacy (ours); editor UI not located (inferred unused)
  "corruptNotes": { "<slot>": "text" },    "mercCorruptNotes": {…},
  "forgeNotes":   { "<slot>": "text" },    "mercForgeNotes":   {…},
  "dcraftNotes":  { "<slot>": [{ "id": 0, "val": "text", "num": "32" }] }, "mercDcraftNotes": {…},
  "mercNotes": "text (≤1000)",
  "charms": ["label", …],                                          // legacy string list, still written
  "inventoryCharms": [{ "id": "…", "kind": "square", "text": "…", "x": 0, "y": 0 }],
  "ascendancy": "Sharpshooter Ascendancy Stone",
  "skills": "free text",
  "level": 110,                                                    // omitted when 99
  "skillAllocations": { "spearstorm": 20, "fend": 1 }
}
```

`ItemRef` variants. From the editor (L72270) and the converters `uOe/dOe/hOe/mOe` (L69264-69305):
- `{type:"unique"|"mythical", id, snapshot:{name, baseItem, category, reqLevel, properties, index, code, socketed?}}`
- `{type:"set", id, setName, snapshot:{…same}}`. This variant is **new in the fork**.
- `{type:"runeword", name, variant, baseCode?, snapshot:{sockets, runes, gems:[], allowedItems:[], columnAffixes, reqLevel, socketed?}}`.
  The editor writes `allowedItems: []` and copies the same `properties` into all three `columnAffixes` columns.
- `{type:"gemword", name, variant, snapshot:{…}}` (no UI), `{type:"freetext", name}`.

**Edit-save refresh (bug, inferred from code).** On update only, the saga re-resolves every item against local Dexie (saga
`Ee/Ie`). Uniques and mythicals are rebuilt with `uOe`/`dOe`, which keep `socketed` but **drop `index` and `code`**. Runewords are rebuilt
with `hOe`, which **drops `baseCode` and `snapshot.socketed`**. Set items are kept as they are. Saving an edit should therefore lose the chosen
runeword base and the jewels placed in runeword sockets, and it may break unique icons that use `snapshot.code` (L70443).
Not verified live.

**Export JSON** (`BWe` L74403, `TWe` L74392): a dialog with the same text as ours, then a download of
`{exportedAt, app:"D2R ESR Browser", source: location.href, build}` as `<slug>-<id8>.json`. `build` is the raw Supabase row:
`id, user_id, name, description, class, build_data, esr_version, esr_version_updated, likes_count, created_at, …`, plus the joined
`profiles {display_name, discriminator, avatar_url}`. There is no import. This is identical to our `utils/buildExport.ts`, with a slightly
different slug function.

## 10. Observed in the browser

The screenshots below were reviewed directly; the live browse report (`analysis/site-live-inventory.md`) was written in parallel and agrees with them.
- List: `screens/20-builds-list.png`, `20-builds-list-full.png`, class dropdown `21-builds-class-dd.png`, sort `22-builds-sort-dd.png`.
  Most builds have Chinese titles from a few authors; like counts are 0-2; every card shows "ESR 3.12.11".
- Signed-out create: `screens/23-builds-create-signedout.png` (magic-link dialog over skeletons).
- Detail: `screens/24-build-detail.png`, `24-build-detail-full.png`, `27-build-detail-60pct.png` (zoom), paperdoll with swap tabs,
  4 charms and ascendancy `26-build-detail-slot-click.png`. Tooltips: `25-build-hover-weapon.png` (corrupt/forge/D-craft blocks,
  sockets as Jewel/Moon/Ko/U chips), `25-build-hover-amulet.png`, `25-build-hover-charm.png`.
- Skills: `screens/29-build-skills-tab.png` (Level 110, three tabs), `29-build-skills-hover.png`, `29-build-skills-tree3.png`.
- Mercenary: `screens/30-build-merc-tab.png` (empty merc paperdoll, notes area). Export dialog: `31-build-export.png`.
  Profile: `32-user-profile.png`.
- The create/edit form and the item editor were not captured (sign-in required).

---

## Comparison

| Feature | Fork | Ours |
|---|---|---|
| List: search / class / sort / My Builds / 50-per-page keyset | yes | yes |
| Classes | 7 (no Warlock) | 8 incl. Warlock |
| Detail layout | tabs Player / Skills / Mercenary, PNG paperdoll, tooltips | stacked sections, text slot grids with full item cards |
| Weapon swap | I/II tabs on the paperdoll | separate 2-slot grid |
| Mercenary | paperdoll + notes (≤1000) | 10-slot grid |
| Charms | 10×4 grid, 5 art shapes, first-fit, labels | list of text badges |
| Ascendancy | paperdoll slot with stone icon + popover | text section, picker of all names |
| Player level | 1–110, default 99 | none |
| Skill tree | interactive, budget level+12, reqlevel + prerequisites, LMB/RMB/Shift | free text |
| Zoom | 100/85/75/60% | n/a |
| Item picker | modal, filtered by slot, mythical/unique/runeword/set, freetext | popover, unfiltered, unique/mythical/runeword/gemword, freetext |
| Gemwords in builds | model only, no UI | yes |
| Set items in builds | yes, with piece-count bonuses | no |
| Runeword base | chosen from allowed bases with enough sockets | none |
| Sockets / socket fillers | 1…cap; dark/mythical jewels, new/original/kanji runes | none |
| Rune bonus display | per base `gemapplytype`, not summed | n/a (card shows all columns) |
| Corruption / forge / D-craft | structured pickers, stored as localised text | free-text slot note |
| Stat calculator | none | none |
| "Stats updated" diff vs snapshot | removed (strings remain) | yes |
| ESR version stamp + mismatch | yes (compares created version) | yes (compares updated ?? created) |
| Like, Copy Link, Export JSON, owner delete | yes | yes |
| Public profile `Name#1234` | yes | yes |
| i18n | enUS/zhTW/zhCN UI (toasts English) | English only |
| Defensive parse of `build_data` | legacy charm conversion only | `asBuildData` validates every field |

## Data-model differences

| Key | Fork | Ours |
|---|---|---|
| `items` / `weaponSwap` / `mercenary` | same maps; `ItemRef` adds `set`, `baseCode`, `snapshot.index/code/socketed` | same maps; mythical snapshot has `specialProperties` (fork lacks it, inferred older base) |
| `itemNotes` … `mercenaryNotes` | kept; editor UI not located (inferred unused) | per-slot free-text notes (≤500) |
| `corruptNotes`, `forgeNotes`, `dcraftNotes` (+ merc) | new | — |
| `mercNotes` | new (≤1000) | — |
| `charms` | legacy string list, still written next to the grid | the only charm field |
| `inventoryCharms` | new `{id, kind, text, x, y}` | — |
| `level`, `skillAllocations` | new | — |
| `ascendancy`, `skills` | same | same |
| Validation | none on read beyond legacy conversion | `asBuildData` drops unknown/malformed fields, so the fork's extra keys would be dropped if our app read them |

Table columns are unchanged (`builds`, `likes`, `profiles`; see `06-backend-auth-and-removed.md`). The new structure all sits in the
`build_data` JSON, with no size constraint either side.

## Takeaways for our builds feature

1. **Filter the picker by slot** (fork better, S). Our picker lets you put a helm in the ring slot. The fork's category sets
   (`hWe`) and the runeword `allowedBaseCodes` → slot check carry over directly; our game-data bundles already have item types.
2. **Runeword base + socket model** (fork better, M). A `baseCode` on runeword refs, chosen from allowed bases with enough
   sockets, gives us correct column bonuses for that base and a better tooltip. Our txt pipeline has `gemsockets` and `gemapplytype` per base.
3. **Structured crafting annotations, stored as data** (fork's idea better, its storage worse, M). Corrupt / forge / D-craft
   pickers beat a free-text note, but store **ids or string keys + args** (as `dcraft.json` lines already are), not localised text.
   Derive the forge table from game data instead of hard-coding it.
4. **Player level + skill allocation** (fork better, M-L). Build the tree from `skills.txt`/`skilldesc.txt` at build time
   (Warlock included); keep the free-text field for explanations; check the budget constant against ESR.
5. **Keep our snapshot diff and defensive parsing** (ours better). The fork dropped "Stats updated" and does not validate
   `build_data`; any new fields we add should get `asBuildData` validators and diff support.
6. **Avoid the fork's edit-save refresh bug** (ours better today). If we add `baseCode`, `socketed` or icon keys, `refreshBuildData`
   / `resolveCurrentRef` must carry them over, and a test should cover it.
7. **Weapon swap and merc as tabs** (fork better UX, S). A Player / Skills / Mercenary tab split shortens our long detail page even
   without a paperdoll.
8. **Paperdoll and charm grid are optional** (M-L, depends on art). They need D2R HD art we do not host. If we build a charm grid, use
   real charm sizes rather than art kinds, or it adds nothing over our list.
9. **Set items in builds** (fork better, S-M), including the "{n}-piece bonus" display. This is out of scope in our spec today but cheap
   with our sets data.
10. **Keep Warlock and gemwords** (ours better). The fork lost both in the builds UI.

## Open questions

- Is the edit-save refresh loss of `baseCode` / runeword `socketed` / `index`/`code` real in production? Check by editing a fork
  build and comparing the exported JSON before and after (needs an account).
- Is the skill budget `level + 12` correct for ESR (vanilla gives (level − 1) + 12 = 110 at 99)?
- Are the forge values in `gWe` (e.g. +48% AR, 21 Conviction) current for ESR 3.2, and where do they come from?
- Server-side RLS for the fork's `builds` table is unknown, so is the owner-only edit enforced only in the client?
- Where do `inventoryCharms` kinds come from in the mod (Lilith 02, Demon Tablet 02 look like ESR items, not charm sizes)?
- The create/edit form and the item editor were not captured live (sign-in required); their description comes from the bundle only.
