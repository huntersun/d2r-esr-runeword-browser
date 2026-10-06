# Runewords Feature

The primary feature - browse and filter all Eastern Sun Resurrected runewords.

## Purpose

- View all runewords with complete data
- Filter by runes, text search, sockets, item types, required level, and tier points
- See runeword bonuses (per-column: weapon/helm/armor) AND rune contributions
- Share filtered views via URL

## Filters

### Text Search
- Searches runeword name + affix text
- Split by spaces, trimmed, AND logic
- Supports quoted phrases: `"exact phrase"`
- Example: `resist life` matches runewords with both "resist" AND "life"

### Socket Count
- Single-digit number input (1-6)
- Default: empty (shows all runewords)
- If set: only runewords that can be made with that socket count
- Runewords without a range match their exact `sockets` count; recipes with optional jewels
  (shown as "3-6 Socket") match any count in `[sockets, socketsMax]`

### Max Required Level
- Number input to cap the required level of shown runewords
- Default: empty (no cap)

### Item Type Filter
- Data-driven checkboxes organized into categories (Weapons, Armors, Shields, etc.)
- Group-level toggles (`toggleItemTypeGroup`) to select/deselect entire categories
- All checked by default
- Runeword shown if its `allowedItems` matches ANY checked type

### Rune Checkbox Filter
- All runes (ESR, LoD, Kanji) in a tiered list
- Rune names displayed with colors
- **3-way tier checkbox**: all selected / some selected / none selected
- **Group toggle** (`toggleRuneGroup`): select/deselect all runes in a tier
- **Global "All" toggle**: select/deselect all runes
- All runes checked by default
- **Logic**: Runeword hidden if ANY of its runes are unchecked (strict)

### Tier Points Filter
- Filter by maximum tier points per rune category (ESR/LoD)
- "Clear All" button (`clearAllTierPoints`) to reset all tier point filters

## Runeword Model

```typescript
type RuneCategory = 'esrRunes' | 'lodRunes';

interface TierPointTotal {
  readonly tier: number;
  readonly category: RuneCategory;
  readonly totalPoints: number;
}

interface Runeword {
  readonly name: string;
  readonly variant: number;                     // 1, 2, 3... for multi-variant runewords
  readonly sockets: number;                     // Base/minimum socket count (= ingredients + required jewels)
  readonly socketsMax?: number;                 // Only set when the source shows a range, e.g. "(2-3 Socket)"
  readonly reqLevel: number;                    // Highest required level among all runes and gems
  readonly sortKey: number;                     // Pre-calculated sort key
  readonly runes: readonly string[];            // Rune names in order
  readonly gems: readonly string[];             // Gem names (e.g. ["Perfect Topaz"])
  readonly ingredients: readonly string[];      // All items in original order (runes + gems interleaved)
  readonly allowedItems: readonly string[];
  readonly excludedItems: readonly string[];    // Items excluded from this variant
  readonly affixes: readonly Affix[];           // Backward compat: bonuses from first non-empty column
  readonly columnAffixes: SocketableBonuses;    // Per-column bonuses (weapon/helm/armor)
  readonly tierPointTotals: readonly TierPointTotal[];
  readonly jewelInfo?: string;                  // Jewel info, e.g. "(0-3) Jewels" (optional) or "(2) Jewels" (required)
}
```

**Key model details:**
- **Compound primary key**: `[name+variant]` - some runewords have multiple variants with different recipes
- **gems**: Runewords can require gems in addition to runes (added in v1.4.0)
- **ingredients**: The original order of runes + gems interleaved in the recipe
- **columnAffixes**: Per-column bonuses displayed as split cards (weapon/helm/armor)
- **sortKey**: Pre-calculated for sorting: ESR/Kanji (0-9999) or LoD (10000+) combined with reqLevel
- **jewelInfo**: e.g. "(0-3) Jewels" — recipes that accept optional jewels on top of their runes.
  Since ESR 3.2 the source also lists each socket count of such a recipe as its own row with plain
  "Jewel" lines; those rows get e.g. "(2) Jewels" and `sockets` = runes + gems + jewels.
- **socketsMax**: Set only for the optional-jewel recipes, which the source shows as a range,
  e.g. Moonlight `(3-6 Socket)`. `sockets` stays the base count; the socket filter matches any
  count in `[sockets, socketsMax]` and the card shows "3-6 Socket".

## RunewordCard Display

- Runeword name with socket count badge
- Item count displayed in page title
- Rune and gem sequence (with tooltips for hover info)
- Allowed item types
- **Per-column bonuses** (split card layout): Shows bonuses specific to weapon/helm/armor columns
- Tier point totals per category
- Optional jewel info

## State Management

```typescript
interface RunewordsState {
  readonly searchText: string;
  readonly socketCount: number | null;
  readonly maxReqLevel: number | null;
  readonly selectedItemTypes: Record<string, boolean>;
  readonly selectedRunes: Record<string, boolean>;  // "category:runeName" → checked
  readonly maxTierPoints: Record<string, number | null>;
}
```

**Actions:** `setSearchText`, `setSocketCount`, `setMaxReqLevel`, `toggleItemType`, `setAllItemTypes`, `selectAllItemTypes`, `deselectAllItemTypes`, `toggleRune`, `setAllRunes`, `selectAllRunes`, `deselectAllRunes`, `toggleRuneGroup`, `toggleItemTypeGroup`, `setMaxTierPoints`, `clearAllTierPoints`

## Hooks

- `useFilteredRunewords()` - Applies all filters (search, sockets, req level, item types, runes, tier points)
- `useRuneGroups()` - Groups runes by category/tier for the filter UI
- `useSocketableLookup()` (`src/core/hooks/useSocketableLookup.ts`) - Rune/gem lookup (built by `src/core/utils/socketableLookup.ts`) used for badges, tooltips and bonuses; `RunewordsScreen` loads it once (`useSocketableLookupQuery`) and provides it via `SocketableLookupContext`
- `useAvailableItemTypes()` - Lists valid item types from DB (thin wrapper over `src/core/hooks/useAvailableItemTypes.ts`)
- `useShareUrl()` - Generates shareable URLs with current filter state
- `useUrlInitialize()` - Initializes filters from URL params, cleans URL after load

## Feature Location

```
src/features/runewords/
├── components/
│   ├── RuneBadge.tsx            # Rune display badge
│   ├── RuneCheckboxGroup.tsx    # Tiered rune checkbox group
│   ├── RuneTooltip.tsx          # Rune hover tooltip
│   ├── RunewordCard.tsx         # Main runeword card display
│   ├── RunewordFilters.tsx      # All filter controls
│   ├── RunewordPointsDisplay.tsx # Tier point totals display
│   └── TierPointsFilter.tsx     # Tier points filter controls
├── constants/
│   └── tierColors.ts            # Tier color mappings
├── hooks/
│   ├── useAvailableItemTypes.ts
│   ├── useFilteredRunewords.ts
│   ├── useRuneGroups.ts
│   ├── useShareUrl.ts
│   └── useUrlInitialize.ts
├── screens/
│   └── RunewordsScreen.tsx
├── store/
│   └── runewordsSlice.ts
├── types/
│   └── index.ts
└── utils/
    └── filteringHelpers.ts
```

Shared with gemwords (in `src/core/`): `components/RecipeCommonFilters.tsx` (search, sockets, req level, item types via `ItemTypeFilter.tsx`), `components/RecipeBonuses.tsx`, `components/GemBadge.tsx` / `GemTooltip.tsx`, `constants/itemTypeCategories.ts`, `utils/itemCategoryMapping.ts`, `utils/columnAffixes.ts`.
