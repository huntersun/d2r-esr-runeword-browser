# Skills Feature

Every class skill tree and every item-granted skill from the ESR game files, with each skill's description, scalar
fields, synergies and the uniques, set items and runewords that grant it (`/skills`, `src/features/skills/`).

## Purpose

- Browse the 8 class trees (Amazon … Warlock) as the in-game grid: 3 tabs of 6 rows × 3 columns
- See what a skill does (description text, fixed values), its mana cost, level requirements, prerequisites and
  synergies
- Answer "which item gives me this skill?": every unique, set item and runeword that grants it, and how (usable
  skill, +levels, aura, charges, chance to cast on …), linked to that item's page
- Look up skills no class has: procs and item-only spells such as Rift Shot, Fire Surge or Mythical Decrepify
- Search every skill by name; share a view by URL
- Point to the official Frame Table (`FRAME_TABLE_URL` in `navConfig.ts`, `ias-calculator.html`; also an `OFFICIAL_LINKS`
  entry) for IAS and FCR breakpoints in the intro; the app does not compute breakpoints

Out of scope: per-level values (damage, duration, …). The game computes them with calc expressions (`clc4`,
`ln12`, `skill('Fire Ball'.blvl)`, …) that reference stats and other skills; only constants and skill params are
evaluated (see "Text").

## Data

Two bundles under `public/game-data/` (see [Game Data](./GAME-DATA.md)):

| File                | Built by                          | Used for                                                    |
| ------------------- | --------------------------------- | ----------------------------------------------------------- |
| `skills.json`       | `build/bundleSkills.ts`           | Tree layout (tabs, row / column), also the builds feature   |
| `skilldetails.json` | `build/bundleSkillDetails.ts`     | Details per skill and the granting items (this page only)   |
| `icons/skills/*`    | `scripts/generate-skill-icons.ts` | 64 px WebP cels cropped from the mod's HD skill icon sheets |

The details are a sibling bundle so `skills.json`, which every builds page loads, stays small (31 KB). Both are
generated in one run and joined by skill id in the browser (`utils/skills.ts` `buildSkillsView`).

### skilldetails.json

`SkillDetailsBundle` (`engine/schema.ts`): `items` (the granting items, `{ kind, name }`, sorted by kind and name;
same-name rows such as the 20 Ember of Creation variants share one entry) and `skills`:

- **Which skills**: every class skill of the trees (skills.txt `charclass` set, a skilldesc row on page 1..3), in class /
  tab / row / column order, then the **item skills**: skills.txt rows without a `charclass` that have a skilldesc row
  and that at least one item grants. ESR 3.2.24: 280 + 181 = 461.
- **Scalars**: `reqLevel` (`reqlevel`), `maxLevel` (`maxlvl`), `reqSkills` (`reqskill1..3`), `type` (`aura` column = 1 →
  aura, else `passive` = 1 → passive), `element` (`EType` as a label: fire → Fire, ltng → Lightning, …), `mana`
  = `[mana, lvlmana] × 2^manashift / 256` (cost at level 1 and per extra level; Fire Bolt 8 / 2 / shift 6 → 2 + 0.5 per
  level). `minmana` and calc-modified costs (`usmc`) are not applied.
- **Text**: `name` = skilldesc `str name`, `description` = `str long` split into lines (`str short` is identical for
  every ESR row and is not stored). A stub description that only repeats the name (Lightning Flash) is dropped.
  The page joins hand-broken lines into sentences (a line starting in lower case continues the one above).
- **lines**: descline1..6 and dsc2line1..5 entries whose values need no formula: the text (`desctexta*`) resolves, there
  is no second text (`textb`, used for singular / plural pairs and two-part lines), and every placeholder is fed by a
  calc that is an integer, a skill param (`par8`) or `+ - * /` of those. Lines that are a bare label ending in ":" are
  left out ("Attack Rating:" whose value is another line). Multi-line strings of these lines read bottom-up in game
  ("cast rate to a minimum of 0.2 seconds\nTick rate goes down…" is shown reversed); the page keeps the line breaks.
  Mana cost, damage, duration and other formula lines are left out.
- **synergies**: dsc3 lines after the `Sksyn` header ("%s Receives Bonuses From:"): textb is the synergy skill's name,
  texta the bonus format ("%s: %+d%% Fire Damage per Level"); `text` is the format without the name, with constants /
  params filled in and `?` for formulas ("+12% Fire Damage per Level", "+?% …"). `id` links to the skill when the name
  resolves (same class first) and differs from the name; the page links `id ?? name` when the bundle has that skill
  ("Any Other Curse" and "All sentries" stay plain text). A dsc3 line that is just a skill name is a synergy without a
  bonus. Other dsc3 texts without placeholders are `notes` (the "If both A and B have 20 levels: …" rules), read
  bottom-up like the lines.
- **icon**: `<class prefix>-<IconCel>` or `gen-<IconCel>` (see "Icons").
- **grantedBy**: `{ item, how, level, chance?, charges?, partial? }` per granting property (deduplicated):

| `how`                                                                                                                 | Columns                      | Shown as                                    |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------- |
| `oskill`                                                                                                              | par = skill, min–max = level | "+N levels (any class)" (usable skill)      |
| `skill`                                                                                                               | par = skill, min–max = level | "+N levels (class only)"                    |
| `aura`                                                                                                                | par = skill, min–max = level | "Level N aura when equipped"                |
| `charged`                                                                                                             | min = charges, max = level   | "Level N, C charges"                        |
| `hit-skill`, `att-skill`, `gethit-skill`, `kill-skill`, `death-skill`, `levelup-skill`, `cast-skill`, `takedmg-skill` | min = % chance, max = level  | "C% chance to cast level N on striking / …" |

Sources: uniqueitems.txt `prop1..12` (rows with an `index`, not `disabled`), setitems.txt `prop1..9` and the partial
bonuses `aprop1..5 a/b` (`partial: true`), runes.txt `T1Code1..7` (every recipe with a resolvable name: a recipe with
a rune code is a runeword, otherwise a gemword). The `par` is a skills.txt `skill` name (exact, then case-insensitive,
then a numeric row id). Not followed: the hidden variants (`oskill-hidden`, `aura-hidden`, `hit-skill-hidden`, …:
invisible on the item, mostly internal mechanics), random skills (`skill-rand`, `oskill-rand`), propertygroups.txt
pools and the set-wide bonuses of sets.txt.

Counts (manifest, ESR 3.2.24): `skillDetails` 461, `skillDetailsItemSkills` 181, `skillDetailsWithGrants` 438,
`skillDetailsWithSynergies` 226, `skillDetailsWithoutDescription` 93 (mostly item skills: ESR's surges, masteries,
trophies), `skillGrantItems` 1185, `skillGrants` 3122, `skillGrantsUndescribed` 0 (grants of class-less skills
without a skilldesc row, not listed), `skillIcons` 325. Size: 387 KB / 61 KB gzip.

Warnings (manifest): `skilldetails: unknown skill in <prop> "<par>" (<item>)` (ESR 3.2.24: one, Ember of Creation's
`oskill Axe Swarm`), missing name / description / dsc3 strings, duplicate skills.txt ids.

### Icons

The mod ships each class's skill icons as one horizontal sheet: `data/hd/global/ui/spells/<class>/<xx>skillicon.sprite`
(the sprite header's frame count is the number of 132 × 130 cels; Sorceress 100, Amazon 72, …). skilldesc.txt
`IconCel` is the cel; even cels are the icon, the odd cel after it the pressed variant. Skills without a class use
`spells/submenu/skillicon.sprite` (123 cels: Attack 2, Kick 0, Unsummon 4, Throw 6, and from cel 88 on ESR's
red-framed item skill icons such as Rift Shot 90). The `skillicon2` / `skillicon3` sheets (60 cels each) and the
`.lowend` copies are not used: skilldesc has no sheet column and every class `IconCel` fits the first sheet.

The mapping was checked by rendering cels (Fire Bolt 0 = the comet, Ice Bolt 6, Static Field 12, Teleport 36,
Blizzard 46, Whirlwind 50, Bone Spear 36, Werewolf 20, Summon Goatman 2, Attack / Unsummon / Throw on the generic
sheet). Many item skills share placeholder cels (generic cel 42 for Lightning Flash, Cold Flash, Shackles, …): that is
what the game files reference.

`npm run game-data:skill-icons` (also the last step of `npm run game-data:icons`) reads the icon keys of the committed
`skilldetails.json`, crops each cel, scales it to 64 × 63 and writes `icons/skills/<key>.webp` (WebP quality 80;
ESR 3.2.24: 325 files, 433 KB). The key names the file, so there is no separate index; the manifest count
`skillIcons` is the number of keys. `--check` (part of `npm run game-data:check`) fails on a changed, missing or
orphaned file and on a key whose cel is outside its sheet. No vanilla art is needed.

## Page

Route `/skills` (`SkillsScreen`, lazy-loaded), nav: Database ▾ → Skills (after Ascendancies), also a chip on the home
page's Items card.

- **Class pills**: the 8 classes in types.json order plus "Item skills" (with its count).
- **Trees**: each tab is a card with a 6 × 3 CSS grid; a tile (icon, name, required level) sits at its skilldesc row /
  column. From `lg` (1024 px) the three tabs are side by side and the detail card is a sticky column on the right;
  below that one tab is shown at a time (tab pills) and the card follows the tree (a tap scrolls to it).
- **Selection**: the selected tile is ringed; its prerequisites (transitively) are amber, the skills it unlocks
  directly sky blue.
- **Detail card**: icon, name, class · tab (or "Item skill", plus the skills.txt id when it differs from the name),
  fact chips (required level, max level, mana, element, aura / passive), description, fixed lines (blue), Requires /
  Unlocks links, "Receives bonuses from" (linked), notes, and **Granted by**, grouped into Usable skill, +Skill levels,
  Aura when equipped, Charges and Chance to cast; 8 per group, then "Show all N". Item links: uniques →
  `/uniques?name=`, or `/mythicals?name=` when the HTM mythicals list in IndexedDB has the name; set items →
  `/game-data/sets?name=`; runewords → `/runewords?name=`; gemwords → `/gemwords?name=` (the pages' exact-name focus).
- **Item skills**: the 181 class-less granted skills as a tile grid by name; the subtitle is the number of granting
  items, and same-name skills (Empowered Enchant × 6, Chain Lightning × 2, …) also show the id suffix ("Cold",
  "Djinn").
- **Search**: name search over all class and item skills (every word or "quoted phrase" must occur, case-insensitive); results replace
  the trees, picking one opens its class.
- **URL state**: `class` (class code or `items`), `tab` (1..3, narrow screens; omitted for 1), `skill` (skills.txt id),
  `search`. A link with only `skill` opens the skill's class and tab. "Copy Link" shares the view.

## Code

```
src/features/game-data/build/bundleSkillDetails.ts   builder (+ readGrantSources, evalSimpleCalc, bottomUp)
src/features/game-data/build/skillIcons.ts           sheet listing, icon keys, cel crop
scripts/generate-skill-icons.ts                      CLI: crop + WebP + --check
src/features/skills/
  screens/SkillsScreen.tsx      loads skills + skilldetails, URL state, layout, search, item skills
  components/SkillTreeTab.tsx   one tab grid
  components/SkillTile.tsx      one tile
  components/SkillDetailCard.tsx details + Granted by
  components/SkillIcon.tsx      icon <img> with a reserved square
  utils/skills.ts               view model, URL state, search, grant texts, item links
```

Tests: `build/bundleSkillDetails.test.ts` and `build/skillIcons.test.ts` (fixture rows), `bundleIntegrity.test.ts`
(committed bundle vs. trees, counts, Fire Bolt / Teleport / Rift Shot examples, one icon file per key),
`features/skills/utils/skills.test.ts`.

## Known gaps

- No per-level numbers (damage, duration, radius, synergy bonuses that are formulas show `?`).
- Skill tooltips' line order across description entries (descline1 vs descline2) follows the file, not verified
  in game; only the bottom-up order inside one multi-line string is confirmed by the data.
- Hidden grants, random-skill properties, propertygroups pools and set-wide bonuses are not listed.
- Mercenary (hireable) skills and their sheet `hireables/hrskillicon.sprite` are not covered.
- A unique and a runeword with the same name (Enigma) are separate entries; the unique links to the Uniques page
  unless the HTM mythicals list knows it.
