# D2R ESR Runeword Browser - Documentation

This folder contains all project documentation for the D2R ESR Runeword Browser.

## Documentation Structure

### [Features](./features/)

Feature descriptions, user stories, and task breakdowns.

### [Technical](./technical/)

Architecture decisions, coding guidelines, tech stack documentation, and implementation details.

## Quick Links

- [Contributing & Documentation Process](./CONTRIBUTING.md) - How to continue documentation sessions

### Feature Documentation

- [Core Data](./features/CORE-DATA.md) - HTM parsing, app startup flow, data refresh strategy
- [Runewords](./features/RUNEWORDS.md) - Browse and filter runewords (primary feature, home page)
- [Socketables](./features/SOCKETABLES.md) - Unified view of all socketables (gems, runes, crystals) with filters
- [Unique Items](./features/UNIQUE-ITEMS.md) - Browse and filter unique items parsed from HTM pages
- [Game Data](./features/GAME-DATA.md) - Static bundles built from the ESR txt game files (Bases, Item Types, Best Base and Affixes pages)
- [Guide](./features/GUIDE.md) - New-player guide: markdown notes compiled into a static bundle, journey spine, data directives, staleness tracking

### Technical Documentation

- [Tech Stack](./technical/TECH-STACK.md) - Libraries, frameworks, and tools
- [Architecture](./technical/ARCHITECTURE.md) - Project structure and data flow
- [Navigation](./technical/NAVIGATION.md) - Routing, app shell layout, settings drawer
- [UI Components](./technical/UI-COMPONENTS.md) - Component patterns and theming
- [Coding Guidelines](./technical/CODING-GUIDELINES.md) - Conventions and standards
- [Data Models](./technical/DATA-MODELS.md) - IndexedDB schema and TypeScript types
- [Sagas](./technical/SAGAS.md) - Redux Saga patterns and architecture
- [Testing](./technical/TESTING.md) - Testing infrastructure and patterns

---

## Data System

The app uses a single HTM-based data system. All data is fetched from the ESR documentation site (`easternsunresurrected.com`), parsed with the native `DOMParser` API, and stored in a single IndexedDB database (`d2r-esr-runeword-browser`).

### Data Sources

| Data                                | Source                 |
| ----------------------------------- | ---------------------- |
| Socketables (gems, runes, crystals) | `gems.htm`             |
| Runewords                           | `runewords.htm`        |
| Gemwords                            | `gemwords.htm`         |
| Unique Weapons                      | `unique_weapons.htm`   |
| Unique Armors                       | `unique_armors.htm`    |
| Unique Others                       | `unique_others.htm`    |
| Mythical Uniques                    | `unique_mythicals.htm` |
| Ascendancies                        | `ascendancies.htm`     |
| Version info                        | `changelogs.html`      |

### Features

| Feature               | Route                                                                                 | Description                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runewords             | `/`                                                                                   | ~386 runewords with filters for runes, sockets, item types, tier points, req level                                                                                                                                                    |
| Guide                 | `/guide`, `/guide/:slug`                                                              | New-player guide: small linked notes on a journey spine, note search, freshness badges, data blocks generated from the game files; renders before the HTM data sync finishes ([GUIDE.md](./features/GUIDE.md), `src/features/guide/`) |
| Gemwords              | `/gemwords`                                                                           | ~590 gem-based socket recipes with filters for gems, sockets, item types, req level                                                                                                                                                   |
| Socketables           | `/socketables`                                                                        | ~177 socketable items across 5 categories                                                                                                                                                                                             |
| Unique Items          | `/uniques`                                                                            | Unique weapons, armors, and other items with category filters                                                                                                                                                                         |
| Mythicals             | `/mythicals`                                                                          | Mythical unique items (`src/features/mythical-uniques/`)                                                                                                                                                                              |
| Ascendancies          | `/ascendancies`                                                                       | Ascendancies with their tier bonuses (`src/features/ascendancies/`)                                                                                                                                                                   |
| Game Data: Bases      | `/game-data/bases` (`/game-data` redirects here)                                      | Base items from the ESR txt game files: search, kind/tier/type/sockets/level/class filters, sorting, socket caps per ilvl band (`src/features/game-data/`)                                                                            |
| Game Data: Best Base  | `/game-data/best-base`                                                                | Best base finder for a runeword and a persisted character (class/level/Str/Dex), ranked per item type; `?rw=&v=` from the runeword cards, `cls`/`lvl`/`str`/`dex` override the character                                              |
| Game Data: Affixes    | `/game-data/affixes`                                                                  | Affix browser + "what can roll" on a base (`?base=<code>&ilvl=<n>`)                                                                                                                                                                   |
| Game Data: Item Types | `/game-data/types`                                                                    | Item type (Equiv) tree with socket caps; `?type=<code>` focuses a node                                                                                                                                                                |
| Builds                | `/builds`, `/builds/new`, `/builds/:buildId/edit`, `/build/:buildId`, `/user/:userId` | Shared builds; needs the optional Supabase backend (`src/features/builds/`, `src/features/auth/`)                                                                                                                                     |
| Not found             | `*`                                                                                   | Catch-all 404 screen                                                                                                                                                                                                                  |

Favourites for runewords, gemwords, and unique items (sign-in required, synced to Supabase) live in `src/features/favorites/`.

### Static game-file bundles

A second, build-time data source: `npm run game-data:generate` converts the ESR repo's txt game tables (from a local
clone at `../Eastern_Sun_Resurrected`) into JSON committed under `public/game-data/` (`manifest.json`, `types.json`,
`bases.json`). The browser fetches these lazily; they never go through the HTM parsers or IndexedDB. The game-file
version (ESR git tag, e.g. `3.2.10`) is independent of the HTM changelog version. See [Game Data](./features/GAME-DATA.md).

After an ESR release, run `npm run game-data:update`: it clones or pulls the ESR repo, regenerates the bundles, refreshes
the test fixtures, runs the game-data tests and the staleness check, and prints a summary. Flags and the manual fallback
are in [Game Data → Regenerating](./features/GAME-DATA.md#regenerating).

---

## Status

Documentation is actively being maintained. See [CONTRIBUTING.md](./CONTRIBUTING.md) for current status and next steps.
