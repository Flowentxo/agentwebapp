# SINTRA Operations Board - Enterprise Edition

**Version:** 3.5.0
**Status:** Production Ready
**Last Updated:** 2025-10-23

---

## Überblick

Das SINTRA Operations Board ist ein vollständig funktionales Enterprise-Kanban-System zur Verwaltung und Überwachung von Agents, Tasks und Statusübergängen mit Drag-and-Drop-Funktionalität.

### Kernmerkmale

- **4-Spalten-Kanban** (Active, Pending, Stopped, Archived)
- **Drag & Drop** für Statuswechsel
- **Inspector Drawer** mit Tabs (Übersicht, Aktivität, Metriken)
- **Quick Stats Header** (Aktive Agents, Incidents, Erfolgsquote)
- **Team Activity Timeline** mit Filterung
- **View-Switch** (Nach Status / Nach Tags)
- **Content-Only Layout** (max-w-[1600px])
- **Accessibility-First** (ARIA, Keyboard Navigation)

---

## Module & Komponenten

### 1. BoardHeader (`components/board/BoardHeader.tsx`)

**Funktionen:**
- Titel & Untertitel
- 4 Quick-Stats-Karten:
  - Aktive Agents (grün)
  - Inaktive Agents (grau)
  - Incidents 24h (gelb)
  - Erfolgsquote % (cyan)
- Action-Buttons: Filter, Neu, Refresh

**Props:**
```typescript
interface BoardHeaderProps {
  stats: BoardStats;
  onFilterClick: () => void;
  onAddClick: () => void;
  onRefreshClick: () => void;
  isRefreshing?: boolean;
}
```

---

### 2. StatusColumn (`components/board/StatusColumn.tsx`)

**Funktionen:**
- Spalten-Header mit Count-Badge
- Drag-and-Drop-fähiger Container
- AgentCard-Rendering
- Empty State mit CTA

**Props:**
```typescript
interface StatusColumnProps {
  status: BoardStatus;
  title: string;
  cards: BoardCard[];
  onCardClick: (card: BoardCard) => void;
  onCardEdit: (card: BoardCard, e: React.MouseEvent) => void;
  onCardDelete: (card: BoardCard, e: React.MouseEvent) => void;
  onAddClick: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
}
```

---

### 3. AgentCard (`components/board/AgentCard.tsx`)

**Funktionen:**
- Name, Beschreibung (2-Zeilen-Limit)
- Tags (max 2 sichtbar)
- Status-Badge (success/warning/error)
- Zeit: "vor X Minuten"
- Actions: Bearbeiten, Löschen (on hover)

**UI-Pattern:**
```tsx
<div className="panel p-4 cursor-pointer hover:ring-2 hover:ring-accent/40 group">
  {/* Header mit Name + Badge */}
  {/* Description (line-clamp-2) */}
  {/* Footer: Timestamp + Owner */}
</div>
```

---

### 4. InspectorDrawer (`components/board/InspectorDrawer.tsx`)

**Funktionen:**
- Slide-over Panel (480px breit)
- 3 Tabs:
  - **Übersicht:** Name, Beschreibung, Owner, Status-Buttons
  - **Aktivität:** Timeline der letzten Änderungen
  - **Metriken:** Erfolgsrate, Fehlerquote, Laufzeit, Requests
- Footer-Actions: Archivieren, Löschen
- Backdrop-Close + X-Button

**Props:**
```typescript
interface InspectorDrawerProps {
  card: BoardCard | null;
  activity: ActivityEntry[];
  onClose: () => void;
  onStatusChange: (newStatus: string) => void;
  onArchive: () => void;
  onDelete: () => void;
}
```

---

### 5. TeamActivity (`components/board/TeamActivity.tsx`)

**Funktionen:**
- Timeline-View (letzte 50 Einträge)
- Filter: Zeitraum (1h, 24h, 7d, 30d)
- Filter: Benutzer (All / Einzelne)
- Anzeige: Zeit, User, Aktion, Ziel, Status-Change

**API:**
`GET /api/board/activity?since=24h`

---

### 6. ViewSwitch (`components/board/ViewSwitch.tsx`)

**Funktionen:**
- Toggle zwischen "Nach Status" / "Nach Tags"
- Persistenz in localStorage (`board.viewMode`)
- ARIA radiogroup

**Pattern:**
```tsx
<div className="inline-flex gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
  <button className="bg-accent/20 text-accent ring-1 ring-accent/40">
    Nach Status
  </button>
</div>
```

---

## Custom Hooks

### `useBoardData()`

**Funktionen:**
- Fetcht Board-Daten von `/api/board`
- Fetcht Aktivitäten von `/api/board/activity`
- Methoden:
  - `updateCardStatus(cardId, newStatus)`
  - `deleteCard(cardId)`
  - `refetch()`

**Return:**
```typescript
{
  data: BoardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateCardStatus: (cardId: string, status: BoardStatus) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
}
```

### `useDragDrop(onStatusChange)`

**Funktionen:**
- `handleDragOver(e)` - Verhindert Default, setzt dropEffect
- `handleDrop(e, targetStatus)` - Parsed Card-JSON, ruft onStatusChange auf

---

## API Routes

### `GET /api/board`
Liefert alle Board-Karten + Stats

**Response:**
```json
{
  "cards": [
    {
      "id": "card-1",
      "name": "Dexter Analytics",
      "description": "...",
      "status": "active",
      "tags": ["#analytics", "#prod"],
      "statusBadge": "success",
      "owner": "admin@sintra.ai",
      "lastModified": "2025-10-23T10:00:00Z",
      "metrics": {
        "successRate": 98.5,
        "errorRate": 1.5,
        "runtime": 245,
        "requests": 12453
      }
    }
  ],
  "stats": {
    "activeAgents": 2,
    "inactiveAgents": 2,
    "incidents24h": 1,
    "successRate": 96.5
  }
}
```

### `PUT /api/board/:id`
Aktualisiert Card-Status

**Body:**
```json
{ "status": "archived" }
```

**Response:**
```json
{ "success": true, "message": "Card updated successfully" }
```

### `DELETE /api/board/:id`
Löscht eine Card

**Response:**
```json
{ "success": true, "message": "Card deleted successfully" }
```

### `GET /api/board/activity?since=24h`
Liefert Team-Aktivitäten

**Response:**
```json
{
  "activities": [
    {
      "id": "act-1",
      "timestamp": "2025-10-23T10:00:00Z",
      "user": "Anna Schmidt",
      "action": "änderte Status von",
      "target": "Dexter Analytics",
      "fromStatus": "pending",
      "toStatus": "active"
    }
  ],
  "since": "24h"
}
```

---

## TypeScript-Typen

**File:** `types/board.ts`

```typescript
export type BoardStatus = "active" | "pending" | "stopped" | "archived";

export interface BoardCard {
  id: string;
  name: string;
  description: string;
  status: BoardStatus;
  tags: string[];
  statusBadge: "success" | "warning" | "error";
  owner: string;
  lastModified: string;
  createdAt: string;
  metrics?: {
    successRate: number;
    errorRate: number;
    runtime: number;
    requests: number;
  };
}

export interface BoardStats {
  activeAgents: number;
  inactiveAgents: number;
  incidents24h: number;
  successRate: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  fromStatus?: BoardStatus;
  toStatus?: BoardStatus;
}

export type ViewMode = "status" | "tags";
```

---

## Design & UX

### Layout
- Wrapper: `mx-auto w-full max-w-[1600px] p-6 space-y-8`
- 4-Column Grid (xl): `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6`
- Cards: `panel p-4 cursor-pointer hover:ring-2 hover:ring-accent/40`

### Design Tokens
- `.panel` - Container mit Border + Shadow
- `.hairline-b` - 1px Border Bottom
- `.bg-surface-0` - Dunklerer Hintergrund
- `.bg-surface-1` - Hellerer Hintergrund
- `.text-accent` - Cyan (#8b5cf6)
- `.focus-ring` - Fokus-Outline

### Drag & Drop
```tsx
// Card ist draggable
<div draggable onDragStart={(e) => {
  e.dataTransfer.setData("application/json", JSON.stringify(card));
}} />

// Column akzeptiert Drop
<div
  onDragOver={handleDragOver}
  onDrop={(e) => handleDrop(e, targetStatus)}
/>
```

---

## Accessibility

### ARIA Landmarks
```tsx
<div role="button" aria-label="Agent Card: Dexter Analytics" />
<div role="dialog" aria-labelledby="drawer-title" aria-modal="true" />
<div role="radiogroup" aria-label="Board-Ansicht" />
```

### Keyboard Navigation
- **Tab:** Navigiert durch Cards
- **Enter/Space:** Öffnet Card
- **Escape:** Schließt Drawer
- **Arrow Keys:** (Optional) Wechsel zwischen Spalten

### Focus Management
```tsx
className="focus-ring"
// → outline: 2px solid hsl(var(--ring)); outline-offset: 2px;
```

---

## Testing

### E2E Tests (Playwright)

**File:** `tests/ui/board-e2e.spec.ts`

**Test Cases:**
1. Displays board header with quick stats
2. Switches between status and tags view
3. Opens inspector drawer on card click
4. Closes drawer with X button or backdrop
5. Team activity section displays activities
6. Keyboard navigation works
7. Refresh button shows loading state
8. View mode persists in localStorage

**Run:**
```bash
npx playwright test tests/ui/board-e2e.spec.ts
```

---

## Deployment

### Pre-Production Checklist
- [ ] Alle TODO-Kommentare durch echte DB-Calls ersetzen
- [ ] Session-Validierung implementieren
- [ ] Audit-Trail-Logger aktivieren
- [ ] Role-Based Access Control (dev/admin für Schreibrechte)
- [ ] Rate-Limiting für `/api/board/*`
- [ ] Error-Handling verbessern

### Production
- [ ] E2E Tests erfolgreich
- [ ] Lighthouse Score >90
- [ ] Load Testing (>500 concurrent users)
- [ ] Monitoring (Sentry, DataDog)

---

## Troubleshooting

### Drag & Drop funktioniert nicht
**Problem:** Karten lassen sich nicht verschieben

**Lösung:**
```tsx
// Sicherstellen, dass dataTransfer korrekt gesetzt wird
onDragStart={(e) => {
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("application/json", JSON.stringify(card));
}}

// onDrop muss e.preventDefault() aufrufen
onDrop={(e) => {
  e.preventDefault();
  // ...
}}
```

### Drawer öffnet sich nicht
**Problem:** Klick auf Card öffnet Drawer nicht

**Lösung:**
```tsx
// Sicherstellen, dass onClick an Card weitergegeben wird
<AgentCard
  onClick={() => setSelectedCard(card)}
  // ...
/>

// In AgentCard:
<div onClick={onClick} />
```

### LocalStorage ViewMode wird nicht geladen
**Problem:** View-Mode wird nach Reload zurückgesetzt

**Lösung:**
```tsx
useEffect(() => {
  const saved = localStorage.getItem("board.viewMode");
  if (saved === "status" || saved === "tags") {
    setViewMode(saved);
  }
}, []);
```

---

## Roadmap

### Version 3.6.0 (Q1 2025)
- [ ] **Batch-Operationen** (Multi-Select + Bulk-Status-Change)
- [ ] **Filter-Panel** mit erweiterten Optionen (Owner, Tags, Zeitraum)
- [ ] **Export-Funktion** (Board-State als JSON/CSV)
- [ ] **Card-Templates** (Vorlagen für häufige Agents)

### Version 3.7.0 (Q2 2025)
- [ ] **Real-Time Updates** via WebSocket
- [ ] **Custom Columns** (Benutzerdefinierte Status)
- [ ] **Board-Sharing** (Öffentliche Read-Only-Links)
- [ ] **Card-Comments** (Diskussionen direkt an Karten)

### Version 4.0.0 (Q3 2025)
- [ ] **Multi-Board-Support** (Mehrere Boards pro Team)
- [ ] **Advanced Analytics** (Burn-Down-Charts, Velocity)
- [ ] **Automation Rules** (Auto-Move bei bestimmten Events)
- [ ] **Mobile App** (Native iOS/Android)

---

## Support

**GitHub Issues:** [github.com/sintra/agent-system/issues](https://github.com)
**Slack:** #operations-board
**E-Mail:** support@sintra.ai

---

**© 2025 SINTRA Systems GmbH. All rights reserved.**
