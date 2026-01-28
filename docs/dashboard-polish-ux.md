# Dashboard UX Polish

Polished dashboard with improved usability, German localization, and comprehensive accessibility.

## Features

### Header
- Period info: "Zeitraum: letzte 24 h · Vergleich: Vortag"
- Command palette (⌘K) for quick actions
- No global search (moved to local table search)

### KPI Row
- **4 Compact Cards**: Anfragen, Erfolgsrate, Ø Zeit, Fehlerquote
- **Trend Indicators**: +/- percentage vs. yesterday with colored icons
- **Tooltips**: Hover explanations for each metric
- **Click-through**: Navigate to filtered agents view
- **German Formatting**: 5,4 Tsd., 96,8 %, 1,2 s

### Activity List (Left Column - 7/12)
- **German Titles**: "bereitgestellt", "erkannt", "behoben"
- **Filter Chips**: Alle, Fehler, Rate-Limit, Deploy, Spike
- **Severity Coloring**: Error (high/medium), Rate-Limit, Deploy, Spike
- **Time Badges**: "vor 15 Min.", "vor 2 Std."
- **Keyboard Navigation**: Arrow keys, role="feed"

### Agents Table (Right Column - 5/12)
- **Local Search**: `/` hotkey, filters by name/tags with live region
- **Sortable Columns**: Name, Anfragen, Erfolg %, Ø Zeit with aria-sort
- **Row Click**: Enter/Space to open agent details
- **Status Chips**: ● OK, △ Eingeschränkt, ✖ Fehler with tooltips
- **German Numbers**: Tabular numerals, right-aligned
- **Live Region**: "N Agents gefunden" for screen readers

## Layout

- **12-Column Grid**: Activity (7 cols), Agents (5 cols) on ≥xl
- **Responsive**: Stacks on ≤md
- **Compact Density**: 44-48px row height
- **Border-first**: Hairline borders, subtle shadows

## Accessibility

- **Landmarks**: role="banner", role="main", aria-labelledby
- **Live Regions**: role="status" aria-live="polite" for search results
- **Keyboard**: `/` → search, ⌘K → palette, Enter/Space → row select
- **Reduced Motion**: motion-safe/motion-reduce classes
- **Screen Reader**: All interactive elements have aria-labels

## Components

### `HeaderClassic.tsx`
Small header with period/comparison info + command palette button.

### `KpiRowClassic.tsx`
4 KPI cards with tooltips, trends, and router.push() click-through.

### `ActivityList.tsx`
Feed with filter chips, severity badges, and German time formatting.

### `AgentsSnapshotTable.tsx`
Sortable table with local search, row-click, status chips, and live region.

### `StatusChip.tsx`
Icon-only status chips (●/△/✖) with AA-compliant colors and tooltips.

## Formatters (`lib/format/number.ts`)

```typescript
formatThousandsDE(5400) // "5,4 Tsd."
formatPercentDE(96.8)   // "96,8 %"
formatMsToSecOneDecimal(1200) // "1,2 s"
formatTrendDE(4.5)      // "+4,5 %"
formatRelativeTime(iso) // "vor 15 Min."
```

## Tests

### Vitest (`tests/unit/formatters.spec.ts`)
- Number formatters (Tsd., Mio., %, s)
- Trend formatting (+/-)
- Relative time (Min., Std., Tagen)

### Playwright (`tests/ui/dashboard-polish.spec.ts`)
- Header period info visible
- `/` focuses table search
- Filter chips work
- Sort indicators + aria-sort
- Row click opens agent
- Live region announces results

## Usage

```bash
npm run dev          # Start dev server
npm run test:unit    # Run Vitest tests
npx playwright test tests/ui/dashboard-polish.spec.ts
```

## Migration

From classic dashboard:
1. Remove global search state (now local to table)
2. Update KPI metrics to include `trends` object
3. Update Activity titles to German
4. Use 12-column grid: `xl:grid-cols-12`, `xl:col-span-7/5`

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Screen readers (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation
- Reduced motion respected

---

**Branch**: `feat/dashboard-polish-ux`
**Version**: 1.0.0
**Date**: 2025-10-23
