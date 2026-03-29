# Feature: Ascendancies Page

## Overview

Add a new "Ascendancies" page to the app that parses ascendancy data from the ESR documentation, stores it in IndexedDB, and displays it with search and URL sharing. This feature is a prerequisite for the builds feature (which references ascendancies) and will be released independently first.

## Data Source

**URL:** `https://easternsunresurrected.com/ascendancies.htm`

**Key facts:**
- **15 ascendancies** total
- **NOT class-specific** — all 15 are available to all character classes
- **5 tiers** per ascendancy with escalating bonus strings
- Some ascendancies have **footnotes** (marked with `*`, `**`, `***`) explaining mechanical details
- Each ascendancy has an **image** on the ESR docs site

**Complete list (in page order):** Battlemage, Blademaster, Arcanist, Bloodmage, Awakened, Ironbolt, Starborn, Lifebreaker, Worldshaper, Soul Warden, Stance Dancer, Nomad, Sharpshooter, Mana Warden, Berserker.

## Data Model

### TypeScript Interfaces

Add to `src/core/db/models.ts`:

```typescript
export interface AscendancyTier {
  readonly tier: number;                  // 1-5
  readonly bonuses: readonly string[];    // Freetext bonus strings
}

export interface Ascendancy {
  readonly name: string;                  // PK, e.g. "Battlemage"
  readonly imageUrl: string;              // Relative URL, e.g. "./images/ascendancies/battlemage.png"
  readonly tiers: readonly AscendancyTier[];
  readonly footnotes: readonly string[];  // e.g. ["*Total Defense Bonus is multiplicative..."]
}
```

### IndexedDB Table

Add to `src/core/db/db.ts` — bump database version from 11 to 12:

```
ascendancies: 'name'
```

Simple primary key on `name`. No additional indexes needed — there are only 15 records, all queries load the full table.

## HTML Structure & Parser Design

### Source HTML Structure

Each ascendancy is a flex container `<div>` with two child `<div>` elements:

```html
<div style="display: flex; justify-content: space-around; width: 1025px">
    <!-- Child 1: Tiers & bonuses (or image — layout alternates) -->
    <div style="display: flex; align-items: center; justify-content: center; width: 50%;">
        <font face="arial,helvetica" size="-1" style="width: 100%">
            <font color="orange">Tier 1</font><br>
            +1 to Class Skill Levels<br>
            +60 to Strength<br>
            +60 to Energy<br><br>
            <font color="orange">Tier 2</font><br>
            ... bonuses ...<br><br>
            <!-- Tiers 3-5 follow same pattern -->
        </font>
    </div>
    <!-- Child 2: Name & image (or tiers — layout alternates) -->
    <div style="display: flex; align-items: center; justify-content: center; flex-direction: column; width: 50%;">
        <font color="orange" size="4">Battlemage Ascendancy</font><br>
        <img src="./images/ascendancies/battlemage.png" style="width: 300px" />
    </div>
</div>
<br>
<font size="-2">*Total Defense Bonus is multiplicative with your entire armor value.</font><br>
<br><br><br><br><br>
```

### Key Parsing Challenges

1. **Alternating layout**: The text and image divs swap position between entries. Some have text-left/image-right, others have image-left/text-right.
2. **Footnotes**: Appear as `<font size="-2">` siblings AFTER the main flex div, not inside it.
3. **Footnote markers**: In bonus text, markers (`*`, `**`, `***`) appear either as plain text or wrapped in `<font color="red">`.
4. **Ironbolt edge case**: Missing `<br><br>` separator between Tier 3 and Tier 4.
5. **Bold text in footnotes**: Some footnotes contain `<b>` tags (e.g., Ironbolt: `<b>minimum</b>`).

### Parser Algorithm

**File:** `src/features/data-sync/parsers/ascendanciesParser.ts`

#### Step 1: Find ascendancy entries

```
Query: div[style*="display: flex"][style*="justify-content: space-around"]
```

These are the top-level flex containers — one per ascendancy.

#### Step 2: Identify text vs image div (handles alternating layout)

For each flex container's two child divs:
- **Image div**: Has `flex-direction: column` in its `style` attribute. Contains `<font color="orange" size="4">` (the name) and `<img>` (the image).
- **Text div**: The other child. Contains `<font color="orange">Tier N</font>` labels with bonus lines.

This detection is layout-agnostic — it doesn't matter which div comes first.

#### Step 3: Extract name

From the image div, find `font[color="orange"][size="4"]`:
- Get `textContent`, trim
- Strip the " Ascendancy" suffix → clean name (e.g., "Battlemage")

#### Step 4: Extract image URL

From the image div, find `img`:
- Get `src` attribute (e.g., `"./images/ascendancies/battlemage.png"`)

#### Step 5: Extract tiers and bonuses

From the text div, get the `<font>` element with `size="-1"`:
- Get its `innerHTML`
- Split on `<font color="orange">Tier N</font>` using regex: `/<font color="orange">Tier (\d+)<\/font>/gi`
- This produces segments — discard everything before the first tier label
- For each tier segment:
  - Extract the tier number from the regex match group
  - Split the segment content on `<br>` tags: `/<br\s*\/?>/i`
  - For each line: strip all HTML tags, decode HTML entities, trim, normalize whitespace
  - Filter out empty lines
  - Result: `bonuses` array for that tier

**Why split on tier labels (not `<br><br>`)**: The Ironbolt ascendancy is missing the `<br><br>` separator between Tier 3 and Tier 4. Splitting on `<font color="orange">Tier N</font>` is robust regardless of separator inconsistencies.

**Footnote markers in bonus text**: After stripping HTML tags, markers like `<font color="red">**</font>` become plain `**` — which is the desired behavior. The markers remain in the bonus text as-is.

#### Step 6: Extract footnotes

Footnotes are `<font size="-2">` elements that appear as **siblings after** the flex div in the DOM. Strategy:

Walk through all elements sequentially under the common parent (`<center>`). Track the "current ascendancy" — when we encounter a flex div, it sets the current ascendancy; when we encounter a `<font size="-2">`, its text is added to the current ascendancy's footnotes.

For each footnote element:
- Get `textContent` (preserves text from nested `<b>` tags)
- Trim, normalize whitespace
- Filter out empty strings

#### Exported Functions (for unit testing)

- `parseAscendancies(html: string): Ascendancy[]` — main parser entry point
- `extractName(imageDiv: Element): string`
- `extractImageUrl(imageDiv: Element): string`
- `extractTiers(textDiv: Element): AscendancyTier[]`

## Data Sync Pipeline Integration

### Files to Modify

#### `src/core/api/remoteConfig.ts`

Add to `REMOTE_URLS`:
```typescript
ascendancies: `${ESR_BASE_URL}/ascendancies.htm`,
```

#### `src/core/api/ascendanciesApi.ts` (new file)

```typescript
export async function fetchAscendanciesHtml(): Promise<string> {
  const response = await fetch(REMOTE_URLS.ascendancies);
  if (!response.ok) {
    throw new Error(`Failed to fetch ascendancies.htm: ${String(response.status)} ${response.statusText}`);
  }
  return response.text();
}
```

#### `src/core/api/index.ts`

Add export for `fetchAscendanciesHtml`.

#### `src/features/data-sync/store/dataSyncSlice.ts`

Add `readonly ascendanciesHtml: string;` to `FetchedHtmlData` interface.

#### `src/features/data-sync/interfaces/ParsedData.ts`

Add `readonly ascendancies: Ascendancy[];` to `ParsedData` interface.

#### `src/features/data-sync/store/dataSyncSaga.ts`

Three functions to modify:

**`handleFetchHtml`**: Add `fetchAscendanciesHtml` as a 7th parallel fetch in the `yield all([...])` call. Add `ascendanciesHtml` to the destructured result and to the `fetchHtmlSuccess` payload.

**`handleParseData`**: Call `parseAscendancies(ascendanciesHtml)`, log the count, add `ascendancies` to the `parseDataSuccess` payload.

**`handleStoreData`**: Add `call(() => db.ascendancies.bulkPut(ascendancies))` to the parallel `yield all([...])` store calls. Add count to the log object.

#### `src/features/data-sync/store/startupSaga.ts`

Add empty-table migration check (same pattern as `htmUniqueItems` and `mythicalUniques`):

```typescript
const ascendanciesCount: number = (yield call(() => db.ascendancies.count())) as number;
if (ascendanciesCount === 0) {
  console.log('[HTML] Migration needed: ascendancies table empty, refetching...');
  yield put(startupNeedsFetch());
  yield put(initDataLoad({ force: false }));
  return;
}
```

#### `src/features/data-sync/parsers/index.ts`

Add export for `parseAscendancies`.

## Feature Page

### Route & Navigation

**Route:** `/ascendancies`
**Nav position:** Last item, after Mythicals:
```
[Runewords] [Socketables] [Uniques] [Mythicals] [Ascendancies]
```

#### Files to modify:
- `src/core/components/Header.tsx` — add `{ to: '/ascendancies', label: 'Ascendancies', end: false }` to `NAV_ITEMS`
- `src/core/router/index.tsx` — add `{ path: 'ascendancies', element: <AscendanciesScreen /> }`
- `src/core/store/store.ts` — add `ascendancies: ascendanciesReducer`

### Feature Folder Structure

```
src/features/ascendancies/
├── index.ts
├── screens/
│   └── AscendanciesScreen.tsx
├── components/
│   ├── AscendancyFilters.tsx
│   └── AscendancyCard.tsx
├── hooks/
│   ├── useFilteredAscendancies.ts
│   ├── useUrlInitialize.ts
│   └── useShareUrl.ts
├── store/
│   └── ascendanciesSlice.ts
└── utils/
    └── filteringHelpers.ts
```

### Redux Slice

**File:** `src/features/ascendancies/store/ascendanciesSlice.ts`

Simpler than other features — only search text, no category filters:

```typescript
interface AscendanciesState {
  readonly searchText: string;
}

const initialState: AscendanciesState = {
  searchText: '',
};
```

**Actions:** `setSearchText`, `initializeFromUrl`
**Selectors:** `selectSearchText`

### Filtering Hook

**File:** `src/features/ascendancies/hooks/useFilteredAscendancies.ts`

- Fetch all 15 ascendancies from IndexedDB via `useLiveQuery(() => db.ascendancies.toArray())`
- Apply text search with AND logic + quoted phrase support (reuse `parseSearchTerms` from existing utils)
- Searchable text per ascendancy: `name + all tier bonuses + all footnotes`
- Sort alphabetically by name
- Return filtered array (or `undefined` while loading)

### Search

**File:** `src/features/ascendancies/utils/filteringHelpers.ts`

```typescript
export function matchesSearch(item: Ascendancy, searchTerms: readonly string[]): boolean {
  if (searchTerms.length === 0) return true;
  const tierText = item.tiers.flatMap(t => t.bonuses).join(' ');
  const footnoteText = item.footnotes.join(' ');
  const searchableText = `${item.name} ${tierText} ${footnoteText}`.toLowerCase();
  return searchTerms.every(term => searchableText.includes(term));
}
```

**Search examples** (displayed in SearchHelpButton):
- `spell damage` — ascendancies with "spell damage"
- `"class skill"` — exact phrase match
- `resist strength` — ascendancies mentioning both "resist" and "strength"

### URL Sharing

Same pattern as existing features:

**`useUrlInitialize`**: On mount, read `search` param from URL → dispatch `initializeFromUrl`. Clean URL after.

**`useShareUrl`**: Generate URL with `search` param if non-empty. Base path: `/ascendancies`.

### AscendancyCard Component

**File:** `src/features/ascendancies/components/AscendancyCard.tsx`

Fully expanded card showing all 5 tiers. Layout:

```
+-------------------------------------------+
|            [Ascendancy Image]             |
|         BATTLEMAGE ASCENDANCY             |
|-------------------------------------------|
| Tier 1                                    |
|   +1 to Class Skill Levels               |
|   +60 to Strength                        |
|   +60 to Energy                          |
|                                           |
| Tier 2                                    |
|   +1 to Class Skill Levels               |
|   25% Bonus to Strength                  |
|   25% Bonus to Energy                    |
|                                           |
| Tier 3                                    |
|   Gain 1% Spell Damage for every 2%...   |
|   25% Chance of Crushing Blow            |
|   25% Deadly Strike                      |
|                                           |
| Tier 4                                    |
|   Gain 1% Total Defense Bonus for...*    |
|   +10 Life on Striking                   |
|   +15% Physical Damage Leeched as Mana   |
|                                           |
| Tier 5                                    |
|   +3 to Class Skill Levels               |
|   +50% to All Speeds                     |
|-------------------------------------------|
| *Total Defense Bonus is multiplicative    |
|  with your entire armor value.            |
+-------------------------------------------+
```

- **Image**: Loaded from ESR docs site, resolved URL: `https://easternsunresurrected.com/images/ascendancies/NAME.png`
- **Name**: Amber/orange heading (matching ESR's `<font color="orange">` styling)
- **Tier labels**: Amber/orange subheadings ("Tier 1", "Tier 2", ...)
- **Bonus text**: Blue text (`text-[#8080E6]`) — matches existing affix text color
- **Footnotes**: Shown in a separated section at the bottom, smaller muted text
- **All tiers visible** — no expand/collapse

### AscendancyFilters Component

**File:** `src/features/ascendancies/components/AscendancyFilters.tsx`

Simple filter bar — search only, no categories:

```
[Search by name or bonus text...] [x] [?] [Copy Link]
```

- Search input with 300ms debounce (local state → Redux)
- Clear button (X icon) when text is present
- SearchHelpButton with ascendancy-specific examples
- CopyLinkButton for URL sharing

### AscendanciesScreen Component

**File:** `src/features/ascendancies/screens/AscendanciesScreen.tsx`

```
Ascendancies (15)
[Search...] [?] [Copy Link]
Showing 15 ascendancies

[Card] [Card] [Card]
[Card] [Card] [Card]
...
```

- Title with total count
- AscendancyFilters
- Result count text ("Showing N ascendancies")
- Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
- ScrollToTopButton
- Spinner while data is loading
- Empty state when search returns no matches

## Testing

### Test Fixture

**File to modify:** `scripts/fetch-test-fixtures.js`

Add to the `FILES` array:
```javascript
{ url: `${ESR_BASE_URL}/ascendancies.htm`, name: 'ascendancies.htm' },
```

Run `npm run test:fixtures` to download the fixture.

### Parser Unit Tests

**File:** `src/features/data-sync/parsers/ascendanciesParser.test.ts`

Follow the `mythicalUniquesParser.test.ts` pattern.

#### SECTION 1: Parse counts
- Should parse exactly 15 ascendancies

#### SECTION 2: Data quality — names
- Every ascendancy has a non-empty name
- No name contains HTML tags
- No name has leading/trailing whitespace
- All 15 known names are present (Battlemage through Berserker)

#### SECTION 3: Image URLs
- Every ascendancy has a non-empty `imageUrl`
- No imageUrl contains HTML tags
- All imageUrls match pattern `./images/ascendancies/*.png`

#### SECTION 4: Tiers
- Every ascendancy has exactly 5 tiers
- Tiers are numbered 1 through 5
- Every tier has at least 1 bonus

#### SECTION 5: Bonus text quality
- No bonus contains HTML tags (`/<[^>]*>/`)
- No bonus has leading/trailing whitespace
- No bonus contains double spaces
- No bonus contains HTML entities (`&amp;`, `&lt;`, etc.)

#### SECTION 6: Footnotes
- Ascendancies WITH footnotes: Battlemage (1), Bloodmage (1), Awakened (3), Ironbolt (1), Lifebreaker (1), Worldshaper (3), Stance Dancer (2), Nomad (1), Berserker (1)
- Ascendancies WITHOUT footnotes: Blademaster, Arcanist, Starborn, Soul Warden, Sharpshooter, Mana Warden
- No footnote contains HTML tags
- No footnote has leading/trailing whitespace
- Footnotes start with `*`

#### SECTION 7: Known item verification
- **Battlemage**: name, imageUrl contains "battlemage", 5 tiers, tier 1 bonuses include "+1 to Class Skill Levels", has 1 footnote about "Total Defense Bonus"
- **Awakened**: has 3 footnotes
- **Worldshaper**: has 3 footnotes
- **Ironbolt**: tier 3 has bonuses (tests the missing `<br><br>` separator edge case)

#### SECTION 8: Data snapshot counts
- Log total count, count with footnotes, count without footnotes (for tracking ESR updates)

#### SECTION 9: Edge cases (synthetic HTML)
- Empty HTML returns empty array
- HTML with no flex divs returns empty array

### Integration Test

**File:** `src/features/data-sync/ascendancies.integration.test.ts`

Follow the `mythicalUniques.integration.test.ts` pattern.

#### Setup
- Read fixture `test-fixtures/ascendancies.htm`
- Create a `TestDb` with `ascendancies: 'name'` store
- `beforeAll`: parse and `bulkPut`
- `afterAll`: delete test DB

#### SECTION 1: Parse → Store → Query round-trip
- Store all parsed items, verify count matches (15)
- Query by name: retrieve "Battlemage", verify it exists

#### SECTION 2: Known item verification from DB
- Retrieve Battlemage by name, verify all fields (name, imageUrl, 5 tiers, footnotes)
- Retrieve Worldshaper, verify 3 footnotes present
- Retrieve Awakened, verify 3 footnotes present

#### SECTION 3: Data integrity
- All stored items have `name` as primary key
- All stored items preserve `tiers` and `footnotes` arrays
- All tiers have `bonuses` arrays

#### SECTION 4: Data snapshot counts
- Log total, with footnotes count, without footnotes count

## Implementation Order

### Step 1: Foundation (no dependencies)
1. `src/core/db/models.ts` — add `Ascendancy` and `AscendancyTier` interfaces
2. `src/core/db/db.ts` — add `ascendancies` table, bump version to 12
3. `src/core/api/remoteConfig.ts` — add ascendancies URL
4. `src/core/api/ascendanciesApi.ts` — create fetch function
5. `src/core/api/index.ts` — add export
6. `scripts/fetch-test-fixtures.js` — add fixture entry
7. Run `npm run test:fixtures` to download `test-fixtures/ascendancies.htm`

### Step 2: Parser
8. `src/features/data-sync/parsers/ascendanciesParser.ts` — create parser
9. `src/features/data-sync/parsers/index.ts` — add export

### Step 3: Parser tests
10. `src/features/data-sync/parsers/ascendanciesParser.test.ts` — unit tests
11. Run tests, iterate on parser until all pass

### Step 4: Data sync integration
12. `src/features/data-sync/interfaces/ParsedData.ts` — add `ascendancies` field
13. `src/features/data-sync/store/dataSyncSlice.ts` — add `ascendanciesHtml` to `FetchedHtmlData`
14. `src/features/data-sync/store/dataSyncSaga.ts` — wire up fetch/parse/store
15. `src/features/data-sync/store/startupSaga.ts` — add migration check

### Step 5: Integration test
16. `src/features/data-sync/ascendancies.integration.test.ts` — create
17. Run tests, verify round-trip works

### Step 6: Feature page
18. `src/features/ascendancies/store/ascendanciesSlice.ts` — Redux slice
19. `src/features/ascendancies/utils/filteringHelpers.ts` — filter logic
20. `src/features/ascendancies/hooks/useFilteredAscendancies.ts` — main hook
21. `src/features/ascendancies/hooks/useUrlInitialize.ts` — URL → Redux
22. `src/features/ascendancies/hooks/useShareUrl.ts` — Redux → URL
23. `src/features/ascendancies/components/AscendancyCard.tsx` — card component
24. `src/features/ascendancies/components/AscendancyFilters.tsx` — filters
25. `src/features/ascendancies/screens/AscendanciesScreen.tsx` — page
26. `src/features/ascendancies/index.ts` — exports

### Step 7: App integration
27. `src/core/components/Header.tsx` — add nav item
28. `src/core/router/index.tsx` — add route
29. `src/core/store/store.ts` — add reducer

### Step 8: Verify
30. Run `npm run build` — verify no TypeScript errors
31. Run `npm run test` — verify all tests pass
32. Run `npm run dev` — verify page works, search works, URL sharing works
33. Test with real data in the browser — verify all 15 ascendancies display correctly

## Files Summary

### New Files (16)

| File | Purpose |
|------|---------|
| `src/core/api/ascendanciesApi.ts` | Fetch function |
| `src/features/data-sync/parsers/ascendanciesParser.ts` | HTML parser |
| `src/features/data-sync/parsers/ascendanciesParser.test.ts` | Parser unit tests |
| `src/features/data-sync/ascendancies.integration.test.ts` | Integration test |
| `src/features/ascendancies/index.ts` | Feature exports |
| `src/features/ascendancies/store/ascendanciesSlice.ts` | Redux slice |
| `src/features/ascendancies/utils/filteringHelpers.ts` | Filter/search logic |
| `src/features/ascendancies/hooks/useFilteredAscendancies.ts` | Main filtering hook |
| `src/features/ascendancies/hooks/useUrlInitialize.ts` | URL → Redux init |
| `src/features/ascendancies/hooks/useShareUrl.ts` | Redux → share URL |
| `src/features/ascendancies/components/AscendancyCard.tsx` | Card component |
| `src/features/ascendancies/components/AscendancyFilters.tsx` | Filter bar |
| `src/features/ascendancies/screens/AscendanciesScreen.tsx` | Page component |
| `src/features/ascendancies/screens/index.ts` | Screen re-export |
| `src/features/ascendancies/types/index.ts` | Type re-exports |
| `test-fixtures/ascendancies.htm` | Test fixture (downloaded) |

### Modified Files (11)

| File | Change |
|------|--------|
| `src/core/db/models.ts` | Add `Ascendancy`, `AscendancyTier` interfaces |
| `src/core/db/db.ts` | Add `ascendancies` table, bump version 11→12 |
| `src/core/api/remoteConfig.ts` | Add ascendancies URL |
| `src/core/api/index.ts` | Add `fetchAscendanciesHtml` export |
| `src/features/data-sync/parsers/index.ts` | Add `parseAscendancies` export |
| `src/features/data-sync/interfaces/ParsedData.ts` | Add `ascendancies` field |
| `src/features/data-sync/store/dataSyncSlice.ts` | Add `ascendanciesHtml` to `FetchedHtmlData` |
| `src/features/data-sync/store/dataSyncSaga.ts` | Wire fetch/parse/store for ascendancies |
| `src/features/data-sync/store/startupSaga.ts` | Add migration check for empty table |
| `src/core/components/Header.tsx` | Add "Ascendancies" to `NAV_ITEMS` |
| `src/core/router/index.tsx` | Add `/ascendancies` route |
| `src/core/store/store.ts` | Add `ascendancies` reducer |
| `scripts/fetch-test-fixtures.js` | Add ascendancies.htm to fixture list |
