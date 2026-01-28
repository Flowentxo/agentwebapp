# Sintra App Shell & Dashboard

Production-ready Sintra.ai-style application shell with polished dashboard components.

## Overview

Complete implementation of a modern, accessible application shell inspired by Sintra.ai's design system. Features a collapsible sidebar navigation, command palette, and fully styled dashboard with German localization.

## Architecture

### App Shell Structure

```
app/(app)/
├── layout.tsx          # Shell wrapper (Sidebar + Topbar)
├── dashboard/
│   └── page.tsx        # Dashboard page content
└── [other-pages]/      # Other app pages
```

### Component Hierarchy

- **AppShell** (`app/(app)/layout.tsx`)
  - **Sidebar** (`components/shell/Sidebar.tsx`)
    - **NavItem** (`components/shell/NavItem.tsx`)
  - **Topbar** (`components/shell/Topbar.tsx`)
  - **Main Content** (children)

## Design System

### Color Tokens

```css
--surface-0: 16 16 20   /* Background with radial gradient */
--surface-1: 23 23 28   /* Panel backgrounds */
--surface-2: 30 30 36   /* Elevated surfaces */
--accent: 139 92 246    /* Purple accent (#8b5cf6) */
--hairline: 255 255 255 / 0.06  /* Subtle borders */
--text: 232 232 237     /* Main text */
--text-muted: 160 160 170  /* Muted text */
```

### Visual Style

- **Border-first design**: 1px hairlines instead of heavy shadows
- **Radial gradients**: Subtle purple/blue overlays (max 2% opacity)
- **Compact density**: 44-48px row height
- **Accent glow**: Active states with soft shadow
- **Monospace numbers**: Tabular-nums for data alignment

### Utility Classes

- `.panel` - Panel with border, rounded corners, inset highlight
- `.hairline-b/t/l/r` - 1px hairline borders
- `.text-text` - Main text color
- `.text-text-muted` - Muted text color
- `.mono` - Tabular numbers (font-variant-numeric)
- `.sr-only` - Screen reader only content

## Components

### Sidebar (`components/shell/Sidebar.tsx`)

**Features:**
- Width: 280px expanded, 80px collapsed
- Collapsible with button + keyboard support
- Arrow key navigation (↑/↓)
- Active state with left accent bar + glow
- Tooltips in collapsed mode
- Sections: Core (Dashboard, Agents, Workflows, Knowledge) + Management (Analytics, Board, Admin, Settings)

**Usage:**
```tsx
<Sidebar />
```

**Keyboard:**
- `↑` / `↓` - Navigate items
- `Enter` - Activate item
- `Tab` - Focus collapse button

### Topbar (`components/shell/Topbar.tsx`)

**Features:**
- Sticky header with breadcrumb navigation
- Command palette button (⌘K / Ctrl+K)
- User dropdown menu (Profile, Settings, Logout)
- Hairline bottom border
- German path labels

**Usage:**
```tsx
<Topbar />
```

**Keyboard:**
- `⌘K` / `Ctrl+K` - Open command palette
- `Esc` - Close command palette

### NavItem (`components/shell/NavItem.tsx`)

**Features:**
- Active state with `aria-current="page"`
- Left accent bar with glow effect on active
- Icon (16px) + label
- Tooltip support for collapsed sidebar

**Props:**
```tsx
interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  isCollapsed: boolean;
}
```

### KpiRowClassic (`components/dashboard/KpiRowClassic.tsx`)

**Features:**
- 4 KPI cards (Anfragen, Erfolgsrate, Ø Zeit, Fehlerquote)
- Trend indicators (+/- with icons)
- Click-through to filtered agents view
- German number formatting
- Tooltips for explanations

**Metrics:**
```tsx
interface KpiMetrics {
  requests24h: number;
  successPct24h: number;
  avgTimeSec24h: number;
  errorPct24h: number;
  trends: {
    requests: number;
    success: number;
    avgTime: number;
    error: number;
  };
}
```

### ActivityList (`components/dashboard/ActivityList.tsx`)

**Features:**
- Activity feed with German titles
- Filter chips (Alle, Fehler, Rate-Limit, Deploy, Spike)
- Severity coloring (high/medium/low)
- Time badges (vor 15 Min., vor 2 Std.)
- Icon-coded activity types

**Activity Types:**
- `deploy` - Rocket icon, success color
- `error` - Alert icon, error/warning color by severity
- `spike` - Trending icon, primary color
- `rate_limit` - Zap icon, warning color

### AgentsSnapshotTable (`components/dashboard/AgentsSnapshotTable.tsx`)

**Features:**
- Local search with `/` hotkey
- Sortable columns (Name, Requests, Success %, Ø Zeit)
- Row click to open agent (Enter/Space)
- Status chips (● OK, △ Eingeschränkt, ✖ Fehler)
- German number formatting
- Live region for search results
- Top 10 agents shown

**Agent Interface:**
```tsx
interface Agent {
  id: string;
  name: string;
  status: 'ok' | 'degraded' | 'error';
  requests24h: number;
  successRate24h: number;
  avgTimeMs24h: number;
  tags?: string[];
  buildStatus?: 'complete' | 'incomplete' | 'deprecated';
  state?: 'ready' | 'draft';
  isComplete?: boolean;
}
```

## Persistence

### Sidebar Collapsed State

The sidebar collapsed state persists across:
- Page navigation
- Browser refreshes
- Tab switches

**localStorage key:** `ui.sidebarCollapsed`

**Default behavior:**
- Desktop (≥ lg): Expanded by default
- Collapses only when user clicks toggle button
- State is restored on page load (no flash)

**Implementation:**
```tsx
// Read from localStorage on mount (SSR-safe)
const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  return getLS('ui.sidebarCollapsed', false);
});

// Persist to localStorage on change
useEffect(() => {
  setLS('ui.sidebarCollapsed', sidebarCollapsed);
}, [sidebarCollapsed]);
```

## Responsive Behavior

### Desktop (≥ lg breakpoint: 1024px)

- **Sidebar**: Fixed navigation, 280px wide (expanded) or 80px (collapsed)
- **Toggle button**: Collapses/expands sidebar in place
- **Tooltips**: Shown only when collapsed
- **Navigation**: Always visible

### Mobile (< lg breakpoint)

- **Sidebar**: Hidden by default, shows as overlay modal when opened
- **Hamburger button**: Opens sidebar overlay (in Topbar)
- **Backdrop**: Dimmed background with blur, click to close
- **Overlay**: Full-height slide-in from left, 280px wide
- **Focus trap**: Tab cycles through nav items only
- **Close actions**: Close button, ESC key, backdrop click, or nav item click

## Accessibility

### Landmarks

- `<nav role="navigation" aria-label="Hauptnavigation">` - Sidebar
- `<aside role="dialog" aria-modal="true">` - Mobile sidebar overlay
- `<header role="banner">` - Topbar
- `<main role="main">` - Page content
- `<section aria-labelledby="...">` - Dashboard sections

### Keyboard Navigation

| Action | Shortcut | Context |
|--------|----------|---------|
| Navigate sidebar items | ↑ / ↓ | When nav item focused |
| Activate nav item | Enter | When nav item focused |
| Collapse/expand sidebar | Click toggle button | Desktop only |
| Open sidebar overlay | Click hamburger | Mobile only |
| Close sidebar overlay | Esc | Mobile overlay open |
| Focus table search | `/` | When no input focused |
| Open command palette | ⌘K / Ctrl+K | Global |
| Close command palette | Esc | Palette open |
| Navigate palette options | ↑ / ↓ | Palette open |
| Select palette option | Enter | Palette open |
| Select table row | Enter / Space | When row focused |
| Sort table column | Click or Enter on header | Table visible |

### Focus Management

**Sidebar Collapse/Expand:**
- Focus remains on toggle button after state change

**Mobile Overlay:**
- Opening: Focus moves to close button in overlay
- Closing: Focus returns to hamburger button (if opened via hamburger)
- Focus trap: Tab cycles through nav items, close button, and footer links

**Command Palette:**
- Opening: Focus moves to search input
- Closing: Focus returns to trigger element (button or last focused element)
- Keyboard navigation: Arrow keys navigate options, Enter selects

**Table Search:**
- `/` key focuses search input (only when no other input focused)
- Typing immediately starts filtering
- Live region announces result count after 200ms debounce

### Live Regions

**Table Search Results:**
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

- **Debounce**: 200ms to avoid excessive announcements
- **Polite**: Doesn't interrupt current speech
- **Atomic**: Entire message announced on change

### Screen Reader Support

- All interactive elements have `aria-label` or visible labels
- Status indicators use `role="img"` with `aria-label`
- Live regions announce search results (`role="status" aria-live="polite"`)
- Tables have proper headers with `scope` attributes
- Sortable columns have `aria-sort` attributes

### Motion Reduction

```css
@media (prefers-reduced-motion: reduce) {
  .motion-reduce\:transition-none {
    transition: none !important;
  }
}
```

All transitions respect `prefers-reduced-motion` preference.

## German Localization

### Number Formatting

```typescript
formatThousandsDE(5400)          // "5,4 Tsd."
formatPercentDE(96.8)            // "96,8 %"
formatMsToSecOneDecimal(1200)    // "1,2 s"
formatTrendDE(4.5)               // "+4,5 %"
formatRelativeTime(iso)          // "vor 15 Min."
```

### UI Text

All interface text is in German:
- Navigation: Dashboard, Agents, Workflows, Wissensbasis, Analytics, Board, Admin, Einstellungen
- KPIs: Anfragen (24h), Erfolgsrate (24h), Ø Zeit (24h), Fehlerquote (24h)
- Activity: bereitgestellt, erkannt, behoben, wiederhergestellt
- Time: vor 15 Min., vor 2 Std., vor 3 Tagen, Gerade eben
- Status: OK, Eingeschränkt, Fehler

## Layout

### Dashboard Grid

```tsx
<div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
  {/* Activity - 7 columns */}
  <section className="xl:col-span-7">
    <ActivityList />
  </section>

  {/* Agents - 5 columns */}
  <section className="xl:col-span-5">
    <AgentsSnapshotTable />
  </section>
</div>
```

### Responsive Breakpoints

- Mobile: Single column stack
- Tablet: 2-column KPIs, stacked sections
- Desktop (xl): 4-column KPIs, 12-column grid (7+5)

## Performance

### Optimization Techniques

- **Memoization**: `useMemo` for filtered/sorted data
- **Keyboard debounce**: 300ms for search input
- **Lazy tooltips**: Only render on hover
- **CSS containment**: Isolated paint boundaries
- **Reduced motion**: Skip animations when preferred

### TTI Target

Time to Interactive < 1.5s on desktop (3G connection)

## Testing

### Unit Tests (`tests/unit/formatters.spec.ts`)

- Number formatters (Tsd., Mio., %, s)
- Trend formatting (+/-)
- Relative time (Min., Std., Tagen)

**Run:**
```bash
npm run test:unit
```

### E2E Tests

#### Shell A11y (`tests/ui/shell-a11y.spec.ts`)

- Landmarks (nav, header, main)
- Keyboard navigation (arrow keys)
- Command palette (⌘K)
- Tooltips in collapsed mode
- aria-current on active items
- Focus indicators
- Breadcrumb navigation
- Reduced motion

#### Dashboard A11y (`tests/ui/dashboard-a11y.spec.ts`)

- Section landmarks
- KPI card aria-labels
- Activity feed filters
- Table search (`/` hotkey)
- Sortable columns with aria-sort
- Row keyboard navigation
- Live region announcements
- German formatting

**Run:**
```bash
npx playwright test tests/ui/shell-a11y.spec.ts
npx playwright test tests/ui/dashboard-a11y.spec.ts
```

## Usage

### Development

```bash
npm run dev
# Navigate to http://localhost:3000/dashboard
```

### Build

```bash
npm run build
npm start
```

### Environment

No special environment variables required. All styling is CSS-based with design tokens in `app/globals.css`.

## Browser Support

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Screen readers**: NVDA, JAWS, VoiceOver
- **Keyboard-only navigation**: Full support
- **Reduced motion**: Respected

## Migration Guide

### From Classic Dashboard

1. **Move page to `(app)` route group:**
   ```bash
   mv app/dashboard/page.tsx app/(app)/dashboard/page.tsx
   ```

2. **Remove header/nav from page:**
   ```tsx
   // Before
   <div>
     <Header />
     <Nav />
     <main>{content}</main>
   </div>

   // After
   <div>{content}</div>  // Shell provides header/nav
   ```

3. **Update imports:**
   ```tsx
   // Use existing classic components
   import { KpiRowClassic } from '@/components/dashboard/KpiRowClassic';
   import { ActivityList } from '@/components/dashboard/ActivityList';
   import { AgentsSnapshotTable } from '@/components/dashboard/AgentsSnapshotTable';
   ```

4. **Apply 12-column grid:**
   ```tsx
   <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
     <section className="xl:col-span-7">{/* Activity */}</section>
     <section className="xl:col-span-5">{/* Agents */}</section>
   </div>
   ```

### Adding New Pages

1. Create page in `app/(app)/[page-name]/page.tsx`
2. Add route to Sidebar navigation items
3. Add German label to Topbar path labels

Example:
```tsx
// components/shell/Sidebar.tsx
{
  section: 'Core',
  items: [
    // ...
    { href: '/reports', label: 'Berichte', icon: FileText },
  ],
}

// components/shell/Topbar.tsx
const pathLabels: Record<string, string> = {
  // ...
  '/reports': 'Berichte',
};
```

## Troubleshooting

### Sidebar not collapsing

Check that `useState` for collapse state is working:
```tsx
const [isCollapsed, setIsCollapsed] = useState(false);
```

### Command palette not opening

Verify keyboard event listener is attached:
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandOpen(true);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Tooltips not showing

Ensure shadcn Tooltip component is installed:
```bash
npx shadcn@latest add tooltip
```

### German numbers not formatting

Check that formatters are imported from correct path:
```tsx
import { formatThousandsDE, formatPercentDE } from '@/lib/format/number';
```

## Command Palette

The command palette provides quick access to navigation and actions.

### Opening

- **Keyboard**: ⌘K (Mac) or Ctrl+K (Windows/Linux)
- **Click**: Command button in Topbar

### Available Commands

**Navigation:**
- "Zu Agents wechseln" → `/agents`
- "Zu Workflows wechseln" → `/workflows`
- "Zu Analytics wechseln" → `/analytics`

**Actions:**
- "Nur aktive umschalten" → Emits `ui:toggleActiveFilter` event

**Quick Open Agents:**
- "Agent öffnen: {Name}" → `/agents/{id}`
- Shows all complete agents from `useCompleteAgents()`

### Custom Events

Listen for command palette actions:
```tsx
useEffect(() => {
  const handleToggleActive = () => {
    // Handle toggle active filter
  };

  window.addEventListener('ui:toggleActiveFilter', handleToggleActive);
  return () => window.removeEventListener('ui:toggleActiveFilter', handleToggleActive);
}, []);
```

## Files

### Core Shell
- `app/(app)/layout.tsx` - Shell wrapper with ShellProvider
- `components/shell/ShellContext.tsx` - Context for sidebar state
- `components/shell/Sidebar.tsx` - Sidebar navigation (desktop + mobile overlay)
- `components/shell/NavItem.tsx` - Navigation items with tooltips
- `components/shell/Topbar.tsx` - Top bar with breadcrumb + command palette
- `lib/utils/storage.ts` - localStorage utilities with SSR safety

### Dashboard
- `app/(app)/dashboard/page.tsx` - Dashboard page
- `components/dashboard/KpiRowClassic.tsx` - KPI cards
- `components/dashboard/ActivityList.tsx` - Activity feed
- `components/dashboard/AgentsSnapshotTable.tsx` - Agents table
- `components/common/StatusChip.tsx` - Status indicators

### Utilities
- `app/globals.css` - Design tokens and utilities
- `lib/format/number.ts` - German formatters
- `lib/hooks/useDashboardClassic.ts` - Dashboard metrics hook
- `lib/agents/useCompleteAgents.ts` - Complete agents filter

### Tests
- `tests/unit/storage.spec.ts` - localStorage utilities tests
- `tests/unit/formatters.spec.ts` - Formatter unit tests
- `tests/ui/shell-a11y.spec.ts` - Shell accessibility E2E tests
- `tests/ui/shell-persistence.spec.ts` - Sidebar persistence & responsive E2E tests
- `tests/ui/dashboard-a11y.spec.ts` - Dashboard accessibility E2E tests

## Credits

Design inspired by [Sintra.ai](https://sintra.ai) with focus on:
- Border-first design language
- Subtle radial gradients
- Compact, information-dense layouts
- Production-grade accessibility

---

**Branch**: `feat/ui-sintra-shell-dashboard`
**Version**: 1.0.0
**Date**: 2025-10-23
**Status**: Production Ready ✓
