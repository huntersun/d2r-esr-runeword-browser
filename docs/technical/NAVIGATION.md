# Navigation & App Shell

Documentation for routing, layout, and navigation patterns.

## Routes

| Path | Screen | Description |
|------|--------|-------------|
| `/` | RunewordsScreen | Home page - browse and filter runewords |
| `/guide` | GuideSpineScreen | New-player guide: "Start here" journey spine, note search, "I found something" row |
| `/guide/:slug` | GuideNoteScreen | One guide note; unknown slug shows a "Note not found" block linking back to `/guide` |
| `/gemwords` | GemwordsScreen | Gem-based socket recipes with filters |
| `/socketables` | SocketablesScreen | All socketables with category filters & search |
| `/uniques` | HtmUniqueItemsScreen | Unique items with category & coupon filters |
| `/mythicals` | MythicalUniquesScreen | Mythical unique items |
| `/ascendancies` | AscendanciesScreen | Ascendancies with their tier bonuses |
| `/game-data` | GameDataLayout | Game-file data section; index redirects to `bases` |
| `/game-data/bases` | BasesScreen | Base items browser (txt game files) |
| `/game-data/best-base` | BestBaseScreen | Placeholder (Phase 2) |
| `/game-data/affixes` | AffixesScreen | Placeholder (Phase 3) |
| `/game-data/types` | ItemTypesScreen | Item type tree + socket caps, `?type=<code>` focus |
| `/builds` | BuildsScreen | Shared builds list (Supabase only) |
| `/builds/new` | CreateBuildScreen | Create a build (sign-in required) |
| `/builds/:buildId/edit` | EditBuildScreen | Edit an own build |
| `/build/:buildId` | BuildDetailScreen | Build detail page |
| `/user/:userId` | UserProfileScreen | A user's public builds |
| `*` | NotFoundScreen | Catch-all for unknown URLs, with a link back home |

## App Shell Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│  D2R ESR  [Runewords] [Gemwords] [Socketables] [Uniques] [More▾] [⚙]│
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                         Main Content Area                             │
│                        (Feature Screens)                              │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Startup loading gate

`AppLayout` shows a full-screen "Loading data..." spinner until the HTM data sync has initialized (and a full-screen
error with "Try Again" when it failed). Guide routes (`/guide`, `/guide/*`) skip the spinner and render the normal
shell (Header + Outlet + SettingsDrawer) right away, because the guide is a static JSON bundle (`public/guide/`) that
needs no Dexie data; the sync keeps running in the background. The fatal-error screen still applies to every route.
See [GUIDE.md](../features/GUIDE.md).

### Header Components

- **Logo/Title**: "D2R ESR" or similar branding
- **Navigation Links**: Runewords, Guide, Gemwords, Socketables, Uniques, Mythicals, Ascendancies, Game Data, Builds (only when Supabase is configured), plus external ESR Documentation / Changelog links; items that don't fit collapse into a "More" menu (priority-plus, see `Header.tsx`)
- **Settings Button**: Cog icon in top-right corner

### Sub-tab layouts

`/game-data` is the only nested section. It has a single header entry (`{ key: 'game-data', to: '/game-data', end: false }`,
so it stays active on every sub-page) and a lazy `GameDataLayout` that renders:

```
Game Data
Game files: ESR 3.2.10 (tag 3.2.10 @ 10b540e, generated 2026-10-09)
[amber note when the HTM docs ESR version differs]
[Bases] [Best Base] [Affixes] [Item Types]      <- NavLinks, same classes as the header links
----------------------------------------------
<Outlet />                                        <- child route screen
```

Each child route is its own lazy screen wrapped in `<Suspense>` (all from `@/features/game-data`, so they share one chunk).
The version line comes from `public/game-data/manifest.json`; the docs version from Dexie `metadata.esrVersion`. The note
never says which version is newer (HTM and git-tag version strings do not compare).

### Navigation Style

- Active route highlighted in nav
- Mobile: Sheet-based slide-out menu

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
        // ... uniques, mythicals, ascendancies, builds, builds/new,
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

**Code splitting**: Every route screen is lazy-loaded with `React.lazy()` + `<Suspense>` so each screen lands in its own chunk instead of the entry bundle. The guard test `src/core/router/routeCodeSplitting.test.ts` fails if a screen is ever statically imported into the router again.

### Settings State

```typescript
interface SettingsState {
  readonly theme: Theme;           // 'dark' | 'light'
  readonly textSize: TextSize;     // 'small' | 'normal' | 'large' | 'extralarge'
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
└── components/
    ├── Header.tsx          # Top navigation bar
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

- Navigation links have proper `aria-current` for active state
- Settings drawer uses `aria-hidden` and focus trap when open
- Close button and Escape key close the drawer
