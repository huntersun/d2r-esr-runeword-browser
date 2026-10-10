---
name: esr-update
description: Update the app to a new Eastern Sun Resurrected (ESR) release end to end — regenerate game data, read the release diff and patch notes, review the bundles, propose guide note edits, ask the owner, optionally commit. Use when the owner says "ESR released a new version", "update the game data", "bump ESR", "new ESR patch" or runs /esr-update.
---

# ESR release update

You perform the whole update after an ESR mod release, review every change, and ask the owner at the decision points.
Arguments: an optional ESR version/tag (e.g. `/esr-update 3.2.13`). Work from the repo root. The ESR clone lives at
`../Eastern_Sun_Resurrected` unless `ESR_SOURCE_DIR` or `--esr <dir>` says otherwise.

Background docs (read only what you need): `docs/features/GAME-DATA.md` (Regenerating), `docs/features/GUIDE.md`
(Body syntax, Staleness), `scripts/update-game-data.ts`.

## 0. Preconditions

1. `git status --porcelain`: if anything is listed, stop and ask the owner (stash, commit, or abort). Never discard it.
2. `git branch --show-current`: if `master`, offer to create `chore/esr-<version>` (use the requested version, or
   `next` until you know it) and switch to it after approval.
3. Note the current version: `esrVersion`, `esrTag`, `esrCommit` from `public/game-data/manifest.json`. Keep a copy of its
   `counts` and `warnings` for the comparison in step 3 (`git show HEAD:public/game-data/manifest.json` also works later).

## 1. Regenerate

Run `npm run game-data:update` (add `-- --tag <tag>` when the owner named a version; tags have no `v` prefix). It
clones/pulls ESR, generates `public/game-data`, fetches the test fixtures, runs `vitest src/features/game-data`,
`game-data --check`, `guide:generate`, `guide:check`, prints the guide freshness report and a summary. It never commits.

Exit code 1 means a step failed (the summary lists each step's result). Stop, show the failing step and its output,
diagnose with the list under "When things go wrong", and ask the owner before changing anything. A fixture download
failure is only a warning.

Keep the printed summary (version/tag/commit before → after, count deltas, warnings, changed files) and the
"Guide freshness" report.

## 2. Read the release diff

Run `npm run esr:diff` (`node scripts/esr-release-diff.ts`; `-- --json` for machine-readable output, `-- --from <rev>
--to <rev>` to override the range). It compares the revision our committed manifest was built from with the clone's
HEAD and lists: new/changed patch notes (full text), new changelog-page entries, changed game tables with added/removed
row keys, changed strings, changed official docs pages (hand-written vs generated), launcher configs, other files.

Read all of it. Patch notes and changelog entries are the primary source of what changed for players; tables, strings
and docs are the secondary source that confirms or adds detail. Write a plain-language summary grouped as:

- new systems, items, recipes;
- removed things;
- renamed things (old → new name; these break guide directives and links);
- balance changes relevant to the app's data (runewords, affixes, bases, socket caps, cube recipes, vendors, drops).

If a patch note is ambiguous or contradicts the tables, say so; do not resolve it by guessing.

## 3. Review the regenerated data

1. `git diff --stat public/game-data public/guide`.
2. Compare the summary's count deltas and warnings with the old manifest. A new warning is a red flag: explain it or
   investigate before continuing.
3. Spot-check the changed bundles. Each array element is one JSON line, so changed entries are the `+`/`-` lines of
   `git diff -U0`. List them by name, e.g.:
   `git diff -U0 public/game-data/runewords.json | node -e "require('fs').readFileSync(0,'utf8').split('\n').filter(l=>/^[+-] {2,}\{/.test(l)).forEach(l=>{const o=JSON.parse(l.slice(1).trim().replace(/,$/,''));console.log(l[0],o.name??o.key)})"`
   (same for `affixes.json`, `bases.json`, `sources.json`). Check `counts.sourcesUnknown` and list the `unknown`
   sources: `node -e "const s=require('./public/game-data/sources.json');console.log(s.items.filter(i=>i.labels.some(l=>l.kind==='unknown')).map(i=>i.name))"`.
4. Explain every count change with the release diff (e.g. "+2 runewords: patch note adds X and Y", "+14 affixes:
   magicsuffix.txt rows added"). Anything you cannot explain → investigate (table diff, generator warnings) before
   moving on, and report it.

## 4. Guide

1. Read `npm run guide:report` (draft / fresh / review / old, stale reasons, `volatility: high` notes).
2. For each `review` or `old` note: read its stale reasons and the note (`content/guide/notes/<slug>.md`).
3. For each patch-note item, find the notes and glossary terms it touches:
   `grep -rn -i '<term>' content/guide` (notes, `_glossary.yml`, `spine.yml`, `_sources.yml`).
4. Draft concrete edits (do not apply yet unless they fix a build error): text changes, new or changed glossary terms
   in `_glossary.yml`, a new `kind: link` stub when a new system appeared (draft: no `verified:`). Rules:
   - keep a note body ≤ ~250 words (the build warns above 400);
   - never type a number a directive can provide (`::recipes`, `::source`, `::vendor`, `::secret-recipes`,
     `::difficulty-penalties`, `::card`, …); link to the data instead;
   - leave `verified:` and `content/guide/.verify-lock.json` untouched — only the owner verifies in-game;
   - every fact must come from the release diff, the game files or an existing source; no invention.
5. Build errors from step 1 (renamed or removed items, dead directive arguments, unknown `::recipes` family, dead
   `docs:` anchors) must be fixed in `content/guide`, never by loosening the generator. Show the owner each fix.
6. After any content edit: `npm run guide:generate` and `npm run guide:check`; both must pass. Run
   `npx prettier --write` on the touched content files.

## 5. Ask the owner

One `AskUserQuestion` call, at most 4 questions:

1. **Data update**: "Accept ESR <old> → <new>?" with the count deltas and any warnings in the question text.
2. **Note edits** (multi-select): one option per proposed edit ("<slug>: <one-line change>", "glossary: add <term>",
   "new stub: <slug>"). Skip if there are none.
3. **Commit**: "Commit now" vs "Leave uncommitted". Commits:
   - `chore(game-data): update to ESR <version>` with `public/game-data` (includes the manifest) and `public/guide`
     when only regenerated data changed there (test fixtures are gitignored);
   - `docs(guide): <what changed> for ESR <version>` with `content/guide` + `public/guide` when notes changed.
4. **Follow-ups** (multi-select): e.g. "new system X has no note yet", "note Y needs a rewrite", "unexplained count
   change Z". Skip if none.

Apply the chosen edits, re-run `guide:generate` + `guide:check`, then commit only if question 3 said so. Follow the repo's
commit attribution rules; pre-commit hooks run Prettier/ESLint. Never push.

## 6. Final report

- ESR version/tag/commit before → after.
- What changed for players (the step 2 summary, short).
- What changed in the bundles: files, count deltas with their explanation, warnings.
- Guide: notes edited, build errors fixed, glossary/stub additions.
- Still needing in-game verification by the owner: the `draft`, `review` and `old` lists from a fresh
  `npm run guide:report`, plus `volatility: high` notes. The owner runs `npm run guide:verify -- <slug>` after checking.
- Committed or not (hashes), and everything deferred or unexplained.

## When things go wrong

- **ESR clone dirty / on another branch**: the update aborts. Show `git -C <clone> status`; ask before cleaning or
  checking out `main`. Never reset the clone without approval.
- **Tag not found**: confirm the tag name with the owner (`git ls-remote --tags <ESR remote>`; no `v` prefix); fall back
  to `main` only if they agree.
- **Release diff shows nothing / missing files**: the manifest commit may be absent from a shallow clone or a path may
  be outside the sparse checkout; report it and ask (deepen the fetch or `sparse-checkout add`), do not guess.
- **New generation warnings** (string conflicts, duplicate bases, unresolved stats): find the rows in the table diff,
  explain them; if they look like a parser gap, report it as a follow-up instead of patching code silently.
- **Integrity test fails** (`src/features/game-data/bundleIntegrity.test.ts` expects fixed counts such as 369 weapons /
  255 armors): if the release diff explains the new count, propose updating the expected numbers (and the counts in
  `docs/features/GAME-DATA.md`); otherwise investigate.
- **Other game-data tests fail** (name oracle, runeword matching): compare with the HTM fixtures; a renamed item in the
  docs vs the tables is a data mismatch to report, not to hide.
- **`game-data --check` / `guide:check` fails**: output is non-deterministic or stale; re-run the generator once and
  report if it persists.
- **Guide build errors**: unknown `rw:`/`unique:`/`socketable:`/`base:` target or `::source` name → use the new name
  from the strings diff (add `{item=…}` when it became ambiguous); unknown `::recipes` family → the cubemain
  `description` changed, report it (the family list lives in code); dead `docs:` anchor → find the new anchor in the
  changed docs page; unknown `:term` → add the term to `_glossary.yml` or fix the spelling.

## Do not

- Run `npm run guide:verify` or edit `verified:` / `.verify-lock.json`.
- Commit or push without the owner's approval; never push at all.
- Type numbers into notes that a directive or data link can provide.
- Edit `public/game-data/*.json` or `public/guide/*.json` by hand; only the generators write them.
- Invent facts. If a patch note is ambiguous, say so and ask.
- Change generator or app code as part of this procedure without asking; propose it as a follow-up.
