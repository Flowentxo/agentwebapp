# Agents Command Center

## Übersicht

Das **Agents Command Center** ist die neue Standardansicht für die Agents-Seite. Es bietet eine **Sintra-ähnliche** 3-Spalten-Oberfläche mit Echtzeit-Übersicht, Incidents-Timeline und Quick Actions.

### Features

- **Cockpit-Ansicht** (Default) - 3-Spalten-Layout mit Watchlist, Incidents, Alerts
- **Tabellen-Ansicht** - Kompakte Liste aller Agents
- **Graph-Ansicht** (Placeholder) - Für zukünftige Visualisierungen
- **Command Palette** - Schnellzugriff mit ⌘K/CTRL+K
- **Status Summary** - Filterbare Übersicht (OK/Eingeschränkt/Fehler)
- **Agent Details Sheet** - Slide-over mit Tabs (Metriken, Logs, Konfiguration, Versionen)

---

## Komponenten

### 1. CommandCenter

**Datei:** `components/agents/CommandCenter.tsx`

3-Spalten-Grid-Layout:
- **Links**: Watchlist (pinnable Agents)
- **Mitte**: Incidents Timeline (Deploys, Spikes, Errors)
- **Rechts**: Alerts & Actions (Error-Liste, Quick Actions)

```tsx
<CommandCenter agents={filteredAgents} onOpenAgent={handleOpenAgent} />
```

---

### 2. Watchlist

**Datei:** `components/agents/Watchlist.tsx`

- Pinnable Agents mit Status-Dot
- Mini-Sparklines (Placeholder)
- Trend-Anzeige (+4%, –3%)
- Click öffnet Details-Sheet

**Features:**
- Gepinnte Agents oben, getrennt durch Divider
- Hover zeigt Pin-Button
- Kompakte Metriken (Anfragen, Erfolgsrate)

---

### 3. IncidentsTimeline

**Datei:** `components/agents/IncidentsTimeline.tsx`

Chronologische Timeline mit:
- Deploys (Rocket-Icon, blau)
- Traffic-Spikes (TrendingUp, gelb)
- Errors (AlertCircle, rot)
- Rate-Limits (Shield, orange)

**Features:**
- Relative Zeitstempel ("vor 2 Std.")
- Timeline-Linie zwischen Items
- Severity-basierte Farben

---

### 4. AlertsActions

**Datei:** `components/agents/AlertsActions.tsx`

Alert-Liste mit Quick Actions:
- **Restart** - Agent neu starten
- **Stop** - Agent stoppen
- **Route** - Traffic umleiten
- **Details** - Sheet öffnen

**Features:**
- Severity-Badges (Warning, Error)
- Zeitstempel
- Click auf Agent-Name öffnet Details

---

### 5. CommandPalette

**Datei:** `components/agents/CommandPalette.tsx`

Keyboard-first Kommandozeile:

**Shortcuts:**
- `⌘K` / `CTRL+K` - Öffnen
- `ESC` - Schließen
- `↑ ↓` - Navigation
- `↵` - Auswählen

**Kommandos:**
- "Agent öffnen" für alle Agents
- "Alle Agents neu starten"
- "Alle Agents stoppen"

---

### 6. StatusSummary

**Datei:** `components/agents/StatusSummary.tsx`

3 Status-Chips mit Counters:
- **OK** (Grün) - Gesunde Agents
- **Eingeschränkt** (Gelb) - Degradierte Agents
- **Fehler** (Rot) - Fehlerhafte Agents

**Interaktiv:** Click filtert Agents (toggle)

---

### 7. ViewSwitch

**Datei:** `components/agents/ViewSwitch.tsx`

Segmented Control mit 3 Modi:

| View | Icon | Label | Status |
|------|------|-------|--------|
| Cockpit | Monitor | Cockpit | **Default** |
| List | List | Tabelle | Vollständig |
| Graph | Network | Graph | Placeholder |

---

### 8. AgentDetailsSheet (updated)

**Datei:** `components/agents/AgentDetailsSheet.tsx`

Tabs-Navigation:

| Tab | Icon | Inhalt | Status |
|-----|------|--------|--------|
| Metriken | Activity | Anfragen, Erfolgsrate, Ø Zeit, Status, Tags | Vollständig |
| Logs | FileText | Log-Einträge | Placeholder |
| Konfiguration | Settings | Agent-Config | Placeholder |
| Versionen | GitBranch | Versions-Historie | Placeholder |

---

## Keyboard-Map

| Taste | Aktion | Kontext |
|-------|--------|---------|
| `/` | Fokussiert Suchfeld | Global (Toolbar) |
| `⌘K` / `CTRL+K` | Öffnet Command Palette | Global |
| `ESC` | Schließt Palette/Sheet | Dialog |
| `↑ ↓` | Navigation | Command Palette |
| `↵` | Auswählen/Öffnen | Palette, Table Row |
| `Tab` | Standard-Navigation | Überall |

---

## Accessibility (WCAG 2.1 AA)

### ARIA-Rollen

✅ **CommandCenter**: `role="region"` mit `aria-label="Command Center"`
✅ **Tabs**: `role="tablist"`, `role="tab"`, `role="tabpanel"` mit ID-Verknüpfung
✅ **CommandPalette**: `role="dialog"` mit `aria-modal="true"` + `role="combobox"` für Search
✅ **StatusSummary**: `role="group"` mit `aria-pressed` auf Buttons
✅ **Watchlist/Timeline/Alerts**: `role="list"`, `role="article"`, `role="feed"`

### Keyboard-Navigation

✅ Alle interaktiven Elemente per `Tab` erreichbar
✅ Custom Shortcuts (`/`, `⌘K`) mit Window-Event-Listener
✅ Focus-Trap in Dialogs (CommandPalette, AgentDetailsSheet)
✅ Focus-Restore nach Dialog-Close

### Screen Reader Support

✅ `sr-only`-Labels für visuelle Elemente
✅ `aria-label` auf Buttons und Icons
✅ `aria-live="polite"` für Ergebnis-Counter
✅ Landmarks (`header`, `main`, `region`)

---

## Demo-Daten

### Incidents

- **Deploys**: Letzte 5 Agents, zeitversetzt 1-5 Std. zurück
- **Errors**: Degraded/Error-Agents mit timeout-Meldung

### Alerts

- **Error**: Agents mit status=`error` (Erfolgsrate < 80%)
- **Warning**: Agents mit status=`degraded` (erhöhte Antwortzeit)

### Pinned Agents

Default: `['cassie', 'dexter']` (via `useState`)

---

## Tests

**Datei:** `tests/e2e/agents-command-center.spec.ts`

### Test-Coverage

1. ✅ Default Cockpit-View angezeigt
2. ✅ StatusSummary mit Countern sichtbar
3. ✅ CommandPalette öffnet mit ⌘K
4. ✅ CommandPalette öffnet per Button
5. ✅ CommandPalette schließt mit ESC
6. ✅ Watchlist, Incidents, Alerts Panels vorhanden
7. ✅ ViewSwitch: Tabelle, Graph funktioniert
8. ✅ Agent-Details öffnet aus Watchlist
9. ✅ Tabs in AgentDetailsSheet vorhanden
10. ✅ Status-Filter funktioniert
11. ✅ Keyboard-Navigation in Palette

**Ausführen:**
```bash
npx playwright test tests/e2e/agents-command-center.spec.ts
```

---

## Struktur

```
components/agents/
├── AgentsPage.tsx                 # Main Integration
├── CommandCenter.tsx              # 3-Spalten-Layout
├── Watchlist.tsx                  # Linke Spalte
├── IncidentsTimeline.tsx          # Mittlere Spalte
├── AlertsActions.tsx              # Rechte Spalte
├── CommandPalette.tsx             # ⌘K Dialog
├── StatusSummary.tsx              # Status-Chips mit Countern
├── ViewSwitch.tsx                 # Cockpit | Tabelle | Graph
├── AgentDetailsSheet.tsx          # Tabs-Sheet (updated)
├── AgentsToolbarCompact.tsx       # Sticky Toolbar (existing)
├── AgentsTable.tsx                # List View (existing)
└── AgentCard.tsx                  # Grid View (existing)
```

---

## Migration

### ⚠️ Breaking Changes: KEINE

- `AgentsTable`, `AgentCard` unverändert
- `ViewMode` Type erweitert: `'cockpit' | 'list' | 'graph'` (vorher `'list' | 'cards'`)
- Default-View jetzt `'cockpit'` statt `'list'`

### Neue Komponenten

Alle neuen Komponenten sind **additiv**. Bestehende Tabellen/Karten-Views funktionieren weiter.

---

## Performance

### Optimierungen

✅ Cached Zahlenformatierung (`Intl.NumberFormat`)
✅ `useMemo` für Status-Counts, Filtered Agents, Incidents, Alerts
✅ Lazy Sheet-Rendering (nur bei `open={true}`)
✅ Hover-only CSS (keine Touch-Performance-Issues)
✅ Demo-Daten-Generierung mit `useMemo`

---

## Zukünftige Erweiterungen

### Geplant für v2

- [ ] **Graph-View** - Dependency-Graph, Agent-Kommunikation
- [ ] **Logs-Tab** - Echtzeit-Logs mit Filtering
- [ ] **Konfiguration-Tab** - Agent-Settings editierbar
- [ ] **Versionen-Tab** - Rollback-Funktionalität
- [ ] **Sparklines** - Echte Charts in Watchlist (z.B. Recharts)
- [ ] **Real-time Updates** - WebSocket für Live-Daten
- [ ] **Watchlist Persistence** - localStorage für Pins
- [ ] **CommandPalette Actions** - Implementierung von Restart/Stop/Route
- [ ] **Bulk Actions** - Multi-Select in Tabelle

---

## Beispiel-Nutzung

### AgentsPage Integration

```tsx
import { CommandCenter } from './CommandCenter';
import { CommandPalette } from './CommandPalette';
import { StatusSummary } from './StatusSummary';

export function AgentsPage() {
  const [view, setView] = useState<ViewMode>('cockpit');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <div>
      <header>
        <StatusSummary counts={statusCounts} onToggleFilter={handleToggle} />
        <button onClick={() => setCommandPaletteOpen(true)}>⌘K</button>
      </header>

      <main>
        {view === 'cockpit' && <CommandCenter agents={agents} />}
        {view === 'list' && <AgentsTable agents={agents} />}
        {view === 'graph' && <GraphPlaceholder />}
      </main>

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} agents={agents} />
    </div>
  );
}
```

---

## Design-Prinzipien

1. **Border-first** - Hairlines (white/6, white/10), minimale Shadows
2. **Compact Density** - Spacing py-2.5, px-3, Row-Height 44-48px
3. **German Language** - Durchgehend deutsche Labels
4. **Monospace Numbers** - `tabular-nums` für Metriken
5. **Status Multi-Modalität** - Farbe + Icon + Text für A11y

---

## Commit-Historie

1. `feat(agents): extend ViewSwitch to support Cockpit | Tabelle | Graph`
2. `feat(agents): add StatusSummary component with status counters`
3. `feat(agents): add Watchlist component with pinning`
4. `feat(agents): add IncidentsTimeline component`
5. `feat(agents): add AlertsActions component with quick actions`
6. `feat(agents): add CommandCenter 3-column layout`
7. `feat(agents): add CommandPalette with ⌘K shortcut`
8. `feat(agents): update AgentDetailsSheet with tabs`
9. `feat(agents): integrate CommandCenter into AgentsPage with Cockpit as default`
10. `test(agents): add E2E tests for Command Center`
11. `docs(agents): add comprehensive Command Center documentation`

---

**Ready for Review & Merge!** ✅
