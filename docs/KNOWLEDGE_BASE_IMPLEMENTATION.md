# SINTRA Knowledge Base - Production Implementation

**Version:** 1.0.0
**Status:** Phase 1 Complete - Core Foundation
**Date:** 2025-10-23

---

## 🎯 Implementation Status

### ✅ Phase 1: Foundation (COMPLETED)

#### Database Layer
- ✅ **8 Tables with pgvector** (`lib/db/schema.ts`)
  - knowledge_bases (with visibility control)
  - kb_entries (with status workflow)
  - kb_revisions (with checksum & versioning)
  - kb_chunks (with vector(1536) embeddings)
  - kb_comments
  - kb_audit
  - kb_search_log
  - kb_access_rules

- ✅ **Database Connection** (`lib/db/connection.ts`)
  - Pool management with health checks
  - pgvector extension enablement
  - Graceful shutdown

- ✅ **Migration System** (`lib/db/migrations/0001_init.sql`)
  - Full schema with indexes (HNSW for vectors)
  - Full-text search with tsvector
  - Auto-update triggers
  - Enums for type safety

#### Core Libraries

- ✅ **Chunker** (`lib/knowledge/chunker.ts`)
  - Markdown-aware parsing with heading preservation
  - Configurable token limits (default: 1000 tokens)
  - Overlap support (default: 150 tokens)
  - Sentence-boundary splitting
  - Handles long documents gracefully

- ✅ **Embeddings** (`lib/knowledge/embeddings.ts`)
  - OpenAI text-embedding-3-large integration
  - Batch processing with progress callbacks
  - Exponential backoff retry logic
  - Mock embeddings for development
  - Rate limiting between batches

- ✅ **Access Control (ACL)** (`lib/knowledge/acl.ts`)
  - Role-based permissions (user, editor, reviewer, admin)
  - Knowledge base visibility (org, private)
  - Entry-level access control
  - Status-based filtering
  - Team and user-level access rules

- ✅ **RAG Engine** (`lib/knowledge/rag.ts`)
  - Vector similarity search with pgvector
  - Hybrid ranking (vector + optional BM25)
  - ACL-filtered retrieval
  - Context generation with citations
  - LLM integration for answer generation
  - Configurable answer styles (concise, detailed, steps)

---

## 📋 Phase 2: API & Ingestion (TODO)

### Required API Routes

#### CRUD Operations
```typescript
// Base CRUD
POST   /api/knowledge                // Create entry
GET    /api/knowledge                // List entries (with filters)
GET    /api/knowledge/:id            // Get entry + current revision
POST   /api/knowledge/:id/revise     // Create new revision
PUT    /api/knowledge/:id            // Update entry metadata
DELETE /api/knowledge/:id            // Delete entry

// Revisions
GET    /api/knowledge/:id/revisions  // List all revisions
GET    /api/knowledge/:id/revisions/:vid  // Get specific revision

// Comments
GET    /api/knowledge/:id/comments   // Get comments
POST   /api/knowledge/:id/comments   // Add comment

// Workflow
POST   /api/knowledge/:id/request-review
POST   /api/knowledge/:id/approve
POST   /api/knowledge/:id/reject
POST   /api/knowledge/:id/publish
POST   /api/knowledge/:id/archive
```

#### Search & RAG
```typescript
// Search API
GET    /api/knowledge/search?q=&kb=&tags=&status=&topk=

// Agent RAG API
POST   /api/agents/knowledge/retrieve
POST   /api/agents/knowledge/generate
```

#### Admin & Health
```typescript
GET    /api/knowledge/health
GET    /api/knowledge/metrics
GET    /api/knowledge/summary       // KPIs
GET    /api/knowledge/recent        // Recent entries
POST   /api/knowledge/reindex/:kbId
```

### Ingestion Pipeline

**File:** `lib/knowledge/ingestion.ts`

```typescript
interface IngestionJob {
  revisionId: string;
  sourceType: 'note' | 'url' | 'file';
  content: string;
  sourceUri?: string;
}

// Functions needed:
- processIngestion(job: IngestionJob)
- parseURL(url: string): Promise<string>
- parsePDF(buffer: Buffer): Promise<string>
- parseMarkdown(md: string): Promise<string>
- generateChecksum(content: string): string
- indexRevision(revisionId: string): Promise<void>
```

### Background Jobs (BullMQ)

**File:** `workers/indexer.ts`

```typescript
// Job types:
- job:index.revision(revision_id)
- job:reindex.kb(kb_id)
- job:cleanup.orphaned()
- job:sync.search_vectors()
```

---

## 📦 Phase 3: UI Components (TODO)

### Pages Structure
```
app/(app)/knowledge/
├── page.tsx                 # Main dashboard with tabs
├── [id]/
│   ├── page.tsx            # Entry detail view
│   ├── edit/page.tsx       # Editor
│   └── revisions/page.tsx  # Revision history
└── new/page.tsx            # Create new entry
```

### Components Needed

#### Dashboard
```typescript
// components/knowledge/KnowledgeDashboard.tsx
- KPI cards (Total, Changes 24h, Pending Reviews, Popular Tags)
- Recent entries table with bulk actions
- Quick filters
```

#### Editor
```typescript
// components/knowledge/KnowledgeEditor.tsx
- Title, category, tags inputs
- Markdown editor with preview
- Autosave indicator
- AI Assist buttons
- Word count
- Citation picker
```

#### Search
```typescript
// components/knowledge/KnowledgeSearch.tsx
- Mode toggle (Search | Q&A)
- Autocomplete with filters
- Results list with highlighting
- Source citations with jump-to
```

#### Revisions
```typescript
// components/knowledge/RevisionHistory.tsx
- Timeline view
- Side-by-side diff viewer
- Publish/Revert actions
```

---

## 🧪 Phase 4: Tests (TODO)

### Unit Tests (Vitest)

**Target: ≥85% coverage**

```typescript
// tests/unit/knowledge/chunker.spec.ts
- Heading-aware chunking
- Token limits respected
- Overlap calculation
- Edge cases (empty, huge docs)

// tests/unit/knowledge/embeddings.spec.ts
- Batch processing
- Retry with backoff
- Mock fallback
- Rate limiting

// tests/unit/knowledge/acl.spec.ts
- Role permissions
- Entry access by status
- KB visibility rules
- Filter accessible entries

// tests/unit/knowledge/rag.spec.ts
- Vector retrieval
- ACL filtering
- Score ranking
- Citation extraction
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/knowledge-crud.spec.ts
- Create entry → Revise → Publish → Search
- Bulk operations
- Delete and restore

// tests/e2e/knowledge-rag.spec.ts
- Ask question → Get answer with citations
- Click citation → Jump to source
- Verify ACL enforcement

// tests/e2e/knowledge-review.spec.ts
- Request review
- Approve/Reject flow
- Check audit log

// tests/e2e/knowledge-a11y.spec.ts
- Keyboard navigation
- Screen reader labels
- Focus management
- Color contrast
```

---

## 📊 Phase 5: Observability (TODO)

### Metrics Endpoint

**File:** `app/api/knowledge/metrics/route.ts`

```typescript
interface KnowledgeMetrics {
  index_backlog: number;
  index_latency_ms: { p50: number; p95: number };
  search_latency_ms: { p50: number; p95: number };
  retrieval_cache_hit_ratio: number;
  published_entry_count: number;
  chunk_count: number;
  embedding_queue_depth: number;
}
```

### Health Check

**File:** `app/api/knowledge/health/route.ts`

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
    embeddings_api: boolean;
  };
  index_backlog: number;
  last_job_run: string;
}
```

---

## 🔐 Security & Compliance

### Rate Limiting
- **Search:** 10 req/min per user
- **AI Q&A:** 5 req/min per user
- **General:** 30 req/5min per user

### Redaction
- PII in logs (lib/security/redact.ts)
- API tokens in audit logs
- URLs in search logs

### Data Retention
- **Revisions:** 90 days
- **Audit Logs:** 180 days
- **Archived Entries:** 1 year

---

## 🚀 Deployment Checklist

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=********
DB_NAME=sintra_knowledge
DB_POOL_SIZE=20

# OpenAI
OPENAI_API_KEY=sk-********

# Redis
REDIS_URL=redis://localhost:6379

# Feature Flags
USE_LOCAL_EMBEDDINGS=false
ENABLE_CACHE=true
```

### Prerequisites
1. PostgreSQL 15+ with pgvector extension
2. Redis 6+
3. Node.js 18+
4. OpenAI API key (or local embedding model)

### Database Setup

```bash
# Install PostgreSQL + pgvector
sudo apt install postgresql-15 postgresql-15-pgvector

# Create database
createdb sintra_knowledge

# Run migrations
npm run db:migrate

# Verify
psql sintra_knowledge -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

### Application Deployment

```bash
# Install dependencies
npm ci

# Build
npm run build
npm run build:backend

# Start
npm run start
```

---

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| RAG Retrieve (p50) | ≤ 800ms | TBD |
| Search (p50) | ≤ 300ms | TBD |
| Index Job | ≤ 5s/revision | TBD |
| Concurrent Users | 100+ | TBD |
| Chunks per Entry | ≤ 50 | TBD |

---

## 🎯 Acceptance Criteria (DoD)

- [x] Database schema with 8 tables + pgvector
- [x] Core libraries (chunker, embeddings, ACL, RAG)
- [ ] Complete CRUD API routes
- [ ] Ingestion pipeline with file/URL support
- [ ] Background job system (BullMQ)
- [ ] UI with dashboard, editor, search
- [ ] RAG API for agents with citations
- [ ] Unit tests with ≥85% coverage
- [ ] E2E tests (CRUD, RAG, Review, A11y)
- [ ] Health & metrics endpoints
- [ ] CI/CD integration
- [ ] Documentation complete

---

## 🔄 Next Steps

### Immediate (Phase 2)
1. Implement API routes for CRUD operations
2. Build ingestion pipeline
3. Set up BullMQ worker for indexing
4. Create Redis cache layer

### Short-term (Phase 3)
1. Build UI components (Dashboard, Editor, Search)
2. Implement workflow UI (Review, Approve, Publish)
3. Add real-time updates via WebSocket

### Medium-term (Phase 4-5)
1. Write comprehensive test suite
2. Set up observability stack
3. Performance tuning
4. Production deployment

---

## 📚 File Structure

```
lib/
├── db/
│   ├── schema.ts              ✅ Complete
│   ├── connection.ts          ✅ Complete
│   ├── migrate.ts             ✅ Complete
│   └── migrations/
│       └── 0001_init.sql      ✅ Complete
├── knowledge/
│   ├── chunker.ts             ✅ Complete
│   ├── embeddings.ts          ✅ Complete
│   ├── acl.ts                 ✅ Complete
│   ├── rag.ts                 ✅ Complete
│   ├── ingestion.ts           ⏳ TODO
│   └── search.ts              ⏳ TODO
└── security/
    └── redact.ts              ⏳ TODO

app/api/knowledge/
├── route.ts                   ⏳ TODO (CRUD)
├── [id]/route.ts              ⏳ TODO
├── search/route.ts            ⏳ TODO
├── health/route.ts            ⏳ TODO
├── metrics/route.ts           ⏳ TODO
└── ...

app/api/agents/knowledge/
├── retrieve/route.ts          ⏳ TODO
└── generate/route.ts          ⏳ TODO

workers/
└── indexer.ts                 ⏳ TODO

tests/
├── unit/
│   └── knowledge/             ⏳ TODO
└── e2e/
    └── knowledge/             ⏳ TODO
```

---

## 💡 Implementation Notes

### Why Drizzle ORM?
- Type-safe SQL queries
- Great PostgreSQL support including pgvector
- Lightweight and fast
- Excellent migration system

### Why BullMQ?
- Redis-based queue (reliable, fast)
- Built-in retry logic
- Job scheduling
- Progress tracking

### Embedding Strategy
- Primary: OpenAI text-embedding-3-large (1536 dims)
- Fallback: Mock embeddings for dev
- Future: Local models (Instructor, miniLM)

### Search Strategy
- **Vector Search:** pgvector with HNSW index
- **Text Search:** PostgreSQL tsvector (full-text)
- **Hybrid:** Weighted combination (0.7 vector + 0.3 text)

---

## 🆘 Troubleshooting

### pgvector not found
```bash
# Install extension
sudo apt install postgresql-15-pgvector

# Enable in database
psql sintra_knowledge -c "CREATE EXTENSION vector;"
```

### Slow vector search
```sql
-- Check index
\d+ kb_chunks

-- Rebuild HNSW index
REINDEX INDEX kb_chunk_embedding_idx;

-- Tune m and ef_construction
CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### High memory usage
- Reduce DB pool size (DB_POOL_SIZE)
- Limit batch size for embeddings
- Enable Redis caching

---

**Status:** Core foundation complete. Ready for Phase 2 implementation.
