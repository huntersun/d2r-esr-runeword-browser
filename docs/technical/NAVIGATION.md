# Navigation & App Shell

Documentation for routing, layout, and navigation patterns.

## Routes

All routes are children of `AppLayout` in `src/core/router/index.tsx`; every screen and layout is lazy (see
[Router Setup](#router-setup)). Three sections are nested layouts with child routes: `/guide`, `/game-data` and
`/loot-filters` (see [Nested sections](#nested-sections)).

| Path                    | Screen                  | Description                                                                                         | Query params                                                                                           |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/`                     | RunewordsScreen         | Home page - browse and filter runewords                                                             | `search`, `sockets`, `maxlvl`, `items`, `runes`, `runemode`, `tierpts`, `name`                         |
| `/guide`                | GuideLayout             | Guide frame: a small "Experimental" notice above every guide page, then the child route             |                                                                                                        |
| `/guide` (index)        | GuideSpineScreen        | New-player guide: "Start here" journey spine, note search, "I found something" row                  |                                                                                                        |
| `/guide/map`            | GuideMapScreen          | All notes: link graph (large screens) and a list grouped by spine step                              |                                                                                                        |
| `/guide/:slug`          | GuideNoteScreen         | One guide note; unknown slug shows a "Note not found" block linking back to `/guide`                |                                                                                                        |
| `/gemwords`             | GemwordsScreen          | Gem-based socket recipes with filters                                                               | `search`, `sockets`, `maxlvl`, `items`, `gems`, `name`                                                 |
| `/socketables`          | SocketablesScreen       | All socketables with category filters & search                                                      | `search`, `categories`, `onlyHighest`, `name`                                                          |
| `/uniques`              | HtmUniqueItemsScreen    | Unique items with category & coupon filters                                                         | `search`, `maxlvl`, `cats`, `acq` (legacy `coupon=0`), `name`                                          |
| `/mythicals`            | MythicalUniquesScreen   | Mythical unique items                                                                               | `search`, `maxlvl`, `cats`, `name`                                                                     |
| `/ascendancies`         | AscendanciesScreen      | Ascendancies with their tier bonuses                                                                | `search`                                                                                               |
| `/game-data`            | GameDataLayout          | Game-file data section; index redirects to `bases`                                                  |                                                                                                        |
| `/game-data/bases`      | BasesScreen             | Base items browser (txt game files)                                                                 | `search`, `sockets` (minimum), `maxlvl`, `kind`, `tier`, `type`, `cls`, `sort` (`-<key>` = descending) |
| `/game-data/best-base`  | BestBaseScreen          | Best base finder for a runeword and a persisted character                                           | `rw`, `v`, `cls`, `lvl`, `str`, `dex`                                                                  |
| `/game-data/affixes`    | AffixesScreen           | Affix browser + "what can roll" on a base                                                           | `search`, `aff`, `rare`, `minlvl`, `maxlvl`, `cls`, `type`, `base`, `ilvl`, `q`, `auto`, `sort`        |
| `/game-data/types`      | ItemTypesScreen         | Item type tree + socket caps                                                                        | `type` (focused node)                                                                                  |
| `/loot-filters`         | LootFilterLayout        | Loot filter frame: an "Under development" notice above every loot-filter page, then the child route |                                                                                                        |
| `/loot-filters` (index) | LootFilterLibraryScreen | Loot filter library: new, upload, ESR default filter template, download (.json or .zip)             |                                                                                                        |
| `/loot-filters/:id`     | LootFilterEditorScreen  | Loot filter editor; unknown id shows "Filter not found"                                             | `tab=rules\|styles\|settings\|json\|test`                                                              |
| `/builds`               | BuildsScreen            | Shared builds list (Supabase only)                                                                  |                                                                                                        |
| `/builds/new`           | CreateBuildScreen       | Create a build (sign-in required)                                                                   |                                                                                                        |
| `/builds/:buildId/edit` | EditBuildScreen         | Edit an own build                                                                                   |                                                                                                        |
| `/build/:buildId`       | BuildDetailScreen       | Build detail page                                                                                   |                                                                                                        |
| `/user/:userId`         | UserProfileScreen       | A user's public builds                                                                              |                                                                                                        |
| `*`                     | NotFoundScreen          | Catch-all for unknown URLs, with a link back home                                                   |                                                                                                        |

`map` is a static segment, so the router ranks `/guide/map` above `/guide/:slug` (a note with the slug `map` would
be shadowed). `/guide/:slug` slugs are the file names in `content/guide/notes/`.

**Query params.** The shared keys are `FILTER_URL_PARAM_KEYS` in `src/core/utils/filterUrlParams.ts` (`search`, `sockets`,
`maxlvl`, `items`, `runes`, `tierpts`, `gems`, `name`); `sockets` takes an exact count or a range (`4`, `2-4`, `-4`, `4-`). The
feature-specific keys live next to each feature's `useUrlInitialize` hook, and `GAME_DATA_URL_PARAM_KEYS` in
`src/features/game-data/constants/urlParams.ts`. The filter screens (runewords, gemwords, socketables, uniques, mythicals,
ascendancies, bases, best base, affixes) read their params once on mount, put them into Redux and remove them from the URL;
Copy Link rebuilds a URL from the current state (non-default values only). Item Types (`type`) and the loot filter editor
(`tab`) read their param on every render and keep it in the URL. The builds screens keep their search, class and sort in
Redux only.

**`?name=<Name>` focus** (runewords, gemwords, socketables, uniques, mythicals): shows only the items whose name equals `<Name>`
(`normaliseItemName` in `src/core/utils/itemName.ts`: case, whitespace, quotes/apostrophes and dashes unified; all variants of a
runeword), unlike `?search=`, which also matches affix text. While it is set, every other filter of the screen (search, sockets,
level, types, runes/gems, categories, coupon, highest quality) is ignored but kept, so the item is always visible and clearing
the focus brings the previous filters back; the favourites-only toggle still applies. It is read on mount like the other params
(the URL is then cleaned) and cleared by any visit whose URL has no `name`, so it never outlives the deep link. The search box
does not change it. A dismissible "Showing: <Name> ×" chip shows it and scrolls into view only right after the deep link.
Copy Link keeps it. Guide `rw:`/`gw:`/`unique:`/`mythical:`/`socketable:` links use it.

## App Shell Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│ D2R ESR  Recipes▾ Items▾ Tools▾ Guide Builds    [📖] [☀] [GH] [⚙] │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                         Main Content Area                             │
│                        (Feature Screens)                              │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Startup loading gate

`AppLayout` shows a full-screen "Loading data..." spinner until the HTM data sync has initialized (and a full-screen
error with "Try Again" when it failed). Routes that render from static bundles only skip the spinner and render the
normal shell (Header + Outlet + SettingsDrawer) right away; the sync keeps running in the background. They also skip
the fatal-error screen, so a failed first sync does not hide them. The prefixes are listed in
`STATIC_BUNDLE_ROUTE_PREFIXES` in `AppLayout.tsx` (a path matches its prefix exactly or with a `/` after it):

- `/guide`: the guide is a static JSON bundle (`public/guide/`), see [GUIDE.md](../features/GUIDE.md);
- `/loot-filters`: the editor uses the game-data bundles, `public/loot-filters/` and localStorage, see
  [LOOT-FILTER.md](../features/LOOT-FILTER.md).

### Header Components

`src/core/components/Header.tsx` renders from one typed config, `NAV_ENTRIES` in `src/core/navigation/navConfig.ts`
(groups of `NavItem`s with a label, a one-line description, a path and `end`, plus plain links):

| Entry     | Kind  | Pages                                                                                                                               |
| --------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Recipes ▾ | group | Runewords (`/`, `end`), Gemwords (`/gemwords`), Socketables (`/socketables`)                                                        |
| Items ▾   | group | Uniques (`/uniques`), Mythicals (`/mythicals`), Ascendancies (`/ascendancies`), Bases (`/game-data/bases`)                          |
| Tools ▾   | group | Best Base (`/game-data/best-base`), Affixes (`/game-data/affixes`), Item Types (`/game-data/types`), Loot Filters (`/loot-filters`) |
| Guide     | link  | `/guide`                                                                                                                            |
| Builds    | link  | `/builds`, only when Supabase is configured (`requiresSupabase`, filtered by `getNavEntries`)                                       |

- **Brand**: "D2R ESR", a link to `/`.
- **Desktop (md and up)**: a shadcn `NavigationMenu` (`src/components/ui/navigation-menu.tsx`, `viewport={false}` so
  each dropdown opens under its own trigger). Each group trigger opens a list of label + description links. Active state:
  an item is active when the path equals its `to` or starts with `to/` (`end` items: exact match only, so Runewords is
  active only on `/`); a group trigger is highlighted when any of its items is active (`isNavGroupActive`). Active links
  get `aria-current="page"`. Keyboard (Radix): triggers are in the tab order, Enter/Space/ArrowDown opens, arrows and
  Tab move through the items, Escape closes; choosing a link closes the menu.
- **Right side**: ESR links dropdown (book icon: ESR Documentation, ESR Changelog; md and up), theme toggle, GitHub link,
  `AuthControls` (Sign In / user menu, Supabase only), settings cog.
- **Mobile (below md)**: hamburger opens a left `Sheet` with a shadcn `Accordion` (`type="multiple"`) of the same groups;
  the group of the current route starts open, Guide and Builds are top-level links, then the ESR links and the auth
  control. Choosing a page closes the sheet.

`navConfig.test.ts` checks that every config path resolves to a real route of the router (not the `*` catch-all), that
labels, keys and paths are unique, that Builds is hidden without Supabase, and the active-state rules.

### Nested sections

`/guide`, `/game-data` and `/loot-filters` are nested routes with a lazy layout that renders a frame above an `<Outlet />`:

- `GuideLayout`: the "Experimental" `DevNotice`, then the spine (index), the map (`map`) or a note (`:slug`);
- `LootFilterLayout`: the "Under development" `DevNotice`, then the library (index) or the editor (`:id`);
- `GameDataLayout`: a title, the game-file version line and sub-tabs (below); its index redirects to `bases`.

`GameDataLayout` renders:

```
Game Data
Game files: ESR 3.2.10 (tag 3.2.10 @ 10b540e, generated 2026-10-09)
[amber note when the HTM docs ESR version differs]
[Bases] [Best Base] [Affixes] [Item Types]      <- NavLinks, same classes as the header links (navTabClasses.ts)
----------------------------------------------
<Outlet />                                        <- child route screen
```

Each child route is its own lazy screen wrapped in `<Suspense>` (each section's screens come from one feature module
(`@/features/guide`, `@/features/game-data`, `@/features/loot-filter`), so they share its chunk).
The version line comes from `public/game-data/manifest.json`; the docs version from Dexie `metadata.esrVersion`. The note
never says which version is newer (HTM and git-tag version strings do not compare).

The Game Data child pages are separate header items (Bases under Items; Best Base, Affixes and Item Types under Tools).
Guide and Loot Filters items are prefix-matched, so they stay active on every child page.

The header triggers and links, the Game Data sub-tabs and the loot filter editor's tabs share one set of classes
(`TAB_BASE` / `TAB_INACTIVE` / `TAB_ACTIVE` in `src/core/components/navTabClasses.ts`). The editor's tabs are not routes but
buttons in a `role="tablist"` (`role="tab"`, `aria-selected`) that set `?tab=`. The amber notices of `GuideLayout` and
`LootFilterLayout` are both `DevNotice` (`src/core/components/DevNotice.tsx`).

### Navigation Style

- Active route highlighted in nav (item and its group trigger)
- Mobile: Sheet-based slide-out menu with an accordion of the groups

## Settings Drawer

Opens from the right side when the cog icon is clicked.

```
┌─────────────────────────────────────────────────────────────┐
│  Header                                               [⚙]  │
├─────────────────────────────┬───────────────────────────────┤
│                             │  Settings            [X]      │
│                             │─────────────────────────────── │
│    Main Content             │  Theme                        │
│    (dimmed/inactive)        │  ○ Dark (default)             │
│                             │  ○ Light                      │
│                             │─────────────────────────────── │
│                             │  Font                         │
│                             │  ☐ Use Diablo 2 style font    │
│                             │─────────────────────────────── │
│                             │  Text Size                    │
│                             │  ○───●───○───○  (slider)      │
│                             │         Normal                │
│                             │─────────────────────────────── │
│                             │  Data                         │
│                             │  [Force Refresh Data]         │
│                             │                               │
│                             │  App Version: 1.12.1          │
│                             │  ESR Version: 3.9.07          │
│                             │  Last updated: 12/21/2025     │
│                             │─────────────────────────────── │
│                             │  Credits                      │
│                             │  Eastern Sun Resurrected by   │
│                             │  Celestialray                 │
│                             │  Source code on GitHub        │
└─────────────────────────────┴───────────────────────────────┘
```

### Drawer Behavior

- **Trigger**: Click settings cog icon
- **Position**: Slides in from right
- **Overlay**: Main content dimmed but visible
- **Close**: X button or click outside

### Settings Contents

- **Theme Toggle**: Dark (default) / Light, persisted in localStorage
- **Text Size**: 4-step slider (small / normal / large / extralarge), persisted in localStorage
- **Diablo Font**: Toggle for thematic font rendering, persisted in localStorage
- **Refresh Data**: Force re-fetch and parse all data
- **Version display**: App version and current ESR version from metadata
- **Last updated**: Timestamp of last successful parse
- **Credits**: small muted block at the bottom: "Eastern Sun Resurrected by Celestialray" (links the ESR site) and
  "Source code on GitHub" (both URLs from `src/core/navigation/navConfig.ts`)

## Implementation

### Router Setup

```typescript
// src/core/router/index.tsx
const RunewordsScreen = lazy(async () => {
  const module = await import('@/features/runewords');
  return { default: module.RunewordsScreen };
});
// ... one lazy() wrapper per screen

function routeElement(Screen: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={routeLoadingFallback}>
      <Screen />
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouteErrorScreen />,
      children: [
        { index: true, element: routeElement(RunewordsScreen) },
        {
          path: 'guide',
          element: routeElement(GuideLayout),
          children: [
            { index: true, element: routeElement(GuideSpineScreen) },
            { path: 'map', element: routeElement(GuideMapScreen) },
            { path: ':slug', element: routeElement(GuideNoteScreen) },
          ],
        },
        { path: 'gemwords', element: routeElement(GemwordsScreen) },
        { path: 'socketables', element: routeElement(SocketablesScreen) },
        {
          path: 'game-data',
          element: routeElement(GameDataLayout),
          children: [
            { index: true, element: <Navigate to="bases" replace /> },
            { path: 'bases', element: routeElement(GameDataBasesScreen) },
            // ... best-base, affixes, types
          ],
        },
        // ... uniques, mythicals, ascendancies (before game-data),
        //     loot-filters (layout: index + ':id'), builds, builds/new,
        //     builds/:buildId/edit, build/:buildId, user/:userId
        { path: '*', element: <NotFoundScreen /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
```

Uses `createBrowserRouter` (not hash-based) with `basename` set from Vite's `BASE_URL` for GitHub Pages compatibility.

**Builds routes** load through `loadAfter(() => import('@/features/builds'), startBuilds)` (`src/core/router/loadAfter.ts`):
the screen module resolves only once the builds saga is running, because the screens dispatch their fetches in mount
effects and an action dispatched before the saga listens is lost.

**Code splitting**: Every route screen is lazy-loaded with `React.lazy()` + `<Suspense>` so each screen lands in its own chunk instead of the entry bundle. The guard test `src/core/router/routeCodeSplitting.test.ts` fails if a screen is ever statically imported into the router again.

### Settings State

```typescript
interface SettingsState {
  readonly theme: Theme; // 'dark' | 'light'
  readonly textSize: TextSize; // 'small' | 'normal' | 'large' | 'extralarge'
  readonly useDiabloFont: boolean;
  readonly isDrawerOpen: boolean;
}
```

All settings (except `isDrawerOpen`) are persisted to localStorage and restored on startup. An inline script in `index.html` applies the stored theme, Diablo font class, and text size to `<html>` before first paint (avoids a flash of the default theme); `ThemeInitializer` then keeps them in sync with the Redux state.

## Feature Location

```
src/core/
├── router/
│   ├── index.tsx           # Route definitions
│   ├── NotFoundScreen.tsx  # Catch-all 404 screen
│   └── RouteErrorScreen.tsx # Route errorElement
├── layouts/
│   └── AppLayout.tsx       # Main app shell
├── navigation/
│   ├── navConfig.ts        # Header groups/items, external URLs, active-state helpers
│   └── navConfig.test.ts   # Paths exist in the router, unique labels
└── components/
    ├── Header.tsx          # Top navigation bar (NavigationMenu groups, mobile accordion)
    ├── navTabClasses.ts    # Shared nav link / sub-tab classes
    └── SettingsDrawer.tsx  # Settings slide-out panel

src/features/settings/
├── components/
│   └── ThemeInitializer.tsx  # Apply theme on initial render
├── constants/
│   ├── textSize.ts           # Text size pixel mappings
│   └── types.ts              # Theme, TextSize types
├── hooks/
│   └── useTheme.ts           # useThemeSync / useTextSizeSync / useDiabloFontSync (apply settings to <html>)
└── store/
    └── settingsSlice.ts      # Theme, text size, font, drawer state
```

## Accessibility

- Navigation links have proper `aria-current` for active state; the desktop menu and the mobile sheet are `<nav aria-label="Main">`
- Group triggers are keyboard operable (Enter/Space/arrows open, Escape closes) via Radix NavigationMenu
- Settings drawer uses `aria-hidden` and focus trap when open
- Close button and Escape key close the drawer
