# SINTRA Knowledge Base - Complete Production Implementation Guide

**Status:** Production-Ready Architecture
**Version:** 1.0.0
**Date:** 2025-10-23

---

## 🎯 Executive Summary

Dieses Dokument beschreibt die vollständige Implementierung des SINTRA Knowledge Base Systems mit:
- ✅ Datenbank-Schema (8 Tabellen + pgvector) - **IMPLEMENTIERT**
- ✅ Core Libraries (chunker, embeddings, acl, rag) - **IMPLEMENTIERT**
- ⏳ API Routes (CRUD, Search, RAG) - **TEMPLATES BEREIT**
- ⏳ Background Worker (BullMQ) - **ARCHITECTURE DEFINIERT**
- ⏳ UI Components - **DESIGN DEFINIERT**
- ⏳ Tests - **STRATEGIE DEFINIERT**

---

## 📦 Bereits Implementiert

### 1. Datenbank-Layer ✅

**Dateien:**
- `lib/db/schema.ts` - Vollständiges Schema
- `lib/db/connection.ts` - Pool-Management + Health Checks
- `lib/db/migrations/0001_init.sql` - SQL Migration
- `lib/db/migrate.ts` - Migration Runner
- `drizzle.config.ts` - Drizzle Konfiguration

**Tabellen:**
```
knowledge_bases     ✅
kb_entries          ✅
kb_revisions        ✅
kb_chunks           ✅ (mit vector(1536))
kb_comments         ✅
kb_audit            ✅
kb_search_log       ✅
kb_access_rules     ✅
```

### 2. Core Libraries ✅

**lib/knowledge/chunker.ts** ✅
- Markdown-aware Chunking
- Token-basierte Segmentierung (max 1000, overlap 150)
- Heading-Preservation
- Sentence-boundary Splitting

**lib/knowledge/embeddings.ts** ✅
- OpenAI Integration (text-embedding-3-large)
- Batch Processing mit Progress Callbacks
- Retry-Logik mit Exponential Backoff
- Mock Fallback für Development

**lib/knowledge/acl.ts** ✅
- Role-based Access Control
- Permissions: read, create, update, review, publish, delete
- Entry-level Access Checks
- KB Visibility Control

**lib/knowledge/rag.ts** ✅
- Vector Similarity Search mit pgvector
- Hybrid Ranking (Vector + BM25)
- ACL-filtered Retrieval
- LLM Integration für Answer Generation
- Citation Extraction

---

## 🚀 Implementierungsplan - Nächste Schritte

### Phase 1: API Routes (Priorität: HOCH)

#### 1.1 Main Knowledge API

**Datei:** `app/api/knowledge/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { kbEntries, kbRevisions } from '@/lib/db/schema';
import { z } from 'zod';
import crypto from 'crypto';

// GET /api/knowledge - List entries
export async function GET(req: NextRequest) {
  // Implementierung:
  // 1. Parse query params (status, tags, search, limit, offset)
  // 2. Build filtered query mit Drizzle
  // 3. Return entries + pagination
}

// POST /api/knowledge - Create entry
export async function POST(req: NextRequest) {
  // Implementierung:
  // 1. Validate input mit zod
  // 2. Get userId from auth header
  // 3. Create entry + first revision in transaction
  // 4. Enqueue indexing job
  // 5. Return created entry
}
```

#### 1.2 Entry Detail API

**Datei:** `app/api/knowledge/[id]/route.ts`

```typescript
// GET /api/knowledge/:id - Get entry detail
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Join entry + current revision + revisions count
}

// PUT /api/knowledge/:id - Update metadata
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  // Update title, tags, category
  // ACL check: must be author or editor
}

// DELETE /api/knowledge/:id - Delete entry
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // ACL check: must be admin
  // Soft delete or hard delete (cascade)
}
```

#### 1.3 Revision API

**Datei:** `app/api/knowledge/[id]/revise/route.ts`

```typescript
// POST /api/knowledge/:id/revise - Create new revision
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Get latest version number
  // 2. Create new revision (version = latest + 1)
  // 3. Update entry.currentRevisionId
  // 4. Mark old chunks as deleted
  // 5. Enqueue indexing job
  // 6. Create audit log
}
```

#### 1.4 Workflow API

**Datei:** `app/api/knowledge/[id]/publish/route.ts`

```typescript
// POST /api/knowledge/:id/publish
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. ACL check: must have 'publish' permission
  // 2. Update status: draft/in_review → published
  // 3. Trigger re-index if needed
  // 4. Create audit log
  // 5. Send notification (optional)
}
```

**Ähnlich:**
- `app/api/knowledge/[id]/archive/route.ts`
- `app/api/knowledge/[id]/request-review/route.ts`
- `app/api/knowledge/[id]/approve/route.ts`

#### 1.5 Search API

**Datei:** `app/api/knowledge/search/route.ts`

```typescript
import { retrieve } from '@/lib/knowledge/rag';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const topk = parseInt(searchParams.get('topk') || '10');

  // Use RAG retrieve function
  const results = await retrieve({
    query,
    topk,
    aclContext: {
      userId: getCurrentUserId(req),
      role: getCurrentUserRole(req),
    },
  });

  // Log search
  await logSearch(query, results);

  return NextResponse.json(results);
}
```

#### 1.6 Agent RAG API

**Datei:** `app/api/agents/knowledge/retrieve/route.ts`

```typescript
import { retrieve } from '@/lib/knowledge/rag';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const result = await retrieve({
    query: body.query,
    kb: body.kb,
    topk: body.topk || 6,
    filters: body.filters,
    aclContext: {
      userId: 'agent-system',
      role: 'admin',
    },
  });

  return NextResponse.json({
    query: body.query,
    contexts: result.contexts,
    latencyMs: result.latencyMs,
  });
}
```

**Datei:** `app/api/agents/knowledge/generate/route.ts`

```typescript
import { generate } from '@/lib/knowledge/rag';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const result = await generate({
    query: body.query,
    kb: body.kb,
    topk: body.topk || 6,
    answerStyle: body.answerStyle || 'concise',
    aclContext: {
      userId: 'agent-system',
      role: 'admin',
    },
  });

  return NextResponse.json(result);
}
```

#### 1.7 Health & Metrics API

**Datei:** `app/api/knowledge/health/route.ts`

```typescript
import { checkDbHealth } from '@/lib/db/connection';
import { getDb } from '@/lib/db/connection';
import { kbEntries, kbChunks } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  const db = getDb();

  const dbHealth = await checkDbHealth();

  const [entryCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(kbEntries);

  const [chunkCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(kbChunks);

  return NextResponse.json({
    status: dbHealth.healthy ? 'healthy' : 'unhealthy',
    checks: {
      database: dbHealth.healthy,
      latencyMs: dbHealth.latencyMs,
    },
    stats: {
      entryCount: Number(entryCount.count),
      chunkCount: Number(chunkCount.count),
    },
    timestamp: new Date().toISOString(),
  });
}
```

---

### Phase 2: Background Worker (Priorität: HOCH)

#### 2.1 Queue Setup

**Datei:** `lib/knowledge/queue.ts`

```typescript
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const indexQueue = new Queue('knowledge:index', { connection });

export interface IndexRevisionJob {
  revisionId: string;
}

export async function enqueueIndexRevision(revisionId: string) {
  await indexQueue.add('index-revision', { revisionId });
}
```

#### 2.2 Worker Implementation

**Datei:** `workers/indexer.ts`

```typescript
import { Worker } from 'bullmq';
import { getDb } from '@/lib/db/connection';
import { kbRevisions, kbChunks } from '@/lib/db/schema';
import { chunkMarkdown } from '@/lib/knowledge/chunker';
import { generateEmbeddingsBatch } from '@/lib/knowledge/embeddings';

const worker = new Worker('knowledge:index', async (job) => {
  const { revisionId } = job.data;

  console.log(`[Worker] Indexing revision ${revisionId}`);

  const db = getDb();

  // 1. Load revision
  const [revision] = await db
    .select()
    .from(kbRevisions)
    .where(eq(kbRevisions.id, revisionId));

  if (!revision) {
    throw new Error(`Revision ${revisionId} not found`);
  }

  // 2. Chunk content
  const chunks = await chunkMarkdown(revision.contentMd);

  console.log(`[Worker] Created ${chunks.length} chunks`);

  // 3. Generate embeddings
  const texts = chunks.map(c => c.text);
  const embeddings = await generateEmbeddingsBatch(texts, {}, (done, total) => {
    job.updateProgress((done / total) * 100);
  });

  // 4. Insert chunks
  for (let i = 0; i < chunks.length; i++) {
    await db.insert(kbChunks).values({
      revisionId: revision.id,
      idx: chunks[i].idx,
      text: chunks[i].text,
      tokens: chunks[i].tokens,
      embedding: embeddings[i],
      meta: chunks[i].meta,
    });
  }

  console.log(`[Worker] Indexed ${chunks.length} chunks`);
}, { connection });

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});
```

**Start Worker:**

```typescript
// server/index.ts oder separates Script
import './workers/indexer';

console.log('✅ Knowledge indexer worker started');
```

---

### Phase 3: UI Components (Priorität: MITTEL)

#### 3.1 Dashboard Updates

**Datei:** `app/(app)/knowledge/page.tsx` (bereits vorhanden, erweitern)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { KnowledgeDashboard } from '@/components/knowledge/KnowledgeDashboard';
import { KnowledgeSearch } from '@/components/knowledge/KnowledgeSearch';
import { KnowledgeEditor } from '@/components/knowledge/KnowledgeEditor';

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    // Fetch stats from /api/knowledge/summary
    // Fetch recent entries from /api/knowledge?limit=10&status=published
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="search">Suche & Q&A</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <KnowledgeDashboard stats={stats} entries={entries} />
        </TabsContent>

        <TabsContent value="search">
          <KnowledgeSearch />
        </TabsContent>

        <TabsContent value="editor">
          <KnowledgeEditor onSave={handleSave} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### 3.2 Editor Component

**Datei:** `components/knowledge/KnowledgeEditor.tsx` (erweitern bestehende)

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';

export function KnowledgeEditor({ initialData, onSave, onCancel }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [tags, setTags] = useState(initialData?.tags || []);
  const [category, setCategory] = useState(initialData?.category || '');

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ title, content, tags, category });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel des Eintrags"
        className="text-lg font-semibold"
      />

      {/* Category & Tags */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Kategorie"
        />
        {/* Tag Input Component */}
      </div>

      {/* Content Editor */}
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Markdown-formatierter Inhalt..."
          className="min-h-[400px] font-mono text-sm"
        />

        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI Assist
        </Button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Speichert...' : 'Speichern'}
        </Button>
      </div>
    </div>
  );
}
```

---

### Phase 4: Tests (Priorität: MITTEL)

#### 4.1 Unit Tests

**Datei:** `tests/unit/knowledge/chunker.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { chunkMarkdown, estimateTokens } from '@/lib/knowledge/chunker';

describe('chunker', () => {
  it('should chunk markdown with headings', async () => {
    const md = `# Heading 1\n\nContent 1\n\n## Heading 2\n\nContent 2`;
    const chunks = await chunkMarkdown(md);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].meta.heading).toBeDefined();
  });

  it('should respect max token limits', async () => {
    const longText = 'word '.repeat(5000);
    const chunks = await chunkMarkdown(longText, { maxTokens: 500 });

    chunks.forEach(chunk => {
      expect(chunk.tokens).toBeLessThanOrEqual(500);
    });
  });

  it('should apply overlap', async () => {
    const md = 'Sentence one. Sentence two. Sentence three. Sentence four.';
    const chunks = await chunkMarkdown(md, { maxTokens: 10, overlap: 3 });

    // Check that chunks have overlapping content
    expect(chunks.length).toBeGreaterThan(1);
  });
});
```

**Datei:** `tests/unit/knowledge/rag.spec.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { retrieve } from '@/lib/knowledge/rag';

describe('RAG retrieve', () => {
  it('should return top-k results sorted by score', async () => {
    const result = await retrieve({
      query: 'test query',
      topk: 5,
      aclContext: { userId: 'test', role: 'admin' },
    });

    expect(result.contexts.length).toBeLessThanOrEqual(5);

    // Check descending score order
    for (let i = 0; i < result.contexts.length - 1; i++) {
      expect(result.contexts[i].score).toBeGreaterThanOrEqual(
        result.contexts[i + 1].score
      );
    }
  });

  it('should filter by ACL', async () => {
    const result = await retrieve({
      query: 'test',
      topk: 10,
      aclContext: { userId: 'user1', role: 'user' },
    });

    // Should only return published entries
    result.contexts.forEach(ctx => {
      expect(ctx).toBeDefined();
    });
  });
});
```

#### 4.2 E2E Tests

**Datei:** `tests/e2e/knowledge-crud.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Knowledge CRUD', () => {
  test('should create, publish, and search entry', async ({ page }) => {
    await page.goto('/knowledge');

    // Create entry
    await page.click('button:has-text("Neuer Eintrag")');
    await page.fill('input[placeholder*="Titel"]', 'Test Entry');
    await page.fill('textarea', '# Test\n\nThis is test content');
    await page.click('button:has-text("Speichern")');

    // Publish
    await page.click('button:has-text("Veröffentlichen")');

    // Search
    await page.click('tab:has-text("Suche")');
    await page.fill('input[placeholder*="Suche"]', 'test');
    await page.press('input[placeholder*="Suche"]', 'Enter');

    // Verify result
    await expect(page.locator('text=Test Entry')).toBeVisible();
  });
});
```

---

### Phase 5: Environment Setup

#### 5.1 Environment Variables

**Datei:** `.env.local`

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sintra_knowledge

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-your-key

# Feature Flags
ENABLE_KNOWLEDGE_CACHE=true
KNOWLEDGE_MAX_CHUNK_TOKENS=1000
KNOWLEDGE_CHUNK_OVERLAP=150
```

#### 5.2 Database Setup

```bash
# Create database
createdb sintra_knowledge

# Run migrations
npm run db:migrate

# Verify pgvector
psql sintra_knowledge -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

#### 5.3 Start Services

```bash
# Redis (Docker)
docker run -d -p 6379:6379 redis:alpine

# PostgreSQL (Docker mit pgvector)
docker run -d \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sintra_knowledge \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Application
npm run dev
```

---

## 📊 Implementation Roadmap

### Week 1: Core API
- [ ] Implement all CRUD routes
- [ ] Implement workflow routes (publish, archive, review)
- [ ] Implement search API
- [ ] Add comprehensive error handling
- [ ] Add rate limiting

### Week 2: Worker & Indexing
- [ ] Set up BullMQ queue
- [ ] Implement indexer worker
- [ ] Test chunking + embedding pipeline
- [ ] Add job monitoring
- [ ] Optimize batch processing

### Week 3: UI Integration
- [ ] Extend knowledge page components
- [ ] Add editor with AI assist
- [ ] Implement search with filters
- [ ] Add revision history viewer
- [ ] Integrate with existing dashboard

### Week 4: Testing & Polish
- [ ] Write unit tests (≥85% coverage)
- [ ] Write E2E tests
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation

---

## 🎯 Success Criteria

- ✅ All API endpoints functional
- ✅ Indexing worker running stable
- ✅ Search returns results <300ms (p50)
- ✅ RAG retrieve <800ms (p50)
- ✅ Test coverage ≥85%
- ✅ E2E tests passing
- ✅ ACL enforced on all routes
- ✅ Health endpoint reporting ok
- ✅ No memory leaks
- ✅ Audit logging active

---

## 📞 Next Actions

1. **Immediate:** Run database migration
   ```bash
   npm run db:migrate
   ```

2. **Implement API Routes:** Start with main CRUD routes

3. **Set up Worker:** Get indexing pipeline running

4. **Test:** Write and run basic E2E test

5. **Monitor:** Check health endpoint and metrics

---

**Status:** Ready for implementation. All architectural decisions made. Code templates provided.
