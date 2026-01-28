# Dashboard Classic

Einfaches, übersichtliches Dashboard mit kompakten KPIs, Aktivitätsliste und Agenten-Snapshot.

## Überblick

Das Classic Dashboard bietet einen schnellen Überblick über das System ohne komplexe Visualisierungen. Es fokussiert sich auf die wichtigsten Metriken und aktuellen Ereignisse.

## Features

### 1. Header
- **Titel & Subtitle**: Klare Orientierung
- **Suchfeld**: Filtern nach Agent-Namen (Hotkey: `/`)
- **Command Palette**: Schnellzugriff (Hotkey: `⌘K` / `Ctrl+K`)

### 2. KPI-Zeile (4 Karten)
- **Anfragen (24h)**: Gesamtzahl aller Requests
- **Erfolgsrate (24h)**: Gewichteter Durchschnitt aller Agents
- **Ø Zeit (24h)**: Durchschnittliche Antwortzeit in Sekunden
- **Fehlerquote (24h)**: Prozentsatz fehlgeschlagener Requests

Deutsche Zahlenformatierung:
- `5.400` → `5,4 Tsd.`
- `96.8%` → `96,8 %`
- `1.2s` → `1,2 s`

### 3. Aktivitätsliste
Feed-artige Darstellung der letzten Ereignisse (24h):
- **Deploy**: Neue Agent-Versionen
- **Error**: Fehler und Incidents
- **Spike**: Traffic-Spitzen
- **Rate Limit**: Quota-Warnungen

Jedes Item zeigt:
- Icon mit Farbcodierung
- Titel & Subtitle
- Relative Zeitangabe ("vor 15 Min.", "vor 2 Std.")

### 4. Agents Snapshot
Kompakte Tabelle der Top-10-Agents:
- Name
- Status (OK / Eingeschränkt / Fehler)
- Anfragen 24h
- Erfolgsrate in %
- Durchschnittliche Zeit
- "Öffnen"-Button für Details

Link "Alle Agents ansehen" führt zu `/agents`.

## Komponenten

### `HeaderClassic.tsx`
Vereinfachter Header ohne Status-Panels.

```tsx
<HeaderClassic
  onSearchChange={(query) => setSearchQuery(query)}
  onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
/>
```

**Props**:
- `onSearchChange?: (query: string) => void` – Callback bei Sucheingabe
- `onCommandPaletteOpen?: () => void` – Callback für ⌘K

### `KpiRowClassic.tsx`
4 kompakte KPI-Karten ohne Charts.

```tsx
<KpiRowClassic
  metrics={{
    requests24h: 10000,
    successPct24h: 95.5,
    avgTimeSec24h: 1.2,
    errorPct24h: 4.5,
  }}
/>
```

**Props**:
- `metrics: KpiMetrics` – Aggregierte 24h-Metriken

### `ActivityList.tsx`
Feed mit Icons, Titeln und Zeitangaben.

```tsx
<ActivityList
  items={[
    {
      id: 'act-1',
      at: '2025-10-23T10:30:00Z',
      type: 'deploy',
      title: 'Dexter v2.1 deployed',
      subtitle: 'Performance improvements',
      severity: 'low',
    },
  ]}
/>
```

**Props**:
- `items: ActivityItem[]` – Liste der Ereignisse

**ActivityItem**:
- `id: string`
- `at: string` (ISO timestamp)
- `type: 'deploy' | 'error' | 'spike' | 'rate_limit'`
- `title: string`
- `subtitle?: string`
- `agentId?: string`
- `severity?: 'low' | 'medium' | 'high'`

### `AgentsSnapshotTable.tsx`
Tabelle mit max. 10 Agents, sortiert nach Requests.

```tsx
<AgentsSnapshotTable
  agents={completeAgents}
  onOpen={(id) => router.push(`/agents/${id}`)}
/>
```

**Props**:
- `agents: Agent[]` – Gefilterte Agent-Liste
- `onOpen?: (id: string) => void` – Callback für "Öffnen"-Button

## Hook: `useDashboardClassic`

Aggregiert KPIs und generiert Aktivitäten.

```tsx
import { useDashboardClassic } from '@/lib/hooks/useDashboardClassic';

const dashboardData = useDashboardClassic(agents);
// dashboardData.kpi → { requests24h, successPct24h, avgTimeSec24h, errorPct24h }
// dashboardData.activities → ActivityItem[]
```

**Berechnung**:
- **Requests**: Summe aller `agent.requests24h`
- **Success Rate**: Gewichteter Durchschnitt `(sum(requests * successRate)) / totalRequests`
- **Avg Time**: Gewichteter Durchschnitt in Sekunden (ms → s)
- **Error Rate**: `100 - successRate`

## Accessibility (A11y)

### Landmarks
- `<header>` für Header
- `<main role="main">` für Hauptinhalt
- `<section aria-labelledby="kpi-section">` für KPIs
- `<section aria-labelledby="activity-section">` für Aktivität
- `<section aria-labelledby="agents-section">` für Agents

### Keyboard Navigation
- `/` → Suchfeld fokussieren
- `⌘K` / `Ctrl+K` → Command Palette öffnen
- `Tab` → Durch interaktive Elemente navigieren
- `Enter` → "Öffnen"-Button aktivieren

### Screen Reader
- ARIA-Labels für alle Buttons und Inputs
- `role="feed"` für Aktivitätsliste
- `role="group"` für KPI-Karten
- `<time dateTime="...">` für Zeitangaben
- Visuelle Zustände (Status-Dots) haben `aria-label`

### Reduced Motion
Respektiert `prefers-reduced-motion: reduce` – keine Animationen.

## Compact Density

Zeilenhöhe: **44–48px** für kompakte Darstellung.

Beispiel Tabelle:
```tsx
<tr style={{ height: '48px' }}>
```

## Tests

### Playwright E2E (`tests/ui/dashboard-classic.spec.ts`)
- Header mit Titel/Subtitle
- `/` fokussiert Suchfeld
- 4 KPI-Karten vorhanden
- Aktivitätsliste hat `role="feed"`
- Agents-Tabelle max. 10 Zeilen
- "Alle Agents ansehen"-Link
- Suchfilter funktioniert
- Deutsche Zahlenformatierung
- Zeilenhöhe 44–48px

### Vitest Unit (`tests/unit/useDashboardClassic.spec.ts`)
- Korrekte Aggregation von Requests
- Gewichtete Success Rate
- Fehlerquote = 100 - Success
- Zeit-Konvertierung ms → s
- Aktivitäten generiert
- Empty State (keine Agents)
- Memoization korrekt

## Deployment

```bash
# Tests ausführen
npm run test:unit
npx playwright test tests/ui/dashboard-classic.spec.ts

# Build
npm run build

# Start
npm run start
```

## Migration

Wenn du vom komplexen Dashboard zurück zur Classic-Version wechselst:

1. Import-Statements anpassen:
   ```tsx
   // Alt
   import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
   import { KpiBar } from '@/components/dashboard/KpiBar';
   import { HealthCapacity } from '@/components/dashboard/HealthCapacity';

   // Neu
   import { HeaderClassic } from '@/components/dashboard/HeaderClassic';
   import { KpiRowClassic } from '@/components/dashboard/KpiRowClassic';
   import { ActivityList } from '@/components/dashboard/ActivityList';
   ```

2. Hook wechseln:
   ```tsx
   // Alt
   const dashboardData = useDashboard(agents);

   // Neu
   const dashboardData = useDashboardClassic(agents);
   ```

3. Layout vereinfachen – keine komplexen Grid-Layouts mehr.

## Troubleshooting

### "Module not found: recharts"
Classic Dashboard benötigt **kein** recharts – falls Fehler auftritt, prüfe Imports.

### KPIs zeigen 0%
- Prüfe ob `completeAgents` leer ist
- Filtere nur Agents mit `buildStatus: 'complete' | state: 'ready' | isComplete: true`

### Aktivitäten nicht sichtbar
- Hook generiert Mock-Daten – in Produktion: API-Anbindung erforderlich

### Deutsche Formatierung fehlt
- Prüfe `formatNumber()`, `formatPercent()`, `formatSeconds()` in den Komponenten
- Sicherstellen: `.replace('.', ',')` und `toLocaleString('de-DE')`

## Next Steps

- **Command Palette Integration**: Modal für `/` und `⌘K`
- **Real-time Updates**: WebSocket für Live-Metriken
- **Agent-Filter**: Tags, Status, Build-Status
- **Export**: CSV/PDF-Export für Reports
- **Dashboards**: Mehrere vordefinierte Dashboards (Ops, Business, Tech)

---

**Version**: 1.0.0
**Branch**: `feat/dashboard-classic-restore`
**Letztes Update**: 2025-10-23
