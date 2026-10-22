# Backend, auth and removed features: d2r.dpdns.org vs this repo

**In short.** The fork runs its own Supabase project (`zbwhqioeoacnsnrbnipd`). The client queries the same five
relations and the same columns as our `supabase/migrations/001–004`, so it almost certainly applied our schema
(inferred). There are no RPCs, no realtime and no storage. Sign-in is email magic link only in the UI; the Discord
code is still shipped but nothing calls it. The consent step, the privacy-policy link and the account-deletion link
all still point at **our** GitHub repo, so fork users accept a policy that describes our project, our contact and
our EU region. Several of our features were removed in the UI but left running underneath: the favourites saga,
Dexie tables, the `/socketables` nav entry, and the settings, search-help and copy-link strings. The fork's code
lines up with our tree from just before 2026-10-05 (inferred, see §6).

Sibling docs: [04-builds-and-item-editor.md](04-builds-and-item-editor.md) (what the fork's `build_data` holds),
[05-data-pipeline-and-i18n.md](05-data-pipeline-and-i18n.md) (Dexie and localStorage in context).

---

## 1. Supabase usage

**Fork.**
- The project URL and publishable key are hard-coded constants (`https://zbwhqioeoacnsnrbnipd.supabase.co`,
  `sb_publishable_…`, bundle L17029–L17030).
- The SDK lives in the lazy chunk `client-_q2PbZ-G.js`. The three saga chunks `authSaga`, `buildsSaga` and
  `favoritesSaga` are imported at startup (L17582–L17626). All table access is in those chunks; the main bundle has none.

Tables and columns, inferred from `chunks/*.pretty.js`:

| Relation | Columns the client touches | Operations (chunk) |
|---|---|---|
| `profiles` | `*` (used fields: `id, display_name, discriminator, avatar_url, privacy_policy_accepted_at, created_at`) | select by `id` with `maybeSingle`, retried 3× at 400 ms while the row is missing (authSaga `W`); update `display_name + privacy_policy_accepted_at` at consent (`X`); update `display_name + discriminator` with a retry on `23505`, up to 10 times (`z`); select by id for the user page (buildsSaga `xe`) |
| `builds` | `*` + join `profiles!builds_user_id_fkey(display_name, discriminator, avatar_url)`; insert `user_id, name, description, class, build_data, esr_version`; update `name, description, class, build_data, esr_version_updated` | list with `ilike('name', %q%)`, `eq('class')`, `eq('user_id')` ("My Builds"), order `likes_count desc` (most liked) then `created_at desc, id desc`, keyset `.or(...)` cursor, `limit(50)` (`M`, `P`); get one by UUID (`Te`); insert (`Me`); update (`Ue`); delete (`Oe`); per-user list (`U`) |
| `likes` | `build_id, user_id` | select own likes `in(build_id, page ids)` (`L`); select one (`Te`); insert or delete toggle (`De`) |
| `favorites` | `user_id, item_id` | select own (`w`); `upsert(onConflict: "user_id,item_id", ignoreDuplicates)` for migration (`N`); insert/delete toggle (`x`, no UI) |
| `favorite_counts` | `item_id, count` | public select of the whole relation at startup (`p`) |

- **RPC, realtime, storage:** none. `.channel(` hits are redux-saga `eventChannel`. No `.rpc(` and no `.storage`.
- **Server side:** not visible. These things are implied but not observable:
  - a profile-creation trigger (the 3× retry);
  - a `likes_count` trigger (the client never writes it);
  - unique `(display_name, discriminator)` (the `23505` handling).
- `esr_version` comes from the hosted `/EasternSun/modinfo.json` ("3.12.11"), not from the user's game (see 05 §5).
  The "Created on a different ESR version than yours" hint therefore compares against the site's mod copy.
- `buildsSaga` keeps our snapshot refresh on update (`Ie` → `Ee`). It looks up `htmUniqueItems`, `mythicalUniques`,
  `runewords` and `gemwords` in Dexie. The fork never fills those tables, so every lookup misses and the old snapshot
  is saved again unchanged.

**Ours.**
- Schema in `supabase/migrations/`:
  - `001_initial_schema.sql`: `profiles`, `builds`, `likes`, triggers `handle_new_user` and `handle_likes_change`,
    `moddatetime` on `updated_at`, RLS "viewable by everyone" plus own-row insert/update/delete;
  - `002_favorites.sql`: `favorites`, a `favorite_counts` **table** maintained by the `handle_favorites_change` trigger, RLS;
  - `003_harden_write_access.sql`: column-scoped `grant insert/update` on `builds` and `profiles`;
  - `004_handle_new_user_discriminator_retry.sql`: a discriminator retry loop in the trigger.
- Client in `src/core/supabase/` (`config.ts` reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, `client.ts`
  lazy). Without the env vars, builds and favourites switch off and the rest of the app works.

**Difference / takeaway.**

| Point | Fork | Ours |
|---|---|---|
| Relations used | profiles, builds, likes, favorites, favorite_counts | same |
| Column sets in inserts/updates | identical to our 003 grants | defined by 003 |
| Config | hard-coded URL/key | env vars, optional backend |
| `build_data` | same `jsonb` column, richer payload (paperdoll, charms grid, skill allocations, corrupt/forge/dcraft notes; see 04) | `BuildData` in `src/features/builds/buildData.ts` |
| Snapshot refresh on edit | silently a no-op | live (HTM data in Dexie; "Stats updated" diff) |
| Version stamp | hosted mod copy (3.12.11) | HTM docs version from Dexie `metadata.esrVersion` |

The fork needed no schema change for its bigger build model, because everything new lives in `build_data` (inferred).
Builds on the two sites are in separate databases and cannot see each other.

---

## 2. Auth

**Fork.**
- Sign-in dialog (`R5e`, L56273; `screens/12-signin.png`): "Sign in to create, like, and share builds.", Email,
  "Send magic link", then "Check your email". It calls `signInWithOtp({email, options:{emailRedirectTo: current URL}})`.
  The return path is kept in `sessionStorage["d2r-auth-return-to"]`.
- **Discord is unreachable.** The slice action `discordSignInRequested` (L17083) and the saga handler
  `signInWithOAuth({provider:"discord"})` (authSaga `H`) still exist. No component dispatches the action, and
  `auth.discord` / `auth.or` are unused keys. Whether the Discord provider is configured in their project is unknown.
- First-sign-in consent (`T5e`, L56369): "Welcome — one quick step", display name (max 50), and a checkbox
  "I have read and accept the Privacy Policy". The checkbox links to
  `github.com/istvan-panczel/d2r-esr-runeword-browser/blob/master/PRIVACY_POLICY.md` (`D5e`, L56368). The consent
  update is a **single** `profiles.update` with no tag-collision retry (authSaga `X`).
- Edit profile (`OHe`, L68714): name change with a new random tag (retries on `23505`). "Delete account" says
  "Automatic account deletion isn't available yet." and offers "Open a deletion request on GitHub", which links to
  **our** issue tracker (`GHe`, L68713: `…/d2r-esr-runeword-browser/issues/new?title=Account%20deletion%20request`).
- Credits in settings still name "Original Author: István Pánczél" and link our repo (`screens/10-settings.png`).

**Ours.**
- `src/features/auth/components/SignInDialog.tsx` offers Discord OAuth (button) and email magic link.
- `ConsentGate.tsx` is a non-dismissible full-page gate that links the same `PRIVACY_POLICY.md`.
- `authSaga.ts` `updateProfileName(…, keepDiscriminatorFirst)` retries tag collisions at consent too. This fix
  landed on 2026-10-05 (`be9f540`) and the fork does not have it.
- `ProfileEditDialog.tsx` has the same GitHub-issue deletion link.
- `PRIVACY_POLICY.md` names the owner (Hungary, EU), a contact email, Supabase **West EU (Ireland)** as processor,
  Discord as an optional provider, and manual deletion on request.

**Difference / takeaway.** The fork narrowed auth to email only, which suits players without Discord, such as many
QQ users. The cost is that its users never see an avatar (`avatar_url` comes from OAuth metadata in our
`handle_new_user`; inferred). Our consent flow is the more robust one.

---

## 3. What a user should know (privacy / security, plain level)

- **Exposed key is normal.** The `sb_publishable_…` key in the bundle is designed to be public. Security depends on
  row-level security in the fork's project, which cannot be seen from outside. If the fork applied our migrations,
  which the matching relation names, the join hint `profiles!builds_user_id_fkey` and the column sets suggest, the
  same RLS and column grants apply (inferred, unverified).
- **The policy they accept is ours, not theirs.** Fork users tick "I have read and accept the Privacy Policy" and
  land on a document that:
  - names our owner as the person responsible, with our contact address;
  - says data is stored in Supabase `eu-west-1`.

  Their data actually sits in a different Supabase project whose owner and region are not stated anywhere on the
  site. Account-deletion requests are routed to our GitHub issues, where we cannot act on the fork's database.
- **Everything is public by design:** display names, tags, builds, likes and favourite counts are publicly
  readable, as in ours. No email is stored in `profiles`. Magic-link emails are sent by the fork's Supabase project.
- **No analytics seen** in the fork's HTML or bundle (Cloudflare edge injection cannot be ruled out). Ours ships
  the Cloudflare Web Analytics beacon and discloses it.
- **Session storage:** supabase-js keeps the session in localStorage under the project ref (inferred; default SDK
  behaviour). Signing in on one site has no effect on the other, because origins and projects differ.

**Takeaway for us.**
- Add a sentence to `PRIVACY_POLICY.md` saying it covers only the deployment at istvan-panczel.github.io and its
  Supabase project, and that forks are responsible for their own.
- Expect stray deletion issues from fork users, and answer them by pointing to the fork.

Both are doc-only changes; no code is needed.

---

## 4. Removed or leftover (in the fork)

| # | What | State in the fork | Evidence | Ours |
|---|---|---|---|---|
| 1 | Favourites UI | **Gone** (no star, no "favourites only" toggle). The slice still has `toggleFavoriteRequested` (L17459), but it is only exported to the saga chunk (L75155) and no component dispatches it | `favoritesSaga` `x`; keys `favorites.only`, `gemwords.noFavorites` unused | `FavoriteButton`, `FavoritesToggleButton`, public counts |
| 2 | Favourites saga | **Still runs.** At startup it selects all of `favorite_counts` (one public request per page load); on sign-in it selects `favorites`, upserts legacy localStorage ids (`d2r-esr.runewords.favoriteRecipes.v1`, `…gemwords…`, `d2r-esr.htmUniqueItems.favorites.v1`), deletes those and the `showFavoriteRecipesOnly` keys, and sets `d2r-esr.favorites.migratedToCloud.v1`. Errors are swallowed | `chunks/favoritesSaga-DG7ve1qL.pretty.js` | same code in `src/features/favorites/` (shared origin) |
| 3 | URL query state / share links | **Gone.** No page reads `useSearchParams` or `URLSearchParams` (the only hits are react-router internals, L12447–L12497); every filter is local `useState`; no `?name=` focus; the only "copy link" copies `location.href` on a build | grep; `copy.help.*` unused | `src/core/utils/filterUrlParams.ts`, `CopyLinkButton`, `?name=` |
| 4 | Data refresh and version info in settings | **Gone** ("Force Refresh Data", App/ESR version, last updated) | `settings.data.*`, `settings.info.*` unused; `screens/10-settings.png` | `SettingsDrawer.tsx` |
| 5 | Search-help popovers | **Gone** | `search.help.*` (13 keys) unused | socket-range help, search help |
| 6 | Dexie tables | **Declared, never filled.** `version(13)` keeps all 12 tables; only `metadata.esrVersion` is written; `buildsSaga` still reads four of them (no-op refresh, §1) | L68680–L68708; `buildsSaga` `Ae/Ce/Ee` | v14, all used |
| 7 | `/socketables` | **Dead nav item.** "Gems/Crystals" is listed under Guides (L55467) but missing from the route allowlist `Zu` (L55564–L55586), so it renders `href="#"` with `preventDefault` (L55703–L55711); no route exists | `screens/66-gems-crystals-link.png` | `/socketables` page |
| 8 | Discord sign-in | **Unreachable** (code present) | authSaga `H`, L17083 | visible button |
| 9 | Old build picker | **Replaced** by the item editor; `builds.picker.*` (11) and `builds.itemSearch.*` (15) keys unused | `analysis/key-usage.tsv` | cmdk slot picker |
| 10 | i18n for saga toasts | English hard-coded ("Build created.", "Could not update your favourite…") in otherwise translated UI | `buildsSaga`, `favoritesSaga` | English everywhere |

Notes on the favourites leftovers:
- localStorage is per origin, and the fork runs on `d2r.dpdns.org`. The legacy keys only exist there if an earlier
  fork build wrote them, so for most users the migration is a no-op (inferred).
- If the fork's project never got `002_favorites.sql`, the startup `favorite_counts` query fails silently on every
  page load (unknown which).

**Never present** (our features that postdate the fork point, not removals): the Guide (`/guide`, shipped
2026-10-10), Game Data pages, the loot-filter editor, "Source:" lines from `sources.json`, the Warlock class
(2026-10-06). The bundle has no reference to `game-data`, `sources.json`, `loot-filter` or `/guide`.

---

## 5. Comparison of the auth / consent flow

| Step | Fork | Ours |
|---|---|---|
| Providers in UI | Email magic link | Discord OAuth + email magic link |
| Redirect after sign-in | current URL; return path in sessionStorage | same (`utils/redirect.ts`) |
| Profile row | created server-side (inferred from the retry) | `handle_new_user` trigger (001/004), name from OAuth metadata or "Adventurer" |
| Consent gate | display name + policy checkbox; one update, no collision retry | same fields; retries with a fresh tag on collision |
| Policy link | our GitHub `PRIVACY_POLICY.md` | same file, which describes our deployment |
| Name change | new random tag, ≤10 tries | same |
| Account deletion | "not available yet", GitHub issue on **our** repo | same text, our repo (correct for us) |
| Avatar | `avatar_url` shown if present (none with email-only, inferred) | Discord avatar |

---

## 6. Dating the fork point (inferred)

Taken together, these place the fork's base at our master from **before 2026-10-05**, while already including
Supabase favourites (2026-06-09, `64e5f4c`):
- Dexie at `version(13)` with an `affixes` table (we dropped it in v14 on 2026-10-05, `65f00ba`);
- no tag-collision retry at consent (`be9f540`, 2026-10-05);
- no Warlock class (`f23aed7`, 2026-10-06).

---

## Corrections to `analysis/site-bundle-inventory.md`

- §1 Method says the 238 unused keys are "never referenced by the main bundle or the saga chunks". In fact the
  scan (`usage.js`) only read the main bundle: `authSaga` uses 15 of them (`n("auth.error.loadProfile")`,
  `n("auth.toast.welcome")`, …), and 12 more are built dynamically. That leaves about 211 truly unused keys (see 05).
  The §2.11 remark about hard-coded English toasts is right for `buildsSaga` and `favoritesSaga`; `authSaga` is translated.
- §4 says the profile select "retries 3× at 400 ms"; that is correct. The consent update does **not** retry on
  `23505`, which the inventory does not mention (only the name-change path retries).
- §4 calls `favorite_counts` "public select (view)". In our schema it is a trigger-maintained **table**
  (`002_favorites.sql`). The fork's version is unknown.
- §2.16 implies the localStorage migration is meaningful. On the fork's origin it can only find keys written by the
  fork itself (see the notes under §4).

## Open questions

1. Did the fork apply all four of our migrations, especially 003's column grants and 004's trigger fix?
2. Is the Discord provider configured in their project (so that the hidden code would work if re-enabled)?
3. Who controls the fork's Supabase project, and in which region? (The site does not say.)
4. Does `favorite_counts` exist there, or does the startup query fail every time?
5. Has anyone filed an account-deletion issue on our repo that actually concerns the fork?
