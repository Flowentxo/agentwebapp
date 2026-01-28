# Dashboard Refresh - Operations UI

## Überblick

Komplett neues, konsistentes Operations-UI für das Dashboard mit Border-first Design, A11y-First Ansatz und optimierter Performance.

## Features

### ✅ Sticky Header (App-Shell)

**Komponente**: `components/dashboard/DashboardHeader.tsx`

**Links**:
- Titel: "Dashboard"
- Subtitle: "Überblick über Systeme & Metriken"

**Rechts**:
- Globale Suche mit `/` Hotkey
- StatusSummary (OK/Eingeschränkt/Fehler mit Zählern)
- Command Palette Trigger (`⌘K`/`Ctrl+K`)
- "Nur aktive" Toggle

**A11y**:
- `role="banner"` für semantisches Header-Element
- Live Region für Screen Reader (`role="status"`, `aria-live="polite"`)
- Keyboard Navigation (`/` für Suche, `⌘K` für Palette)

---

### ✅ KPI Bar (4 Kacheln)

**Komponente**: `components/dashboard/KpiBar.tsx`

**Metriken**:
1. **Anfragen (24h)** - Totale Anfragen mit Sparkline
2. **Erfolgsrate (24h)** - Durchschnittliche Erfolgsrate in %
3. **Ø Zeit (24h)** - Durchschnittliche Antwortzeit in Sekunden
4. **Fehlerquote (24h)** - Fehlerrate in %

**Features**:
- Mini-Sparklines mit Recharts (lazy loaded)
- Trend-Indikatoren (↑/↓)
- Monospace-Zahlen (`tabular-nums`)
- Deutsche Zahlenformatierung (`,` statt `.`)
- Responsive Grid (4 Spalten → 2 Spalten → 1 Spalte)

**A11y**:
- `role="group"` für jede KPI-Karte
- `aria-label` mit vollständiger Beschreibung (z.B. "Anfragen letzte 24 Stunden 5.400")

---

### ✅ Health & Capacity (2 Spalten)

**Komponente**: `components/dashboard/HealthCapacity.tsx`

#### Health-Panel:
- **Donut Chart** mit Verteilung (OK/Eingeschränkt/Fehler)
- **Legende** mit absoluten und relativen Werten
- Lazy-loaded mit Recharts

#### Capacity-Panel:
- **Rate-Limit**: Progress Bar mit % genutzt
  - Farbe: Grün (< 70%), Gelb (70-90%), Rot (> 90%)
- **Token-Budget**:
  - Heute / 7 Tage in 2 Karten
  - Prozentanzeige des Wochenbudgets

**A11y**:
- Semantische Landmarks
- Screenreader-freundliche Prozentangaben

---

### ✅ Incidents Feed (Timeline)

**Komponente**: `components/dashboard/IncidentsFeed.tsx`

**Incident-Typen**:
- 🚀 **Deploy** (Grün)
- ⚠️ **Error** (Rot/Gelb je nach Severity)
- 📈 **Spike** (Lila)
- ⚡ **Rate-Limit** (Gelb)

**Features**:
- Auto-Scroll zu neuesten Einträgen
- "Zurück zu jetzt" Button bei manuellem Scrollen
- Relative Zeitangaben (z.B. "vor 2 Std.")
- Severity-Badges (low/medium/high)

**A11y**:
- `role="feed"` für Timeline
- `<time>` Tags mit `datetime` Attribut
- `aria-describedby` für Kontext

---

### ✅ Top Agents (Compact Table)

**Komponente**: `components/dashboard/TopAgentsCompact.tsx`

**Spalten**:
1. Agent Name
2. Status (OK/Eingeschränkt/Fehler)
3. Anfragen 24h
4. Erfolg %
5. Ø Zeit
6. Tags (max. 2)
7. Aktion "Öffnen"

**Features**:
- Sortierung per Klick auf Column-Header
- Zeigt Top 10 Agents
- Link zu "Alle Agents ansehen" (`/agents`)
- Row-Height 48px (kompakt)
- Monospace-Zahlen

**A11y**:
- Sortier-Buttons mit `aria-label`
- Status-Dots mit `aria-label`
- Hover-States für Keyboard-Navigation

---

## Filter: Nur fertige Agents

**Hook**: `lib/agents/useCompleteAgents.ts`

**Logik**:
- Nutzt `buildStatus === 'complete'` ODER
- `state === 'ready'` ODER
- `isComplete === true`

**Empty State**:
- Wenn 0 fertige Agents: "Keine fertigen Agents gefunden"
- CTA: "Agent erstellen"

---

## Design-System

### Farben (Dark Theme)

```css
--surface-0: 16 16 20;   /* Hintergrund */
--surface-1: 24 24 28;   /* Panels */
--surface-2: 30 30 36;   /* Untersektionen */
--primary: 262 83% 68%; /* Lila */
--success: 142 76% 46%; /* Grün */
--warning: 38 92% 50%;  /* Gelb */
--error: 0 72% 51%;     /* Rot */
```

### Utilities

```css
.panel { /* Border-first Panel */ }
.hairline-bottom { /* 1px Border */ }
.mono { /* Tabular Nums */ }
.motion-safe:duration-200 { /* Animation mit Reduced Motion Support */ }
```

---

## Performance

### Lazy Loading

**Charts**:
```tsx
const MiniSparkline = lazy(() => import('./MiniSparkline'));
const HealthDonut = lazy(() => import('./HealthDonut'));
```

**Suspense Fallbacks**:
```tsx
<Suspense fallback={<div className="h-12 animate-pulse bg-white/5" />}>
  <MiniSparkline data={series} />
</Suspense>
```

### Memoization

- `useMemo` für gefilterte Agents
- `useMemo` für Dashboard-Metriken
- Selektive Re-renders

**Ziel**: TTI < 1,5s ✅

---

## Accessibility (A11y)

### Landmarks

```html
<header role="banner">...</header>
<main role="main">
  <section aria-labelledby="kpi-section">...</section>
  <section aria-labelledby="health-capacity-section">...</section>
  <section aria-labelledby="incidents-section">...</section>
  <section aria-labelledby="top-agents-section">...</section>
</main>
```

### Live Regions

```tsx
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {total} Agents gefunden: {health.ok} OK, {health.degraded} Eingeschränkt, {health.error} Fehler
</div>
```

### Keyboard Navigation

| Tastenkombination | Aktion |
|-------------------|--------|
| `/` | Suche fokussieren |
| `⌘K` / `Ctrl+K` | Command Palette öffnen |
| `Tab` | Durch interaktive Elemente navigieren |
| `Enter` / `Space` | Element aktivieren |

---

## Datenaggregation

**Hook**: `lib/hooks/useDashboard.ts`

### 24h-Fenster

```ts
const totalRequests = agents.reduce((sum, a) => sum + (a.requests24h || 0), 0);
const avgSuccess = agents.reduce((sum, a) => sum + (a.successRate24h || 0), 0) / agents.length;
const avgTime = agents.reduce((sum, a) => sum + (a.avgTimeMs24h || 0), 0) / agents.length / 1000;
```

### Time Series (Mock)

```ts
function generateMockSeries(baseValue: number, variance: number, points: number = 24) {
  return Array.from({ length: points }, (_, i) => {
    const timestamp = now - (points - i - 1) * hourMs;
    const value = baseValue + (Math.random() - 0.5) * variance;
    return [timestamp, Math.max(0, value)] as [number, number];
  });
}
```

**Produktion**: Ersetzen durch echte API-Daten aus Monitoring-System.

---

## i18n (Deutsch)

### Zahlenformat

```ts
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.', ',')} Mio.`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace('.', ',')} Tsd.`;
  return num.toString();
}

function formatPercent(pct: number): string {
  return `${pct.toFixed(1).replace('.', ',')} %`;
}

function formatSeconds(sec: number): string {
  return `${sec.toFixed(1).replace('.', ',')} s`;
}
```

### Zeitangaben

```ts
function formatTimestamp(isoString: string): string {
  const diffMins = Math.floor((now - date) / 60000);
  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  return date.toLocaleDateString('de-DE', { ... });
}
```

---

## Tests

### Unit Tests (Vitest)

**Datei**: `tests/unit/useDashboard.spec.ts`

**Abdeckung**:
- ✅ Health-Berechnung
- ✅ KPI-Aggregation
- ✅ Time-Series-Generierung
- ✅ Capacity-Metriken
- ✅ Incidents-Liste
- ✅ Empty State
- ✅ Memoization

**Run**:
```bash
npm run test:unit -- useDashboard.spec.ts
```

### E2E Tests (Playwright) - Empfohlen

**Datei** (zu erstellen): `tests/ui/dashboard-a11y.spec.ts`

**Szenarien**:
```ts
test('sticky header bleibt beim Scrollen sichtbar', async ({ page }) => {
  await page.goto('/dashboard');
  await page.evaluate(() => window.scrollTo(0, 1000));
  await expect(page.locator('header[role="banner"]')).toBeInViewport();
});

test('/ fokussiert Suche', async ({ page }) => {
  await page.goto('/dashboard');
  await page.keyboard.press('/');
  await expect(page.locator('#dashboard-search')).toBeFocused();
});

test('⌘K öffnet Command Palette', async ({ page }) => {
  await page.goto('/dashboard');
  await page.keyboard.press('Meta+K');
  // Assert palette is open
});

test('Live-Region kündigt Status an', async ({ page }) => {
  await page.goto('/dashboard');
  const liveRegion = page.locator('[role="status"]');
  await expect(liveRegion).toContainText('Agents gefunden');
});

test('Top Agents Tabelle sortierbar', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('button:has-text("Anfragen 24h")');
  // Assert sorting changed
});
```

---

## Migration von alter Dashboard-Seite

### Entfernte Features

- ❌ Session Recorder (vollständig entfernt)
- ❌ Old AgentFilters
- ❌ Bulk Operations Bar
- ❌ Context Panel
- ❌ QuickDock

### Beibehaltene Konzepte

- ✅ Complete Agents Filter
- ✅ Search/Filter
- ✅ Status-based Filtering

### Breaking Changes

**Keine** - Die alte `/dashboard` Route nutzt komplett neuen Code, aber externe APIs sind unverändert.

---

## Keyboard-Map (Quick Reference)

| Taste | Aktion |
|-------|--------|
| `/` | Suche fokussieren |
| `⌘K` / `Ctrl+K` | Command Palette öffnen |
| `Tab` | Nächstes Element |
| `Shift+Tab` | Vorheriges Element |
| `Enter` | Element aktivieren |
| `Esc` | Modal/Palette schließen |

---

## Roadmap / Future Enhancements

### Phase 2
- [ ] Real-time WebSocket Updates für KPIs
- [ ] Drill-down von KPI-Karten zu Detail-Ansichten
- [ ] Erweiterte Filtermöglichkeiten (Datum, Agent-Typ)
- [ ] Export-Funktionen (PDF/CSV)
- [ ] Custom Dashboards (User-Konfigurierbar)

### Phase 3
- [ ] Alerting-Integration
- [ ] Historical Data Comparison (Heute vs. Gestern)
- [ ] Scheduled Reports
- [ ] Mobile-Optimierung

---

## Troubleshooting

### Charts werden nicht angezeigt

**Problem**: Recharts lazy loading schlägt fehl

**Lösung**:
```bash
npm install recharts --save
```

### Zahlen sind auf Englisch formatiert

**Problem**: Browser-Locale überschreibt

**Lösung**: Explizite Formatierung mit `.replace('.', ',')`

### Performance-Issues bei vielen Agents

**Problem**: Re-renders bei jedem State-Change

**Lösung**:
- `useMemo` für gefilterte Agents
- Virtualisierung für Tabellen (> 100 Einträge)

---

## Autor

- **Implementierung**: Claude Code
- **Review**: [Your Team]
- **Testing**: [Your QA Team]

## Version

- **Dashboard Refresh**: v1.0.0
- **Datum**: 2025-10-23

---

## Changelog

### v1.0.0 (2025-10-23)

- ✨ Initial Dashboard Refresh
- ✨ Sticky Header mit Search, StatusSummary, Command Palette
- ✨ KPI Bar mit 4 Metriken + Sparklines
- ✨ Health & Capacity Panels
- ✨ Incidents Feed mit Timeline
- ✨ Top Agents Compact Table
- ✨ Complete Agents Filter
- ✅ A11y-First mit ARIA Labels, Landmarks, Live Regions
- ⚡ Performance-Optimierung (Lazy Loading, Memoization)
- 🎨 Border-first Design mit Dark Theme
- 🌐 Deutsche Lokalisierung
- ✅ Unit Tests für useDashboard Hook
