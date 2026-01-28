# Agents List-Detail UI Implementation

**Feature Branch:** `feat/agents-list-detail`
**Datum:** Oktober 2025
**Status:** Production Ready

---

## Überblick

Dieser Branch führt eine neue App-artige Oberfläche für den Agents-Bereich ein:
- **List-View** (Default) mit Tabellen-Layout
- **Grid-View** (Alternative) mit Karten-Layout (bestehend)
- **Details-Panel** (Slide-over) für Agent-Details
- **Vollständige Tastatur- und Screen Reader-Unterstützung**

---

## Neue Komponenten

### 1. `components/agents/AgentsTable.tsx`
Tabellarische Liste aller Agents mit Spalten:
- Status (Farbe + Icon + Text)
- Name (mit Description)
- Anfragen (formatiert)
- Erfolgsrate (Prozent mit Farbe)
- Ø Zeit (Sekunden)
- Tags (max 2 sichtbar)
- Aktion (Öffnen-Button)

**Features:**
- Row-Click öffnet Details-Panel
- Tastatur-Navigation (Tab, Enter, Space)
- ARIA-Attribute (role="table", tabindex="0")
- Hover-Effekte

### 2. `components/agents/AgentDetailsSheet.tsx`
Details-Panel (Slide-over) mit:
- Agent-Name & Beschreibung
- Status-Badge
- Metriken-Grid (Anfragen, Erfolgsrate, Ø Zeit)
- Progress Bar für Erfolgsrate
- Tags
- Trend (optional)
- Tooltips auf Metriken

**Features:**
- ESC schließt Panel
- Backdrop-Click schließt Panel
- Fokus-Management
- ARIA role="dialog"

### 3. `components/agents/ViewSwitch.tsx`
Segmented Control für Ansicht-Wechsel:
- Liste (List-View)
- Karten (Grid-View)

**Features:**
- aria-pressed für aktive Ansicht
- Keyboard-fokussierbar
- Icons + Text

### 4. `components/agents/AgentsToolbar.tsx`
Toolbar mit allen Filtern in **einer Zeile**:
- **Suche** (Hotkey `/`)
- **Status-Filter** (Healthy, Degraded, Error) mit Zählern
- **Sort** (Meiste Anfragen, Name, Höchste Erfolgsrate)
- **Toggle** "Nur aktive"
- **Ergebnis-Zähler** (Live-Region)

**Features:**
- Hotkey `/` fokussiert Suche
- Dropdown für Sort
- Live-Region für Ergebnis-Zähler

### 5. `components/ui/sheet.tsx`
Generische Sheet/Slide-over Komponente:
- SheetContent
- SheetHeader
- SheetTitle
- SheetDescription
- SheetClose

---

## Design-Tokens

### Neue CSS-Variablen (app/globals.css)

```css
/* App Shell Surface Layers */
--surface-0: 16 16 20;   /* Hintergrund */
--surface-1: 24 24 28;   /* Hauptpanel */
--surface-2: 30 30 36;   /* Untersektionen */
```

### Utility Classes

```css
.bg-surface-0 { background-color: rgb(var(--surface-0)); }
.bg-surface-1 { background-color: rgb(var(--surface-1)); }
.bg-surface-2 { background-color: rgb(var(--surface-2)); }

.card-surface {
  @apply rounded-2xl border border-white/10 bg-surface-1;
}
```

---

## Keyboard-Map

| Taste | Aktion | Kontext |
|-------|--------|---------|
| `/` | Fokussiert Suchfeld | Global auf Agents-Page |
| `Tab` | Navigiert zwischen Elementen | Standard |
| `Enter` | Öffnet Details-Panel | Auf Table Row |
| `Space` | Togglet Status-Filter | Auf Filter-Chip |
| `Escape` | Schließt Details-Panel | In Details-Panel |
| `←` / `→` | Navigiert zwischen Ansichten | In ViewSwitch (optional) |

---

## Accessibility (A11y)

### WCAG 2.1 Level AA Konformität

#### Table
- `role="table"` auf Table-Element
- `<caption className="sr-only">` für Screen Reader
- Rows haben `tabIndex={0}` und sind fokussierbar
- `aria-label` auf Rows

#### Details Sheet
- `role="dialog"` und `aria-modal="true"`
- ESC-Taste schließt Sheet
- Fokus-Trap innerhalb des Sheets
- Body-Scroll gesperrt bei geöffnetem Sheet

#### Status-Indikatoren
- **Farbe** (Grün, Gelb, Rot)
- **Icon** (CheckCircle, AlertTriangle, OctagonX)
- **Text** (OK, Eingeschränkt, Fehler)

#### Toolbar
- Suche hat `role="searchbox"`
- Status-Filter haben `role="checkbox"` und `aria-checked`
- Live-Region für Ergebnis-Zähler (`aria-live="polite"`)

---

## Tests

### Playwright A11y Smoke Tests

**Datei:** `tests/ui/agents-a11y.spec.ts`

#### Neue Tests:
1. **Agents: Suche + Tastatur + Details-Sheet**
   - `/` fokussiert Suche
   - Row fokussierbar
   - Enter öffnet Details-Sheet
   - ESC schließt Sheet

2. **Table has proper ARIA structure**
   - Table hat `role="table"`
   - Caption vorhanden (sr-only)
   - Rows sind fokussierbar

3. **View switch toggles between list and cards**
   - Liste/Karten Toggle funktioniert
   - Beide Ansichten sichtbar

#### Bestehende Tests (angepasst):
4. Cards are links (in Grid-View)
5. Tooltips vorhanden
6. Status Multi-Modalität
7. Filter Counter

**Ausführen:**
```bash
npx playwright test tests/ui/agents-a11y.spec.ts
```

**CI Job:** `ui-a11y-smoke` (in `.github/workflows/e2e.yml`)

---

## Migration

### Bestehende Code-Basis

**Keine Breaking Changes:**
- `AgentCard` bleibt unverändert
- Grid-View funktioniert weiter (als alternative Ansicht)
- API-Typen bleiben kompatibel

### Neue Agent Type-Struktur

```typescript
export type Agent = {
  id: string;              // NEU: unique identifier
  name: string;
  description?: string;
  requests: number;
  successRate: number;     // Renamed von successPct
  avgTimeSec: number;
  tags: string[];
  status: 'healthy' | 'degraded' | 'error';
  trend?: string;
};
```

**Änderung:** `successPct` → `successRate` (für Konsistenz)

### FiltersBar → AgentsToolbar

**Alt:** `components/agents/FiltersBar.tsx`
**Neu:** `components/agents/AgentsToolbar.tsx`

**Änderungen:**
- Neue Props: `activeOnly`, `onActiveOnlyChange`
- Sort-Option hinzugefügt: `'name'`
- Kein `resultsCount`-Prop mehr im Clear-Button (jetzt im Toolbar)

---

## Dateistruktur

```
components/
├── agents/
│   ├── AgentCard.tsx              # Bestehend (unverändert)
│   ├── AgentsPage.tsx             # REFACTORED
│   ├── AgentsPageOld.tsx          # Backup der alten Version
│   ├── AgentsTable.tsx            # NEU
│   ├── AgentDetailsSheet.tsx      # NEU
│   ├── AgentsToolbar.tsx          # NEU
│   ├── ViewSwitch.tsx             # NEU
│   └── FiltersBar.tsx             # Bestehend (für andere Bereiche)
├── ui/
│   └── sheet.tsx                  # NEU
└── common/
    └── Tooltip.tsx                # Bestehend

app/
└── globals.css                    # UPDATED (neue Tokens)

tests/
└── ui/
    └── agents-a11y.spec.ts        # UPDATED (neue Tests)

docs/
└── agents-list-detail.md          # NEU (diese Datei)
```

---

## Verwendung

### Agents Page Default (List View)

```typescript
import { AgentsPage } from '@/components/agents/AgentsPage';

export default function Page() {
  return <AgentsPage />;
}
```

### Manuelles Umschalten zur Grid-View

Der Benutzer kann über den ViewSwitch zwischen Liste und Karten wechseln.

### Details-Panel öffnen

- **Maus:** Click auf Table Row oder "Öffnen"-Button
- **Tastatur:** Enter auf fokussierter Row

---

## Performance

### Optimierungen

- **Gecachte Zahlenformatierung** (`Intl.NumberFormat`)
- **useMemo** für Filter-/Sort-Logik
- **Lazy Sheet** (nur gerendert wenn `open={true}`)
- **Keyboard-only Hover** (keine unnötigen Hover-Effekte auf Touch)

---

## Bekannte Einschränkungen

1. **Intro-Banner:** Entfernt (war spezifisch für Grid-View)
2. **Filter-Counter:** Aktuell nur in Toolbar, nicht pro Status
3. **Pagination:** Noch nicht implementiert (alle Agents werden geladen)
4. **Real-time Updates:** Noch nicht implementiert (Demo-Daten sind statisch)

---

## Nächste Schritte

### Optional für v2:

1. **Pagination** für große Agent-Listen
2. **Bulk-Aktionen** (mehrere Agents gleichzeitig verwalten)
3. **Real-time Updates** via WebSocket
4. **Agent-Detail-Page** (vollständige Seite statt Sheet)
5. **Advanced Filtering** (nach Tags, Trends, etc.)
6. **Export-Funktion** (CSV, JSON)

---

## Support

Bei Fragen oder Problemen:
- **Tests:** `npx playwright test tests/ui/agents-a11y.spec.ts`
- **Dokumentation:** Dieser Guide + Code-Kommentare
- **Issues:** GitHub Issues erstellen

---

## Changelog

### v1.0.0 (Oktober 2025)

#### Features
- ✅ List-View als Default-Ansicht
- ✅ Details-Panel (Slide-over)
- ✅ ViewSwitch (Liste/Karten)
- ✅ Toolbar mit allen Filtern in einer Zeile
- ✅ Vollständige A11y-Unterstützung

#### Design
- ✅ Neue Surface-Tokens (surface-0/1/2)
- ✅ Border-first statt Shadow-heavy
- ✅ Satzfall statt GROSSBUCHSTABEN

#### Tests
- ✅ Playwright A11y Smoke Tests
- ✅ CI-Job `ui-a11y-smoke`

---

**Viel Erfolg mit der neuen Agents UI!** 🚀
