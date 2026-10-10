# Guide (new-player guide)

A set of small, linked notes for new ESR players, rendered inside the app at `/guide`. Research and decisions:
[FEATURE-GUIDE-RESEARCH.md](../../builds-feature-docs/FEATURE-GUIDE-RESEARCH.md).

Principles: one topic per note, short (target 150–250 words, build warns above 400), every note stamped with the ESR
version it was verified against, numbers that exist in the game files are never typed by hand (they come from
directives that regenerate with the game data), and the official docs stay canonical for reference tables.

## Routes

| Path           | Screen           | Notes                                                                                                            |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/guide`       | GuideSpineScreen | "Start here": the five-step journey spine, each step expands to its note cards; an "I found something" row below |
| `/guide/:slug` | GuideNoteScreen  | One note (anatomy below); unknown slug shows a "note not found" block with a link back to `/guide`               |

Guide routes render **before** the HTM data sync finishes (`AppLayout` skips the "Loading data..." gate for paths
under `/guide`). The guide bundle is static JSON and needs no Dexie data.

Header: `Guide` is the second entry in `INTERNAL_PAGES` (after Runewords) so it stays visible on narrow desktops.

## Note anatomy (GuideNoteScreen)

```
Guide › <title>                                             [Checked on ESR 3.2.12] | [Draft, not verified in-game]
<title>
<summary>
KNOW FIRST  [chip] [chip]                 (knowFirst, ≤3)
<body: paragraphs, ###/#### headings, lists, ≤1 table, data blocks>
IN THE APP  [icon link] …                 (links of kind "app" collected from the body, deduplicated, ≤4 shown)
OFFICIAL DOCS  <label> ↗                  (officialDocs, usually 1)
RELATED  [chip] …                          (related, ≤5)   ·  Mentioned in (n) ▸ collapsed backlinks
NEXT ON YOUR PATH →  <next note>          (spine order; hidden when null)
Sources: <sourceRefs titles>              (small, muted)
```

Phone: single column; "Next on your path" becomes a sticky bottom bar. No graph in phase 1 (chips carry every edge).

Version badge states (`noteFreshness(verified, manifest.esrVersion)` in `engine/freshness.ts`):
`draft` (verified is null) · `fresh` (equal or newer) · `outdated` (older patch, amber) · `old` (major.minor differs, amber, stronger wording).

## Content

```
content/guide/
  spine.yml          journey spine + "I found something" questions
  _glossary.yml      terms for the glossary note and :term[] hovers
  _sources.yml       attribution entries referenced by notes' `sources`
  notes/<slug>.md    one note per file; the slug is the file name (kebab-case, [a-z0-9-])
```

### Frontmatter

```yaml
---
title: Forging # required
kind: note # note | link | hub   (link = stub that mostly points to an official page)
summary: Add one removable bonus to an item with a forging recipe. # required, ≤140 chars, plain text
tags: [crafting] # optional
aliases: [forge, forged] # optional; search + glossary matching
knowFirst: [cube-basics] # optional, ≤3 slugs, validated
related: [d-stoning, enhancement-order] # optional, ≤5 slugs, validated
next: enhancement-order # optional; overrides the spine-derived "next on your path"
verified: 3.2.12 # ESR version the TEXT was checked against in-game; omit (or null) for a draft
volatility: high # low | high (high = mechanics numbers or route advice); default low
mentions: [Thawing Potion, Forging Hammer] # optional; item names the prose relies on, checked against game data (warning only)
officialDocs: # optional
  - label: Cube Recipes – Forging
    href: docs:Eastern Sun Resurrected Cube Recipes.html#forging
sources: [official-cube, esru-wiki] # ids from _sources.yml, validated
---
```

### Body syntax

Markdown (GFM tables and lists) with these additions. Anything else that is not plain markdown (raw HTML, images,
`#`/`##` headings) is a build error.

| Syntax                                                                              | Meaning                                                                                                                                                                        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `[[slug]]`, `[[slug\|label]]`                                                       | Link to another note. Validated; a missing slug fails the build.                                                                                                               |
| `[label](rw:Enigma)`                                                                | App link to the runewords page filtered to that runeword. Validated against the game-data runewords bundle.                                                                    |
| `[label](gw:Name)`, `(unique:Name)`, `(mythical:Name)`, `(socketable:Name)`         | App links to the gemwords / uniques / mythicals / socketables pages filtered by name (`?search="Name"`). Not validated.                                                        |
| `[label](base:crs)`, `(type:swor)`                                                  | App links to Game Data bases (by base code → `?search="<name>"`) / item types (`?type=code`). Validated against the bundles.                                                   |
| `[label](bestbase:Enigma)`, `(affixes:base=7cr&ilvl=85)`, `(page:/game-data/bases)` | App links to Best Base, Affixes, or any raw app path.                                                                                                                          |
| `[label](docs:gems.htm#anchor)`                                                     | Link to the official docs (`https://easternsunresurrected.com/<file>#<anchor>`). When the ESR clone is present the file and anchor are checked offline (warning when missing). |
| `[label](https://…)`                                                                | External link.                                                                                                                                                                 |
| `:term[Stocker]`, `:term[Stocker]{label=stockers}`                                  | Glossary hover; the term must exist in `_glossary.yml`. Renders the label (default: the term).                                                                                 |
| `::source[Annihilus]`                                                               | **Where it comes from** block for an item (unique, set or misc name) from `public/game-data/sources.json`. Unknown name fails the build.                                       |
| `::secret-recipes`, `::secret-recipe[50]`                                           | Secret recipe rows (`[SECRETnn]` rows of cubemain.txt), all or one.                                                                                                            |
| `::recipe-output[Adventurer's Pack]`                                                | The outputs of the cubemain rows whose description equals the argument (used for the Starter's Pack contents).                                                                 |
| `::vendor[Gheed]`                                                                   | Items that NPC sells (vendor columns of misc/armor/weapons).                                                                                                                   |
| `::difficulty-penalties`                                                            | Resistance and other penalties per difficulty (difficultylevels.txt).                                                                                                          |
| `::glossary`                                                                        | All glossary entries.                                                                                                                                                          |

Leaf directives (`::name[arg]`) must stand alone on a line. Directive arguments are resolved at build time against the
ESR clone and the committed game-data bundles; the browser only renders the resulting data block.

### spine.yml

```yaml
steps:
  - title: Before you leave town
    summary: What the Starter's Pack gives you and the two traps that end runs early.
    notes: [starter-pack, avoid-disasters, death-and-respec]
questions:
  - label: I found an item I don't recognise
    note: loot-triage
```

"Next on your path" = the next note in spine order (within the step, then the next step's first note). Notes that
are not on the spine have no next unless `next:` is set.

### \_glossary.yml / \_sources.yml

```yaml
# _glossary.yml
- term: Stocker
  definition: A container item bought from Gheed that holds many copies of one material as points.
  note: stockers # optional owning note slug
# _sources.yml
- id: esru-wiki
  title: ESR Unofficial Wiki (community, CC BY-SA 3.0)
  url: https://esru.fandom.com/wiki/Eastern_Sun_Resurrected_Unofficial_Wiki
  license: CC BY-SA 3.0
  note: Consulted for facts; all text rewritten.
```

## Build pipeline

Mirrors game-data. `npm run guide:generate` runs `scripts/generate-guide.ts`, which reads `content/guide/`, the ESR
clone (`../Eastern_Sun_Resurrected`, same resolution as game-data) and `public/game-data/*.json`, and writes
`public/guide/manifest.json` + `public/guide/guide.json` (sha256 in the manifest, `?v=<hash>` URLs, `generatedAt`
kept when nothing changed). `--check` exits 1 when the committed files are stale; `--watch` regenerates on content
changes (use next to `npm run dev`; a small Vite plugin reloads the page when `public/guide` changes).
`npm run game-data:update` also regenerates and checks the guide.

Build errors (exit 1): invalid frontmatter, unknown `[[slug]]`, `knowFirst`/`related`/`next`/`sources` ids, unknown
`rw:`/`base:`/`type:` targets, unknown `:term`, unresolvable directive arguments, unsupported markdown nodes, a note
that is neither on the spine nor linked from anywhere. Warnings (manifest `warnings`): body above 400 words, `mentions`
not found in game data, `docs:` file/anchor not found, ESR clone missing (directives cannot resolve → error).

Code layout:

```
src/features/guide/
  engine/schema.ts            bundle types (GUIDE_SCHEMA, GuideBundle, GuideNote, GuideBlock, DataBlock …)
  engine/freshness.ts         noteFreshness()
  engine/browser/loadGuide.ts browser loader (promise cache, schema check)
  build/                      generator-only code (excluded from the app tsconfig, included in tsconfig.scripts)
  hooks/useGuide.ts
  screens/, components/
  index.ts                    lazy-route exports
scripts/generate-guide.ts     thin CLI
public/guide/                 committed output
```

Shared (`engine/` + `build/`) code uses relative `.ts` imports, no `@/`, and no DOM, like game-data.

## Bundle shape

See `src/features/guide/engine/schema.ts`. One file, `guide.json`: `{ notes, spine, glossary, sourceRefs }`. Each note
carries its resolved body as a small typed tree (`GuideBlock[]`), its computed `backlinks`, `next`, `spineStep` and
`words`. Links in the body are already resolved: `{ type: 'link', kind: 'note' | 'app' | 'external', href }` where
`href` is a slug, an app path (without the base URL) or an absolute URL.

## Where it comes from (`sources.json`)

Generated by the **game-data** pipeline (`src/features/game-data/build/bundleSources.ts`) into
`public/game-data/sources.json`, so it refreshes with every `game-data:update`. Qualitative labels only, several per
item, in this order: `cube` ("Cube: Ancient Coupon" / "Cube: <family>" / "Cube"), `boss` ("Drops from <monster>"),
`maps` ("Drops in Endgame Maps"), `drop` ("Drops (random)"), `buy` ("Buy: <NPC>"), `gamble` ("Gamble"), `plugin`
("Boss drop (launcher plugin)"), `unknown`. The UI shows "Derived from the game files; may be incomplete." The guide
consumes it through `::source[...]`; phase 2 adds a Source line to the item cards.

## Tests

Logic only (no component tests): frontmatter validation, markdown → GuideBlock conversion, link resolution, backlinks
and next computation, directive resolvers against a trimmed excel fixture, freshness states, loader cache, bundle
integrity (regenerate from `content/` in memory and compare with the committed JSON; skipped when the ESR clone is
missing), source-label rules on the verified examples (Pelta Lunata, Krok's Basher, Mephisto's Will, Frostmourne,
Annihilus, Hellfire Torch, Kill Ledger, Orb of Anointment, Forging Hammer).

## Attribution

Notes list `sources` ids; the screen renders "Sources: …" from `_sources.yml`. The old unofficial wiki (CC BY-SA 3.0)
is consulted for facts only; no text or images are copied. The official site is linked, never mirrored.
