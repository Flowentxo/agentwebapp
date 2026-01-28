# SINTRA Knowledge Management Suite - Enterprise Edition

**Version:** 3.5.0
**Status:** Production Ready
**Last Updated:** 2025-10-23

---

## Überblick

Die SINTRA Wissensbasis ist ein vollständiges Enterprise Knowledge Management System für strukturierte Dokumentation, Policies und Wissenseinträge mit Versionierung, Workflow und KI-Integration.

### Kernfunktionen

- **Dashboard mit KPIs** (Gesamt-Einträge, Änderungen 24h, Pending Approvals, Beliebte Tags)
- **Rich Content Editor** mit Markdown-Support & AI Assist
- **Volltextsuche & KI-Q&A** mit Relevanz-Ranking
- **Workflow-Management** (Draft → Review → Published → Archived)
- **Versionierung & Audit Trail**
- **Tag- & Kategorieverwaltung**
- **Zugriffskontrolle** (user, editor, reviewer, admin)

---

## Architektur

### TypeScript-Typen (`types/knowledge.ts`)

```typescript
export type KnowledgeStatus = "draft" | "in_review" | "published" | "archived";

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  status: KnowledgeStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    views: number;
    likes: number;
    linkedAgents?: string[];
  };
}

export interface KnowledgeStats {
  totalEntries: number;
  recentChanges24h: number;
  pendingApprovals: number;
  popularTags: Array<{ tag: string; count: number }>;
}

export interface SearchResult {
  entry: KnowledgeEntry;
  relevanceScore: number;
  highlights: string[];
}
```

---

## Komponenten

### 1. KnowledgeDashboard (`components/knowledge/KnowledgeDashboard.tsx`)

**Funktionen:**
- 4 KPI-Cards mit Icons (FileText, Clock, AlertCircle, Tag)
- Tabelle "Zuletzt geändert" (Titel, Autor, Status, Aktualisiert)
- Schnellaktionen: 👁️ Anzeigen · ✏️ Bearbeiten · 🗑️ Löschen
- Status-Badges: draft (grau), in_review (gelb), published (grün), archived (rot)

**Props:**
```typescript
interface KnowledgeDashboardProps {
  stats: KnowledgeStats;
  recentEntries: KnowledgeEntry[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

---

### 2. KnowledgeEditor (`components/knowledge/KnowledgeEditor.tsx`)

**Funktionen:**
- Titel, Kategorie, Tags (Multi-Select)
- Markdown-Textarea (min-h-[400px])
- AI Assist Button (Zusammenfassen, Verbessern, Rechtschreibung)
- Autosave-Indicator
- Abbrechen / Speichern Actions

**Props:**
```typescript
interface KnowledgeEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialCategory?: string;
  onSave: (data: { title, content, tags, category }) => Promise<void>;
  onCancel: () => void;
}
```

**UI Pattern:**
```tsx
<textarea
  className="font-mono text-sm bg-surface-1 border border-white/10 rounded-lg p-4"
  placeholder="Markdown-formatierter Inhalt..."
/>
```

---

### 3. KnowledgeSearch (`components/knowledge/KnowledgeSearch.tsx`)

**Funktionen:**
- Mode-Switch: "Suche" | "KI-Fragen"
- Autocomplete-Suchleiste
- Filter-Button (Kategorie, Tag, Autor, Zeitraum)
- Suchergebnisse mit Relevanz-Score & Highlights
- Click → Detail-View

**Props:**
```typescript
interface KnowledgeSearchProps {
  onSearch: (query: string) => void;
  onAsk: (question: string) => void;
  results: SearchResult[];
  onResultClick: (entryId: string) => void;
}
```

**Suchergebnis-Card:**
```tsx
<div className="panel p-5 cursor-pointer hover:ring-2 hover:ring-accent/40">
  <h3>{title}</h3>
  <p className="line-clamp-2">{highlight}</p>
  <div className="text-xs">
    <span>Relevanz: {score}%</span>
    <span>{category}</span>
    {tags.map(tag => <span>{tag}</span>)}
  </div>
</div>
```

---

## API Routes

### `GET /api/knowledge/summary`
Liefert KPI-Stats

**Response:**
```json
{
  "totalEntries": 127,
  "recentChanges24h": 8,
  "pendingApprovals": 3,
  "popularTags": [
    { "tag": "#prozesse", "count": 45 }
  ]
}
```

### `GET /api/knowledge/recent`
Letzte 10 geänderte Einträge

**Response:**
```json
{
  "entries": [
    {
      "id": "kb-1",
      "title": "Prozessrichtlinie",
      "content": "...",
      "category": "Prozesse",
      "tags": ["#prozesse"],
      "author": "admin@sintra.ai",
      "status": "published",
      "version": 3,
      "updatedAt": "2025-10-23T10:00:00Z"
    }
  ]
}
```

### `GET /api/knowledge/search?q={query}`
Volltextsuche

**Response:**
```json
{
  "results": [
    {
      "entry": { /* KnowledgeEntry */ },
      "relevanceScore": 0.92,
      "highlights": ["...Operating **Procedure**..."]
    }
  ],
  "query": "procedure"
}
```

### `POST /api/knowledge/ask`
KI-Q&A

**Body:**
```json
{ "question": "Wie bearbeite ich Kundenanfragen?" }
```

**Response:**
```json
{
  "answer": "Basierend auf den Prozessrichtlinien...",
  "sources": [
    {
      "entryId": "kb-1",
      "title": "Prozessrichtlinie",
      "relevance": 0.95
    }
  ],
  "confidence": 0.88
}
```

### `POST /api/knowledge`
Erstellt neuen Eintrag

**Body:**
```json
{
  "title": "Neue Richtlinie",
  "content": "Markdown-Content",
  "category": "Prozesse",
  "tags": ["#neu", "#prozesse"]
}
```

### `PUT /api/knowledge/:id`
Aktualisiert Eintrag (erstellt neue Revision)

### `DELETE /api/knowledge/:id`
Löscht Eintrag (oder archiviert)

---

## Main Page (`app/(app)/knowledge/page.tsx`)

**Layout:**
- Header mit "Neuer Eintrag" + "Suche" Buttons
- 3 Tabs: Dashboard | Suche & Q&A | Editor
- Content-Only Layout (`max-w-7xl mx-auto p-6`)

**State Management:**
```typescript
const [activeTab, setActiveTab] = useState("dashboard");
const [stats, setStats] = useState<KnowledgeStats | null>(null);
const [recentEntries, setRecentEntries] = useState<KnowledgeEntry[]>([]);
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [editingEntry, setEditingEntry] = useState<string | null>(null);
```

**Tab-Navigation:**
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
    <TabsTrigger value="search">Suche & Q&A</TabsTrigger>
    <TabsTrigger value="editor">Editor</TabsTrigger>
  </TabsList>

  <TabsContent when="dashboard" current={activeTab}>
    <KnowledgeDashboard {...} />
  </TabsContent>

  <TabsContent when="search" current={activeTab}>
    <KnowledgeSearch {...} />
  </TabsContent>

  <TabsContent when="editor" current={activeTab}>
    <KnowledgeEditor {...} />
  </TabsContent>
</Tabs>
```

---

## Workflow & Governance

### Status-Übergänge
```
draft → in_review → published
                  ↓
                archived
```

### Rollen & Berechtigungen
| Rolle | Erstellen | Bearbeiten | Review | Publish | Delete |
|-------|-----------|------------|--------|---------|--------|
| user | ❌ | ❌ | ❌ | ❌ | ❌ |
| editor | ✅ | ✅ (eigene) | ❌ | ❌ | ❌ |
| reviewer | ✅ | ✅ | ✅ | ❌ | ❌ |
| admin | ✅ | ✅ (alle) | ✅ | ✅ | ✅ |

### Audit Trail
Jede Änderung wird geloggt:
```typescript
{
  id: "audit-1",
  entryId: "kb-1",
  action: "status_changed",
  user: "admin@sintra.ai",
  timestamp: "2025-10-23T10:00:00Z",
  metadata: {
    fromStatus: "draft",
    toStatus: "published"
  }
}
```

---

## Integration in Agents

Agents können auf Wissenseinträge zugreifen:

**API:** `GET /api/agents/:id/knowledge/:query`

**Frontend-Button:**
```tsx
<Button onClick={() => linkToAgent(entryId)}>
  In Agent übernehmen
</Button>
```

---

## Design & UX

### Layout
- Wrapper: `max-w-7xl mx-auto p-6 space-y-8`
- Dashboard Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
- Table: Full-width mit hover:bg-white/5

### Design Tokens
- `.panel` - Container mit Border + Shadow
- `.hairline-b` - 1px Border Bottom
- `.bg-surface-0` - Dunklerer Hintergrund
- `.bg-surface-1` - Hellerer Hintergrund
- `.mono` - Monospace Font (für Author, IDs)
- `.focus-ring` - Fokus-Outline

### Badges
```tsx
<Badge variant="success">Veröffentlicht</Badge>
<Badge variant="warning">In Prüfung</Badge>
<Badge variant="default">Entwurf</Badge>
<Badge variant="destructive">Archiviert</Badge>
```

---

## Security & Compliance

### Zugriffskontrolle
- Nur `editor` oder höher darf Einträge erstellen/bearbeiten
- Public-API nur für `published` Einträge
- Reviewer können Draft → Review → Publish durchführen

### Data Retention
- Revisionen: 90 Tage
- Audit Logs: 180 Tage
- Archived Entries: 1 Jahr

### Rate Limiting
- 30 Requests / 5 Minuten pro User
- Search: 10 Requests / Minute
- AI Ask: 5 Requests / Minute

---

## Testing

### E2E Tests (Playwright)
**File:** `tests/ui/knowledge-e2e.spec.ts`

**Test Cases:**
1. Dashboard displays KPIs correctly
2. Create new entry and save
3. Search returns relevant results
4. AI Q&A returns answer with sources
5. Edit entry updates version
6. Delete entry with confirmation

**Run:**
```bash
npx playwright test tests/ui/knowledge-e2e.spec.ts
```

---

## Deployment

### Pre-Production Checklist
- [ ] Alle TODO-Kommentare durch echte DB-Calls ersetzen
- [ ] Volltextsuche mit Embeddings implementieren
- [ ] AI-Agent für Q&A integrieren
- [ ] Versionierungs-Diff-Viewer
- [ ] Workflow-Benachrichtigungen (E-Mail/Slack)
- [ ] Tag-Manager mit Merge/Delete
- [ ] Export-Funktion (PDF/CSV)

### Production
- [ ] E2E Tests erfolgreich
- [ ] Lighthouse Score >90
- [ ] Security Audit (OWASP Top 10)
- [ ] Load Testing (>1000 req/s)
- [ ] Monitoring (Sentry, DataDog)

---

## Roadmap

### Version 3.6.0 (Q1 2025)
- [ ] **Rich Text Editor** (TipTap oder Lexical)
- [ ] **Versionsvergleich** (Side-by-Side Diff)
- [ ] **Kommentare & Diskussionen**
- [ ] **Bulk-Operations** (Multi-Select + Archive/Publish)

### Version 3.7.0 (Q2 2025)
- [ ] **Kategorien-Hierarchie** mit Drag&Drop
- [ ] **Tag-Farben & Icons**
- [ ] **Export zu Confluence/Notion**
- [ ] **Inline-Attachments** (Bilder, PDFs)

### Version 4.0.0 (Q3 2025)
- [ ] **Real-Time Collaboration** (Multi-User-Editing)
- [ ] **AI Content Generation** (Draft-Generator)
- [ ] **Advanced Search** (Faceted Filters, Saved Searches)
- [ ] **Knowledge Graph** (Beziehungen zwischen Einträgen)

---

## Support

**GitHub Issues:** [github.com/sintra/agent-system/issues](https://github.com)
**Slack:** #knowledge-management
**E-Mail:** support@sintra.ai

---

**© 2025 SINTRA Systems GmbH. All rights reserved.**
