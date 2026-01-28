# Dashboard Parity V2 – Sintra-Level Quality

> Elevating the existing dashboard with visual parity, consistent design tokens, enhanced accessibility, and production-ready polish inspired by Sintra.ai

---

## Overview

Dashboard Parity V2 refactors the existing dashboard components to match the quality and attention to detail seen in Sintra.ai, while maintaining full functionality and accessibility. This update focuses on:

- **Visual Parity**: Border-first panels, unified PanelHeader component, consistent typography
- **Better Data Presentation**: Larger KPI values, trend chips with icons, enhanced tooltips
- **Improved Interactivity**: Filter chips, empty states, sticky headers, zebra hover
- **Loading States**: Shimmer skeleton animations with reduced-motion support
- **Full Accessibility**: ARIA attributes, keyboard navigation, focus management, live regions
- **Subtle Aesthetics**: Refined gradients (2-3% intensity), consistent spacing, AA-compliant colors

---

## Before/After Comparison

### Before: Dashboard V1

**KPI Cards:**
- Basic panel with padding: `p-6`
- Standard text sizes: `text-xl`
- Inline trend percentages without icons
- No info tooltips
- Generic hover states

**Activity List:**
- Basic title and subtitle in panel
- Large filter buttons
- No empty state illustration
- Variable row heights

**Top Agents Table:**
- Standard header with title in panel
- No sticky header
- Basic hover state
- Search input without panel header

### After: Dashboard Parity V2

**KPI Cards:**
- Border-first panel with `p-0` overflow-hidden
- PanelHeader component with info tooltip
- Large values: `text-3xl md:text-4xl`
- Trend chips with colored borders, icons (TrendingUp/TrendingDown)
- Enhanced hover state with subtle accent glow
- Skeleton loading with shimmer animation

**Activity List:**
- PanelHeader with title, subtitle, and info
- Compact filter chips: `h-6` with rounded-full styling
- Empty state with illustration and helper text
- Fixed 48px row height
- Role="feed" for accessibility

**Top Agents Table:**
- PanelHeader with count subtitle and info tooltip
- Actions slot with "Alle Agents ansehen" button
- Sticky header with `backdrop-blur-[2px]`
- Zebra striping: `even:hover:bg-white/[0.02]`
- Enhanced sort headers with hover states
- Live region with 200ms debounce

---

## Design Tokens Used

### Color Variables

```css
/* Core Surface Layers */
--surface-0: 16 16 20;   /* Background */
--surface-1: 23 23 28;   /* Main panels */
--surface-2: 30 30 36;   /* Subsections */

/* Text Hierarchy */
--text: 232 232 237;          /* Primary text */
--text-muted: 160 160 170;    /* Secondary text */

/* Accent & Status */
--accent: 262 83% 68%;         /* Primary indigo/violet */
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;

/* Borders */
--hairline: 255 255 255 / 0.06;  /* Ultra-subtle borders */
--border: 240 8% 22%;             /* Standard borders */
```

### Spacing & Typography

- **Panel padding**: `p-0` on container, `px-5 py-4` on content
- **Chip height**: `h-6` (24px) for filter chips
- **Icon size**: `h-4 w-4` (16px) consistently across all components
- **KPI values**: `text-3xl md:text-4xl` (30px → 36px responsive)
- **Row height**: `48px` fixed for activity items and table rows
- **Border radius**: `rounded-lg` (16px), `rounded-full` for chips

### Shadows & Elevation

```css
/* Panel base */
box-shadow: 0 10px 30px hsl(var(--e1)); /* --e1: 0 0% 0% / 0.25 */

/* Panel hover enhancement */
box-shadow:
  inset 0 1px 0 0 rgba(255,255,255,0.06),
  0 0 0 1px rgba(var(--accent),0.1);
```

---

## Components

### 1. PanelHeader Component

**File:** `components/common/PanelHeader.tsx`

Reusable component for consistent panel headers across the dashboard.

**Props:**

```typescript
interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  info?: string;           // Tooltip content
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}
```

**Usage:**

```tsx
<PanelHeader
  title="Top-Agents"
  subtitle="Die 10 aktivsten Agents"
  info="Zeigt die Top 10 Agents sortiert nach Aktivität"
  actions={
    <Link href="/agents">
      Alle Agents ansehen
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  }
/>
```

**Structure:**

- `hairline-b` border separator
- Title: `text-sm font-semibold text-text`
- Subtitle: `text-xs text-text-muted`
- Info icon: 16px button with tooltip on hover
- Actions: Right-aligned slot for buttons/links

---

### 2. KPI Row Classic (Enhanced)

**File:** `components/dashboard/KpiRowClassic.tsx`

Four KPI cards displaying key metrics with trends.

**Changes:**

- Replaced manual header with PanelHeader component
- Increased value size from `text-xl` to `text-3xl md:text-4xl`
- Added trend chips with colored borders and icons
- Info tooltips explain each metric
- Skeleton loading state with shimmer
- Enhanced hover state with subtle accent glow

**KPI Card Structure:**

```tsx
<button className="panel p-0 hover:shadow-[...]">
  <PanelHeader title="Anfragen" info="..." />
  <div className="px-5 pb-5 pt-4">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <p className="mono text-3xl font-semibold md:text-4xl">
          {formatThousandsDE(value)}
        </p>
      </div>
      <div className="rounded-full border px-2 py-1 ...">
        <TrendingUp className="h-3.5 w-3.5" />
        <span className="mono">{formatTrendDE(trend)}</span>
      </div>
    </div>
    <p className="text-xs text-text-muted">ggü. gestern</p>
  </div>
</button>
```

**Trend Chip Colors:**

- **Positive trend**: `border-[rgb(var(--accent))]/20 bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]`
- **Negative trend**: `border-[oklch(70%_0.2_25)]/20 bg-[oklch(70%_0.2_25)]/10 text-[oklch(70%_0.2_25)]`

---

### 3. Activity List (Enhanced)

**File:** `components/dashboard/ActivityList.tsx`

Feed of recent activities and incidents with filtering.

**Changes:**

- PanelHeader with subtitle "Letzte 24 Stunden" and info tooltip
- Filter chips reduced to `h-6` (chip-xs)
- Empty state with FileQuestion icon and helper text
- Skeleton loading with shimmer
- Fixed 48px row height
- Maintains role="feed" for accessibility

**Filter Chip Structure:**

```tsx
<button
  className={`h-6 rounded-full border px-2.5 text-xs ${
    active
      ? 'border-[rgb(var(--accent))]/50 bg-[rgb(var(--accent))]/20 text-text'
      : 'border-white/10 bg-white/5 text-text-muted hover:bg-white/10'
  }`}
  aria-pressed={active}
>
  {label}
</button>
```

**Empty State:**

```tsx
<div className="flex flex-col items-center justify-center gap-3 p-8">
  <div className="h-12 w-12 rounded-full border border-white/10 bg-white/5">
    <FileQuestion className="h-6 w-6 text-text-muted" />
  </div>
  <div className="text-center">
    <p className="text-sm font-medium">Keine Aktivitäten gefunden</p>
    <p className="text-xs text-text-muted">
      Es sind keine Ereignisse für diesen Filter vorhanden.
    </p>
  </div>
</div>
```

---

### 4. Agents Snapshot Table (Enhanced)

**File:** `components/dashboard/AgentsSnapshotTable.tsx`

Top 10 agents table with search, sort, and navigation.

**Changes:**

- PanelHeader with dynamic subtitle showing count
- Actions slot with "Alle Agents ansehen" button
- Search input moved inside panel padding
- Sticky header: `sticky top-0 z-10 bg-[rgb(var(--surface-1))] backdrop-blur-[2px]`
- Enhanced sort headers with hover states
- Zebra striping: `even:hover:bg-white/[0.02]`
- Live region with 200ms debounce
- Maintains "/" keyboard shortcut for search focus

**Sticky Header:**

```tsx
<thead>
  <tr className="sticky top-0 z-10 bg-[rgb(var(--surface-1))] backdrop-blur-[2px] hairline-b">
    <th
      className="pb-3 pr-4 cursor-pointer hover:text-text transition-colors"
      onClick={() => handleSort('name')}
      aria-sort={getAriaSort('name')}
    >
      <div className="flex items-center gap-1">
        Agent
        {getSortIndicator('name')}
      </div>
    </th>
    ...
  </tr>
</thead>
```

**Zebra Row:**

```tsx
<tr
  className="hairline-b cursor-pointer hover:bg-white/5 even:hover:bg-white/[0.02]"
  style={{ height: '48px' }}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleRowClick(id)}
>
  ...
</tr>
```

---

### 5. Skeleton Loading States

**File:** `app/globals.css`

Shimmer animation for loading states with reduced-motion support.

**Keyframe Animation:**

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes shimmer {
    0%, 100% {
      background-position: 0 0;
    }
  }
}
```

**Skeleton Utility Class:**

```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: rgba(255, 255, 255, 0.04);
  }
}
```

**Usage in Components:**

```tsx
function KpiCardSkeleton() {
  return (
    <div className="panel p-0">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-8 w-24 rounded" />
          </div>
        </div>
        <div className="skeleton mt-3 h-3 w-24 rounded" />
      </div>
    </div>
  );
}
```

---

### 6. Background Gradient Refinement

**File:** `app/globals.css`

Subtle radial gradient overlay increased from 2% to 3% intensity.

**Before:**

```css
.bg-surface-0 {
  background: radial-gradient(
    ellipse 1400px 900px at 10% -5%,
    rgba(139, 92, 246, 0.02),  /* 2% */
    transparent 50%
  ),
  radial-gradient(
    ellipse 1200px 800px at 95% 100%,
    rgba(59, 130, 246, 0.015), /* 1.5% */
    transparent 55%
  ),
  rgb(var(--surface-0));
}
```

**After:**

```css
.bg-surface-0 {
  background: radial-gradient(
    ellipse 1400px 900px at 10% -5%,
    rgba(139, 92, 246, 0.03),  /* 3% */
    transparent 50%
  ),
  radial-gradient(
    ellipse 1200px 800px at 95% 100%,
    rgba(59, 130, 246, 0.025), /* 2.5% */
    transparent 55%
  ),
  rgb(var(--surface-0));
}
```

---

## Keyboard Navigation Map

| Component | Key | Action |
|-----------|-----|--------|
| **KPI Cards** | Tab | Navigate between cards |
| | Enter | Navigate to detailed view |
| **Activity List** | Tab | Focus filter chips sequentially |
| | Enter/Space | Toggle filter chip |
| **Top Agents Table** | / | Focus search input |
| | Tab | Navigate through table rows |
| | Enter | Open agent details |
| | Click on header | Sort by column |
| **All Panels** | Escape | Clear focus (if applicable) |

---

## Accessibility Features

### ARIA Attributes

**PanelHeader Info Tooltip:**

```tsx
<button aria-label={`Information: ${info}`}>
  <Info className="h-3 w-3" />
</button>
```

**Activity Filter Chips:**

```tsx
<button aria-pressed={isActive}>
  {label}
</button>
```

**Table Sort Headers:**

```tsx
<th
  aria-sort={sortColumn === 'name' ? sortDirection : 'none'}
  onClick={() => handleSort('name')}
>
  Agent
</th>
```

**Live Region (Search Results):**

```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {filteredAgents.length} Agents gefunden
</div>
```

### Focus Management

- **Focus rings**: All interactive elements have visible focus indicators
- **Focus restoration**: Focus returns to trigger element after tooltip closes
- **Tab order**: Logical tab order throughout all panels
- **Skip to content**: Screen reader users can navigate directly to feed/table content

### Screen Reader Support

- **Landmarks**: Panels use `role="group"` for logical sections
- **Live regions**: Debounced announcements prevent spam
- **Descriptive labels**: All buttons and inputs have clear aria-labels
- **Status updates**: Activity feed uses `role="feed"` for stream updates

### Reduced Motion

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: rgba(255, 255, 255, 0.04);
  }

  .motion-reduce\:transition-none {
    transition: none !important;
  }
}
```

Components use `motion-safe:duration-200 motion-reduce:transition-none` classes.

---

## Component Usage Examples

### Basic Dashboard Page

```tsx
import { KpiRowClassic } from '@/components/dashboard/KpiRowClassic';
import { ActivityList } from '@/components/dashboard/ActivityList';
import { AgentsSnapshotTable } from '@/components/dashboard/AgentsSnapshotTable';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch data...
    setIsLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <KpiRowClassic metrics={kpiData} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityList items={activities} isLoading={isLoading} />
        <AgentsSnapshotTable agents={topAgents} onOpen={handleAgentOpen} />
      </div>
    </div>
  );
}
```

### Custom PanelHeader

```tsx
<div className="panel p-0">
  <PanelHeader
    title="Custom Panel"
    subtitle="Additional context"
    info="Detailed explanation for tooltip"
    actions={
      <>
        <button className="btn-soft px-3 py-1.5">
          Action 1
        </button>
        <button className="btn-soft px-3 py-1.5">
          Action 2
        </button>
      </>
    }
  >
    {/* Optional children below subtitle */}
    <div className="mt-2">
      <span className="pill px-2 py-1 text-xs">Custom content</span>
    </div>
  </PanelHeader>

  <div className="px-5 py-4">
    {/* Panel content */}
  </div>
</div>
```

---

## Testing

### Playwright E2E Tests

**File:** `tests/ui/dashboard-parity-v2.spec.ts`

**Coverage:**

- PanelHeader renders in all panels
- Info tooltips appear on hover
- Filter chips toggle active state
- Empty state renders when no results
- Sticky header remains visible on scroll
- Sort headers update ARIA attributes
- Keyboard navigation works (/, Enter, Tab)
- Live region announces search results
- Skeleton loaders appear during loading
- Reduced motion is respected

**Run tests:**

```bash
npm run test:e2e
# or
npx playwright test tests/ui/dashboard-parity-v2.spec.ts
```

### Vitest Unit Tests

**File:** `tests/unit/formatters.parity-v2.spec.ts`

**Coverage:**

- `formatThousandsDE`: German thousand separators, edge cases
- `formatPercentDE`: Decimal formatting, rounding
- `formatMsToSecOneDecimal`: ms to seconds conversion
- `formatTrendDE`: Positive/negative trends with signs
- Edge cases: Infinity, NaN, very large/small numbers
- Performance: 40,000 operations in <1s

**Run tests:**

```bash
npm run test:unit
# or
npx vitest tests/unit/formatters.parity-v2.spec.ts
```

---

## Migration Guide

### From Dashboard V1 to V2

**Step 1: Update KPI Cards**

Replace manual headers with PanelHeader:

```tsx
// Before
<div className="panel p-6">
  <h3 className="text-sm font-semibold">Anfragen</h3>
  <p className="text-xl">{value}</p>
</div>

// After
<button className="panel p-0">
  <PanelHeader title="Anfragen" info="..." />
  <div className="px-5 pb-5 pt-4">
    <p className="mono text-3xl md:text-4xl">{value}</p>
  </div>
</button>
```

**Step 2: Update Activity List**

Add PanelHeader, reduce filter chip size, add empty state:

```tsx
// Before
<div className="panel p-6">
  <h3>Aktivität</h3>
  <button className="h-8">Alle</button>
</div>

// After
<div className="panel p-0">
  <PanelHeader title="Aktivität & Incidents" subtitle="Letzte 24 Stunden" info="..." />
  <div className="px-5 py-4">
    <button className="h-6 rounded-full px-2.5 text-xs">Alle</button>
    {items.length === 0 && <EmptyState />}
  </div>
</div>
```

**Step 3: Update Top Agents Table**

Add PanelHeader, sticky header, zebra striping:

```tsx
// Before
<div className="panel p-6">
  <h3>Top-Agents</h3>
  <table>
    <thead>
      <tr className="hairline-b">...</tr>
    </thead>
  </table>
</div>

// After
<div className="panel p-0">
  <PanelHeader title="Top-Agents" subtitle="Die 10 aktivsten" actions={...} />
  <div className="px-5 py-4">
    <table>
      <thead>
        <tr className="sticky top-0 backdrop-blur-[2px] hairline-b">...</tr>
      </thead>
      <tbody>
        <tr className="hover:bg-white/5 even:hover:bg-white/[0.02]">...</tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## Performance Considerations

### Rendering Optimizations

- **Skeleton loaders**: Prevent layout shift during loading
- **Fixed heights**: Activity rows (48px) and consistent spacing prevent reflow
- **Debouncing**: Search input debounced at 200ms to reduce re-renders
- **Memoization**: Filter/sort logic uses `useMemo` to prevent unnecessary recalculations

### Animation Performance

- **CSS transforms**: Use GPU-accelerated transforms for hover states
- **Reduced motion**: Disable animations for users with motion sensitivity
- **Shimmer animation**: Lightweight gradient shift, respects reduced-motion

### Bundle Size

- **Shared components**: PanelHeader reused across all panels
- **Tree shaking**: Only import needed icons from lucide-react
- **No external dependencies**: All formatters are pure functions

---

## Browser Support

**Tested and supported:**

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

**Features requiring modern browser:**

- CSS `backdrop-filter` (sticky header blur)
- CSS Grid and Flexbox
- CSS custom properties (CSS variables)
- `prefers-reduced-motion` media query

**Graceful degradation:**

- Blur effects fall back to solid background
- Animations disabled in reduced-motion mode
- Grid layouts fall back to single column on narrow screens

---

## Future Enhancements

### Potential improvements for V3:

1. **Real-time updates**: WebSocket integration for live KPI updates
2. **Custom date ranges**: User-selectable time periods (7d, 30d, custom)
3. **Export functionality**: Download activity log or agents table as CSV
4. **Dark/light mode toggle**: User preference for theme
5. **Customizable dashboards**: Drag-and-drop panel reordering
6. **Advanced filtering**: Multi-select filters, date range picker
7. **Agent comparison**: Side-by-side comparison of multiple agents
8. **Historical trends**: Sparkline charts in KPI cards
9. **Notifications**: Toast notifications for critical incidents
10. **Responsive improvements**: Enhanced mobile layouts

---

## Troubleshooting

### Issue: Skeleton loaders flicker

**Solution:** Ensure `isLoading` state is properly initialized:

```tsx
const [isLoading, setIsLoading] = useState(true);
```

### Issue: Sticky header doesn't blur

**Solution:** Check browser support for `backdrop-filter`. Add fallback:

```css
@supports not (backdrop-filter: blur(2px)) {
  .sticky-header {
    background: rgb(var(--surface-1));
  }
}
```

### Issue: Trend chips not showing correct color

**Solution:** Ensure trend values are numbers, not strings:

```tsx
// Wrong
trend: "0.05"

// Correct
trend: 0.05
```

### Issue: Live region announces too frequently

**Solution:** Verify 200ms debounce is applied:

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedQuery(searchQuery);
  }, 200);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

---

## Credits & References

**Design inspiration:**
- [Sintra.ai](https://sintra.ai) – Visual design and interaction patterns
- [Linear](https://linear.app) – Keyboard navigation and shortcuts
- [Vercel](https://vercel.com) – Typography and spacing system

**Accessibility guidelines:**
- [WCAG 2.1 Level AA](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

**Tools:**
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)
- [Playwright](https://playwright.dev)
- [Vitest](https://vitest.dev)

---

## Changelog

### v2.0.0 (2025-01-XX)

**Added:**
- PanelHeader component for consistent headers
- Trend chips with colored borders and icons
- Empty state illustrations
- Skeleton loading with shimmer animation
- Sticky table headers with backdrop blur
- Zebra striping on table rows
- Enhanced info tooltips
- Live region debouncing
- Reduced motion support

**Changed:**
- KPI values increased to text-3xl/4xl
- Filter chips reduced to h-6 (chip-xs)
- Activity rows fixed to 48px height
- Background gradient intensity 2% → 3%
- Panel structure from p-6 to p-0 + inner padding

**Improved:**
- Keyboard navigation and focus management
- ARIA attributes and screen reader support
- Typography consistency (16px icons, .mono for numbers)
- Hover and focus states across all components
- German number formatting edge cases

---

## License

MIT License – Part of the Agent System Dashboard project

---

**Questions or feedback?** Open an issue or reach out to the development team.
