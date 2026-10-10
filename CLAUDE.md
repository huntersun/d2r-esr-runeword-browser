# CLAUDE.md

This file provides guidance for Claude when working with this codebase.

## Project Overview

D2R ESR Runeword Browser - A React SPA for browsing Diablo 2 Resurrected runewords (ESR mod).

## Documentation

See [docs/README.md](./docs/README.md) for comprehensive project documentation including:

- Feature specifications (Core Data, Runewords, Socketables, Unique Items)
- Technical documentation (Architecture, Data Models, Navigation, UI Components)
- Coding guidelines and conventions

## Tech Stack

- **Framework**: React 19 with TypeScript + React Compiler
- **Build**: Vite
- **Linting**: ESLint with strict TypeScript rules, React plugins
- **Formatting**: Prettier

## Commands

```bash
npm run dev              # Start dev server
npm run build            # TypeScript check + production build
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run release          # Create a new version (runs lint + build first)
npm run compiler:check   # Check React Compiler optimization issues
npm run compiler:health  # Run React Compiler health check

# Game data (txt game files → public/game-data/*.json; needs ../Eastern_Sun_Resurrected clone)
npm run game-data:generate  # Regenerate the static game-data bundles
npm run game-data:check     # Exit 1 if the committed bundles are stale
npm run game-data:update    # After an ESR release: clone/pull ESR, generate, fetch fixtures, run game-data tests + check
npm run esr:diff            # What changed in ESR since the committed game data (patch notes, tables, strings, docs, launcher); --json, --from/--to <rev>

# Testing
npm run test:fixtures    # Fetch test fixtures (required once after checkout)
npm run test             # Run tests once (CI mode)
npm run test:coverage    # Generate code coverage report
```

- After an ESR release, run the `/esr-update` skill (`.claude/skills/esr-update/SKILL.md`): it runs `game-data:update` and the release diff, reviews the bundles, proposes guide note edits and asks before committing.

## React Compiler

The project uses React Compiler for automatic memoization. Do NOT use manual `useMemo`, `useCallback`, or `React.memo` unless absolutely necessary (add comment explaining why).

## Code Style

- Prettier handles formatting (single quotes, 140 print width, trailing commas)
- ESLint uses `strictTypeChecked` - avoid `!` non-null assertions, use proper null checks
- Console logs are kept in production builds (users can see parsing progress)

## Git Conventions

- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) format
  - `feat:` new features
  - `fix:` bug fixes
  - `chore:` maintenance tasks
  - `refactor:` code restructuring
  - `docs:` documentation
- **Pre-commit hooks**: Prettier and ESLint run automatically on staged files
- **Commit messages**: Validated by commitlint

## Versioning

Uses `commit-and-tag-version` for semantic versioning based on conventional commits.

- Tags use `v` prefix (e.g., v1.0.0)
- CHANGELOG.md is auto-generated
