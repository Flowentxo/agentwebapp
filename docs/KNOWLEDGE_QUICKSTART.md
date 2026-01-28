# SINTRA Knowledge Base - Quick Start Guide

🚀 **Schnellstart-Anleitung für das Enterprise Knowledge Management System**

---

## ✅ Was ist bereits fertig?

### Phase 1: Foundation (100% Complete)

1. **Datenbank-Schema** ✅
   - 8 Tabellen mit pgvector
   - Vollständige Migrations
   - Indizes optimiert

2. **Core Libraries** ✅
   - `lib/knowledge/chunker.ts` - Markdown Chunking
   - `lib/knowledge/embeddings.ts` - OpenAI Integration
   - `lib/knowledge/acl.ts` - Access Control
   - `lib/knowledge/rag.ts` - RAG Engine

3. **Infrastruktur** ✅
   - Drizzle ORM konfiguriert
   - Dependencies installiert
   - NPM Scripts bereit

---

## 🚀 Quick Start (5 Minuten)

### Schritt 1: Datenbank Setup

```bash
# PostgreSQL mit pgvector starten (Docker)
docker run -d \
  --name postgres-knowledge \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sintra_knowledge \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Redis starten
docker run -d --name redis-knowledge -p 6379:6379 redis:alpine
```

### Schritt 2: Environment Variables

Erstelle `.env.local`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=sintra_knowledge
DB_POOL_SIZE=20

REDIS_URL=redis://localhost:6379

OPENAI_API_KEY=sk-your-key-here

ENABLE_KNOWLEDGE_CACHE=true
```

### Schritt 3: Migration ausführen

```bash
npm run db:migrate
```

**Erwartete Ausgabe:**
```
🔄 Connecting to database...
📁 Reading migration files...
Found 1 migration file(s)

⚡ Running migration: 0001_init.sql
✅ Migration 0001_init.sql completed successfully

✅ All migrations completed successfully
```

### Schritt 4: Datenbank verifizieren

```bash
psql sintra_knowledge -c "\dt"
```

**Sollte zeigen:**
```
 knowledge_bases
 kb_entries
 kb_revisions
 kb_chunks
 kb_comments
 kb_audit
 kb_search_log
 kb_access_rules
```

### Schritt 5: Test-Daten erstellen

```typescript
// scripts/seed-knowledge.ts
import { getDb } from './lib/db/connection';
import { knowledgeBases, kbEntries, kbRevisions } from './lib/db/schema';

async function seed() {
  const db = getDb();

  // Create default knowledge base
  const [kb] = await db.insert(knowledgeBases).values({
    name: 'SINTRA Documentation',
    slug: 'sintra-docs',
    visibility: 'org',
    createdBy: 'admin',
  }).returning();

  console.log('✅ Knowledge base created:', kb.id);

  // Create sample entry
  const [entry] = await db.insert(kbEntries).values({
    kbId: kb.id,
    title: 'Getting Started with SINTRA',
    status: 'published',
    authorId: 'admin',
    tags: ['documentation', 'getting-started'],
    category: 'Documentation',
  }).returning();

  console.log('✅ Entry created:', entry.id);

  // Create first revision
  const [revision] = await db.insert(kbRevisions).values({
    entryId: entry.id,
    version: 1,
    contentMd: '# Getting Started\n\nThis is the getting started guide...',
    sourceType: 'note',
    checksum: 'abc123',
    createdBy: 'admin',
  }).returning();

  console.log('✅ Revision created:', revision.id);
}

seed();
```

```bash
tsx scripts/seed-knowledge.ts
```

---

## 📋 Nächste Schritte (Implementierung)

### Option A: API-First Approach (Empfohlen)

1. **Implementiere CRUD API** (30 min)
   - Kopiere Templates aus `KNOWLEDGE_COMPLETE_IMPLEMENTATION.md`
   - Implementiere `app/api/knowledge/route.ts`
   - Teste mit curl/Postman

2. **Implementiere RAG API** (20 min)
   - `app/api/agents/knowledge/retrieve/route.ts`
   - `app/api/agents/knowledge/generate/route.ts`
   - Teste mit Agent-System

3. **Indexing Worker** (30 min)
   - `lib/knowledge/queue.ts`
   - `workers/indexer.ts`
   - Starte Worker-Process

### Option B: UI-First Approach

1. **Dashboard erweitern**
   - Stats von `/api/knowledge/summary`
   - Recent entries anzeigen

2. **Editor implementieren**
   - Create/Edit UI
   - Markdown Preview

3. **Search UI**
   - Suchfeld + Filter
   - Ergebnisliste

---

## 🧪 Testing Quick Start

### Unit Test ausführen

```bash
npm run test:unit -- tests/unit/knowledge/chunker.spec.ts
```

### E2E Test (nach UI-Implementierung)

```bash
npm run test:api -- tests/e2e/knowledge-crud.spec.ts
```

---

## 🔧 Development Workflow

### 1. Feature entwickeln

```bash
# Branch erstellen
git checkout -b feature/knowledge-api

# Entwickeln...

# Tests schreiben
npm run test:unit:watch
```

### 2. API testen

```bash
# Health check
curl http://localhost:3000/api/knowledge/health

# Create entry
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin" \
  -d '{
    "kbId": "...",
    "title": "Test Entry",
    "contentMd": "# Test\n\nContent",
    "tags": ["test"]
  }'

# Search
curl "http://localhost:3000/api/knowledge/search?q=test&topk=5"

# RAG Retrieve
curl -X POST http://localhost:3000/api/agents/knowledge/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to use SINTRA?",
    "topk": 5
  }'
```

### 3. Worker starten

```bash
# Terminal 1: App
npm run dev

# Terminal 2: Worker
tsx workers/indexer.ts
```

---

## 📊 Monitoring & Debugging

### Health Check

```bash
curl http://localhost:3000/api/knowledge/health | jq
```

**Erwartete Antwort:**
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "latencyMs": 12
  },
  "stats": {
    "entryCount": 5,
    "chunkCount": 42
  },
  "timestamp": "2025-10-23T..."
}
```

### Datenbank-Queries debuggen

```sql
-- Check entries
SELECT id, title, status, created_at FROM kb_entries;

-- Check chunks
SELECT
  c.id,
  e.title,
  c.text,
  c.tokens
FROM kb_chunks c
JOIN kb_revisions r ON c.revision_id = r.id
JOIN kb_entries e ON r.entry_id = e.id
LIMIT 10;

-- Check embeddings
SELECT id, tokens, embedding IS NOT NULL as has_embedding
FROM kb_chunks
LIMIT 5;
```

### Logs analysieren

```bash
# App logs
npm run dev 2>&1 | grep knowledge

# Worker logs
tsx workers/indexer.ts 2>&1 | grep "Worker"
```

---

## 🎯 MVP Checklist (1-2 Tage)

### Day 1: Backend
- [ ] Migration läuft ✅
- [ ] Test-Daten erstellt ✅
- [ ] CRUD API implementiert
- [ ] Health endpoint aktiv
- [ ] RAG retrieve funktioniert

### Day 2: Integration
- [ ] Worker indexiert Revisionen
- [ ] Dashboard zeigt Stats
- [ ] Search gibt Ergebnisse zurück
- [ ] Agent kann RAG nutzen
- [ ] Basic E2E Test läuft

---

## 🚨 Troubleshooting

### Problem: Migration schlägt fehl

```bash
# pgvector Extension manuell aktivieren
psql sintra_knowledge -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Migration erneut ausführen
npm run db:migrate
```

### Problem: "Cannot find module '@/lib/db/connection'"

```bash
# tsconfig.json prüfen
cat tsconfig.json | grep paths

# Falls nötig:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Problem: Embeddings schlagen fehl

```env
# .env.local - API Key prüfen
OPENAI_API_KEY=sk-...

# Oder Mock-Modus aktivieren (Development)
# Code fällt automatisch auf Mock zurück wenn kein API Key
```

### Problem: Hohe Latenz bei Vector Search

```sql
-- HNSW Index prüfen
\d+ kb_chunks

-- Index neu bauen
REINDEX INDEX kb_chunk_embedding_idx;

-- Statistiken aktualisieren
ANALYZE kb_chunks;
```

---

## 📚 Weitere Ressourcen

- **Vollständige Implementierung:** `KNOWLEDGE_COMPLETE_IMPLEMENTATION.md`
- **Architektur-Dokumentation:** `KNOWLEDGE_BASE_IMPLEMENTATION.md`
- **API Spezifikation:** `ui-knowledge-enterprise.md`

---

## 🤝 Support

Bei Problemen:
1. Check Health Endpoint
2. Logs analysieren
3. Database queries testen
4. Issue erstellen mit Details

---

**Status:** Production-Ready Foundation ✅
**Next:** API Implementation 🚀
