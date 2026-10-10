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
Guide › <title>                                             [Checked on ESR 3.2.12] | [Draft – not yet verified in-game]
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

Phone: single column; "Next on your path" becomes a sticky bottom bar.

**Local graph** (`lg+` only; `components/LocalGraph.tsx`, layout in `engine/localGraph.ts`): on wide screens the note
sits in a two-column grid (body 2/3, a sticky "Connections" column 1/3). `layoutLocalGraph(note, bundle, size)` places
the note in the centre, `knowFirst` on the left arc, `related` then backlinks on the right arc and `next` at the
bottom; each slug appears once (next > knowFirst > related > backlink), at most 8 neighbours (knowFirst, next, related,
then backlinks). Inline SVG with rem labels (truncated to 18 chars, full title in `<title>`): know-first edges have an
arrowhead, the next edge is dashed, the current note is filled with the primary colour, read notes are filled grey.
Nodes are links (keyboard focusable, same hover/focus peek as note links). Below `lg` the graph is hidden; the chips and
the next link carry every edge, so the graph is never the only way to reach a note.

**Visited notes**: `useVisitedNotes()` keeps the slugs the viewer has opened in localStorage (`guide.visited`, string
array, most recent last, capped at 200; pure helpers in `utils/visited.ts`). Opening a note marks it read; chips and
spine cards show a ✓, graph nodes are filled. "Reset progress" at the bottom of `/guide` clears the list (after a
confirm). Per browser only, never synced.

Version badge states (`noteFreshness(verified, manifest.esrVersion, note.staleReasons)` in `engine/freshness.ts`):
`draft` · `fresh` · `review` (amber, reasons in a popover) · `old` (amber); see [Staleness](#staleness).

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
    href: docs:Eastern Sun Resurrected Cube Recipes.html#for
sources: [official-cube, esru-wiki] # ids from _sources.yml, validated
---
```

The anchors of the official cube page are short: `special`, `uber`, `legendary`, `mis`, `gem`, `rel`, `mat`, `for`,
`dst`, `tin`, `soc`, `sec`. In frontmatter (`officialDocs`) a `docs:` href may contain spaces.

### Body syntax

Markdown (GFM tables and lists) with these additions. Anything else that is not plain markdown (raw HTML, images,
`#`/`##` headings) is a build error.

| Syntax                                                                              | Meaning                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[[slug]]`, `[[slug\|label]]`                                                       | Link to another note. Validated; a missing slug fails the build.                                                                                                                                                                                |
| `[label](rw:Enigma)`                                                                | App link to the runewords page focused on that runeword (`/?name=Enigma`: exact name, all its variants). Validated against the runewords bundle.                                                                                                |
| `[label](gw:Name)`, `(unique:Name)`, `(mythical:Name)`, `(socketable:Name)`         | App links to the gemwords / uniques / mythicals / socketables pages focused on that name (`?name=Name`). Not validated.                                                                                                                         |
| `[label](base:crs)`, `(type:swor)`                                                  | App links to Game Data bases (by base code → `?search="<name>"`) / item types (`?type=code`). Validated against the bundles.                                                                                                                    |
| `[label](bestbase:Enigma)`, `(affixes:base=7cr&ilvl=85)`, `(page:/game-data/bases)` | App links to Best Base, Affixes, or any raw app path.                                                                                                                                                                                           |
| `[label](docs:gems.htm#anchor)`                                                     | Link to the official docs (`https://easternsunresurrected.com/<file>#<anchor>`). When the ESR clone is present the file and anchor are checked offline (warning when missing).                                                                  |
| `[label](https://…)`                                                                | External link.                                                                                                                                                                                                                                  |
| `:term[Stocker]`, `:term[Stocker]{label=stockers}`                                  | Glossary hover; the term must exist in `_glossary.yml`. Renders the label (default: the term).                                                                                                                                                  |
| `::source[Annihilus]`, `::source[Worldstone Shard]{item=misc}`                      | **Where it comes from** block for an item (unique, set or misc name) from `public/game-data/sources.json`. Unknown name fails the build; a name shared by several item kinds fails with "ambiguous" until `{item=unique\|set\|misc}` picks one. |
| `::secret-recipes`, `::secret-recipe[50]`                                           | Secret recipe rows (`[SECRETnn]` rows of cubemain.txt), all or one.                                                                                                                                                                             |
| `::recipe-output[Adventurer's Pack]`                                                | The outputs of the cubemain rows whose description equals the argument (used for the Starter's Pack contents).                                                                                                                                  |
| `::vendor[Gheed]`                                                                   | Items that NPC sells (vendor columns of misc/armor/weapons).                                                                                                                                                                                    |
| `::difficulty-penalties`                                                            | Resistance and other penalties per difficulty (difficultylevels.txt).                                                                                                                                                                           |
| `::glossary`                                                                        | All glossary entries.                                                                                                                                                                                                                           |

Link targets with spaces must be wrapped in angle brackets or use `%20`: `[x](<rw:Breath of the Dying>)`,
`[x](<docs:Eastern Sun Resurrected Cube Recipes.html#sec>)`. A link the parser leaves as text (`](rw:…` or `[[`
remaining in the output) is a build error, as is formatting inside a `[[slug|label]]` label. In table cells
`[[slug|label]]` works as is (the generator escapes the pipe). `page:` only accepts the app's routes (`/`,
`/gemwords`, `/socketables`, `/uniques`, `/mythicals`, `/ascendancies`, `/game-data/{bases,best-base,affixes,types}`,
`/guide`; a query string is allowed).

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
`npm run game-data:update` also regenerates and checks the guide. Flags: `--esr <dir>` (ESR clone), `--content <dir>`
(default `content/guide`), `--sources <file>` (default `public/game-data/sources.json`), `--out <dir>` (default
`public/guide`); the last three let you try the pipeline on scratch content, a draft sources bundle or a scratch output
folder. Sub-commands `verify` and `report`: see [Staleness](#staleness).

Build errors (exit 1): invalid frontmatter, unknown `[[slug]]`, `knowFirst`/`related`/`next`/`sources` ids, unknown
`rw:`/`base:`/`type:` targets, unknown `:term`, unresolvable directive arguments, unsupported markdown nodes, a note
that is neither on the spine nor linked from anywhere, a note whose `knowFirst`/`related`/`next` names itself, links
left as text, `page:` targets that are not app routes, an ambiguous `::source` name. Warnings (manifest `warnings`): body above 400 words, `mentions`
not found in game data, `docs:` file/anchor not found, ESR clone missing (directives cannot resolve → error), a
verified note without a matching `.verify-lock.json` entry. An unreadable `.verify-lock.json` is an error.

Code layout:

```
src/features/guide/
  engine/schema.ts            bundle types (GUIDE_SCHEMA, GuideBundle, GuideNote, GuideBlock, DataBlock …)
  engine/freshness.ts         noteFreshness(), compareVersions()
  engine/browser/loadGuide.ts browser loader (promise cache, schema check)
  build/                      generator-only code (excluded from the app tsconfig, included in tsconfig.scripts)
  build/staleness.ts          block hashes, lock file, patch-note scan, staleReasons, verify edit, report
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
`words`, and `staleReasons` (see Staleness). Links in the body are already resolved: `{ type: 'link', kind: 'note' | 'app' | 'external', href }` where
`href` is a slug, an app path (without the base URL) or an absolute URL.

## Staleness

A patch should not flag every note, so a note that was verified on an older patch only turns amber when the build
finds a concrete reason.

| State    | When                                                             | Badge                                                          |
| -------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `draft`  | no `verified`                                                    | dashed, "Draft – not yet verified in-game"                     |
| `old`    | `verified` major.minor differs from the current ESR version      | amber, "Written for ESR x; may be out of date for y"           |
| `review` | `verified` is an older patch **and** `staleReasons` is non-empty | amber, "Checked on ESR x · needs review", reasons in a popover |
| `fresh`  | otherwise (equal, newer, or an older patch with nothing flagged) | subtle, "Checked on ESR x"                                     |

`staleReasons` (computed by the build, capped at 5 plus "… and N more", always empty for drafts):

- **Changed data blocks.** `content/guide/.verify-lock.json` records, per slug, the version `guide:verify` stamped and
  a sha256 of each resolved data block (`JSON.stringify` of the `DataBlock`), keyed by its directive source in note
  order: `source:Worldstone Shard{item=misc}`, `vendor:Gheed`, `secret-recipes`, a repeated directive gets `#2`, `#3`.
  A block whose hash differs, or that was added or removed, gives "Data in '<caption>' changed since <verified>".
- **Not recorded.** A verified note with no lock entry, or one recorded for another version (someone edited
  `verified:` by hand), gives "Not recorded by guide:verify" and a build warning.
- **Patch notes.** Every `<esr>/patchnotes/<version>.md` newer than `verified` is searched case-insensitively,
  whole-word (not glued to a letter or digit), for the note's title, aliases, `mentions` and the glossary terms it owns:
  "Patch notes 3.2.11 mention 'Stocker'". No fuzzy matching; plurals do not match.

Commands (`scripts/generate-guide.ts` sub-commands; `--esr`/`--content` apply):

```bash
npm run guide:verify -- forging stockers  # verified: '<game-data manifest esrVersion>' + lock entries; then guide:generate
npm run guide:report                      # notes by state with reasons, volatility: high notes, drafts; writes nothing
```

`guide:verify` edits only the `verified:` line of the frontmatter (or adds it before the closing `---`); every other
byte of the note stays as written. It refuses to run while the guide has build errors. `npm run game-data:update` prints
the report after regenerating the guide.

Maintainer checklist after `game-data:update`:

1. Read the "Guide freshness" report it printed (or run `npm run guide:report`).
2. For each **review** note: check the reasons in-game (and the note text), fix the text if needed, then
   `npm run guide:verify -- <slug>`. Do the same for **old** notes after a major.minor update.
3. Re-check the `volatility: high` notes even when nothing flagged them.
4. `npm run guide:generate`, then commit `content/guide` and `public/guide` together.

## Where it comes from (`sources.json`)

Generated by the **game-data** pipeline (`src/features/game-data/build/bundleSources.ts`) into
`public/game-data/sources.json`, so it refreshes with every `game-data:update`. Qualitative labels only, several per
item, in this order: `cube` ("Cube: Ancient Coupon" / "Cube: <family>" / "Cube"), `boss` ("Drops from <monster>"),
`maps` ("Drops in Endgame Maps"), `drop` ("Drops (random)"), `buy` ("Buy: <NPC>"), `gamble` ("Gamble"), `plugin`
("Boss drop (launcher plugin)"), `unknown`. The UI shows "Derived from the game files; may be incomplete." The guide
consumes it through `::source[...]`; phase 2 adds a Source line to the item cards.

## Tests

Logic only (no component tests): frontmatter validation, markdown → GuideBlock conversion, link resolution, backlinks
and next computation, directive resolvers against a trimmed excel fixture, freshness states, lock-file hashing and comparison,
staleReasons generation, patch-note scan, the byte-preserving `verified:` edit, the report, bundle
integrity (manifest schema and sha256 of the committed files always; regenerating from `content/` in memory and
comparing is skipped when the ESR clone or sources.json is missing), source-label rules on the verified examples (Pelta Lunata, Krok's Basher, Mephisto's Will, Frostmourne,
Annihilus, Hellfire Torch, Kill Ledger, Orb of Anointment, Forging Hammer).

## Attribution

Notes list `sources` ids; the screen renders "Sources: …" from `_sources.yml`. The old unofficial wiki (CC BY-SA 3.0)
is consulted for facts only; no text or images are copied. The official site is linked, never mirrored.
