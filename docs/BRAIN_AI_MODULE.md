# 🧠 Brain AI Module - Complete Documentation

**Version**: 1.0.0
**Status**: ✅ Production Ready
**Last Updated**: 2025-10-26

---

## 📋 Overview

Brain AI is an intelligent knowledge management and context-aware system that provides semantic search, RAG (Retrieval-Augmented Generation), and conversation context tracking for the SINTRA.AI platform.

### Key Features

✅ **Hybrid Search**: 70% Vector Similarity + 30% Full-Text Search
✅ **RAG Pipeline**: Context-aware document retrieval for LLM reasoning
✅ **Session Management**: Track and analyze conversation contexts
✅ **Smart Caching**: Redis-backed caching for embeddings and queries
✅ **Real-time Updates**: WebSocket support for live synchronization
✅ **Multi-Tenancy**: Workspace-based isolation
✅ **Auto-Cleanup**: Expired context management
✅ **Analytics**: Query logging and popularity tracking

---

## 🏗️ Architecture

### Tech Stack

- **Database**: PostgreSQL 15+ with pgvector extension
- **Vector Search**: HNSW index for fast similarity search
- **Full-Text Search**: PostgreSQL tsvector/tsquery
- **Cache Layer**: Redis for ephemeral storage
- **ORM**: Drizzle ORM for type-safe queries
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Runtime**: Node.js with Next.js 14

### Core Components

1. **EmbeddingService** - OpenAI API integration for vector embeddings
2. **KnowledgeIndexer** - Document processing and chunking
3. **ContextManager** - Session and conversation tracking
4. **BrainService** - RAG query interface with hybrid search
5. **RedisCache** - Caching and real-time updates

---

## 📊 Database Schema

### brain_documents

Central knowledge repository with vector embeddings.

```sql
CREATE TABLE brain_documents (
  id UUID PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL DEFAULT 'default-workspace',
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(64), -- SHA-256 for deduplication
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding vector(1536), -- OpenAI embedding
  search_vector TEXT, -- tsvector for full-text
  chunk_index INTEGER,
  parent_doc_id UUID, -- For multi-chunk docs
  token_count INTEGER NOT NULL DEFAULT 0,
  access_level VARCHAR(50) NOT NULL DEFAULT 'workspace',
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Indexes**:
- HNSW vector index for cosine similarity
- GIN index for full-text search
- B-tree indexes on workspace_id, content_hash, created_at

### brain_contexts

Session and conversation context tracking.

```sql
CREATE TABLE brain_contexts (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  workspace_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255),
  context_type VARCHAR(100) NOT NULL DEFAULT 'conversation',
  context_snapshot JSONB NOT NULL DEFAULT '{}',
  embedding vector(1536),
  relevance_score INTEGER DEFAULT 0, -- 0-100
  token_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP, -- Auto-cleanup
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### brain_learnings

AI-discovered patterns and insights.

```sql
CREATE TABLE brain_learnings (
  id UUID PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL,
  pattern TEXT NOT NULL,
  insight TEXT NOT NULL,
  category VARCHAR(100),
  confidence INTEGER NOT NULL DEFAULT 50, -- 0-100
  evidence_count INTEGER NOT NULL DEFAULT 1,
  related_context_ids JSONB DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding vector(1536),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validated_by VARCHAR(255),
  validated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### brain_query_logs

Query analytics and performance tracking.

```sql
CREATE TABLE brain_query_logs (
  id UUID PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  agent_id VARCHAR(255),
  query TEXT NOT NULL,
  query_embedding vector(1536),
  result_count INTEGER NOT NULL DEFAULT 0,
  top_result_ids JSONB DEFAULT '[]',
  response_time INTEGER, -- milliseconds
  was_helpful BOOLEAN,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

### 1. POST /api/brain/query

Semantic search with hybrid ranking.

**Request**:
```json
{
  "query": "How do I configure authentication?",
  "workspaceId": "default-workspace",
  "userId": "user-123",
  "searchType": "hybrid",
  "limit": 10,
  "minSimilarity": 0.6,
  "includeContext": true,
  "filters": {
    "tags": ["authentication", "security"],
    "category": "documentation"
  }
}
```

**Response**:
```json
{
  "success": true,
  "query": "How do I configure authentication?",
  "results": [
    {
      "id": "doc-123",
      "title": "Authentication Setup Guide",
      "content": "To configure authentication...",
      "similarity": 0.89,
      "metadata": {
        "tags": ["authentication"],
        "category": "documentation"
      }
    }
  ],
  "context": "User recently asked about login issues",
  "suggestions": ["OAuth", "JWT", "API Keys"],
  "totalResults": 5,
  "searchType": "hybrid",
  "responseTime": 234
}
```

### 2. POST /api/brain/ingest

Upload and index documents.

**Request**:
```json
{
  "documents": [
    {
      "title": "Product Documentation",
      "content": "This is the complete product documentation...",
      "metadata": {
        "source": "docs",
        "sourceType": "upload",
        "tags": ["product", "documentation"],
        "category": "guides"
      }
    }
  ],
  "workspaceId": "default-workspace",
  "createdBy": "user-123",
  "chunkConfig": {
    "chunkSize": 1000,
    "chunkOverlap": 200
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully indexed 1 of 1 documents",
  "results": [
    {
      "id": "doc-456",
      "chunkCount": 3,
      "totalTokens": 1250
    }
  ],
  "statistics": {
    "documentsProcessed": 1,
    "documentsIndexed": 1,
    "totalChunks": 3,
    "totalTokens": 1250,
    "processingTime": 1234,
    "avgTokensPerDocument": 1250
  }
}
```

### 3. POST /api/brain/context

Store conversation context.

**Request**:
```json
{
  "sessionId": "session-789",
  "userId": "user-123",
  "agentId": "dexter",
  "messages": [
    {
      "role": "user",
      "content": "What are our Q4 sales figures?",
      "timestamp": "2025-10-26T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Q4 sales reached $1.2M...",
      "timestamp": "2025-10-26T10:00:05Z"
    }
  ],
  "summary": "User inquired about Q4 sales performance",
  "intent": "data_inquiry",
  "topics": ["sales", "Q4", "performance"]
}
```

**Response**:
```json
{
  "success": true,
  "contextId": "ctx-abc",
  "sessionId": "session-789",
  "messageCount": 2
}
```

### 4. GET /api/brain/suggest

Get AI-powered suggestions.

**Request**:
```
GET /api/brain/suggest?type=all&workspaceId=default-workspace&userId=user-123
```

**Response**:
```json
{
  "success": true,
  "suggestions": {
    "popularQueries": [
      { "query": "How to configure API keys", "type": "query" },
      { "query": "Authentication setup", "type": "query" }
    ],
    "topics": [
      { "topic": "authentication", "type": "topic" },
      { "topic": "configuration", "type": "topic" }
    ],
    "contextSuggestions": [
      {
        "topic": "sales-data",
        "type": "context-topic",
        "source": "recent-conversations"
      }
    ]
  }
}
```

### 5. GET /api/brain/health

Health check for all services.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-26T10:30:00Z",
  "services": {
    "postgresql": {
      "status": "healthy",
      "documentsCount": 1234
    },
    "pgvector": {
      "status": "healthy"
    },
    "redis": {
      "status": "healthy",
      "connected": true,
      "cachedKeys": 42,
      "memory": "2.5M"
    },
    "openai": {
      "status": "configured",
      "model": "text-embedding-3-small"
    }
  },
  "responseTime": 45
}
```

---

## 💻 Usage Examples

### Basic Query

```typescript
import { brainService } from '@/lib/brain';

const result = await brainService.query('How do I set up authentication?', {
  workspaceId: 'my-workspace',
  userId: 'user-123',
  searchType: 'hybrid',
  limit: 5,
});

console.log(`Found ${result.totalResults} results in ${result.responseTime}ms`);
result.documents.forEach(doc => {
  console.log(`- ${doc.title} (${doc.similarity})`);
});
```

### Index Documents

```typescript
import { knowledgeIndexer } from '@/lib/brain';

const result = await knowledgeIndexer.indexDocument({
  title: 'Getting Started Guide',
  content: 'This guide will help you...',
  createdBy: 'admin',
  metadata: {
    tags: ['guide', 'tutorial'],
    category: 'documentation',
  },
});

console.log(`Indexed as ${result.id} with ${result.chunkCount} chunks`);
```

### Track Session Context

```typescript
import { contextManager } from '@/lib/brain';

await contextManager.upsertSessionContext({
  sessionId: 'session-abc',
  userId: 'user-123',
  agentId: 'dexter',
  messages: [
    { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
    { role: 'assistant', content: 'Hi!', timestamp: new Date().toISOString() },
  ],
  topics: ['greeting'],
});
```

---

## 🚀 Deployment

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:pass@host:5432/db

# Optional
REDIS_URL=redis://localhost:6379
OPENAI_MODEL=text-embedding-3-small
```

### Database Migration

```bash
# Apply migrations
npm run db:push

# Or manually
psql -d your_database -f drizzle/migrations/0007_add_brain_ai_tables.sql
```

### Enable pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 📈 Performance

- **Query Latency**: < 200ms (cached), < 500ms (uncached)
- **Indexing Speed**: ~1000 tokens/second
- **Cache Hit Rate**: ~60-70% for popular queries
- **Vector Search**: < 100ms for 100k documents (HNSW)
- **Full-Text Search**: < 50ms (GIN index)

---

## 🔧 Troubleshooting

### pgvector not found

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Redis connection failed

Check `REDIS_URL` environment variable. Brain AI will operate without Redis (degraded mode).

### Slow queries

1. Check HNSW index: `EXPLAIN ANALYZE SELECT ... ORDER BY embedding <=> ...`
2. Increase `maintenance_work_mem` for faster index building
3. Monitor cache hit rate: `GET /api/brain/health`

---

## 📝 Roadmap

- [ ] Advanced Re-Ranking (Cross-Encoder)
- [ ] Multi-modal Support (Images, Audio)
- [ ] Custom Embedding Models
- [ ] Federated Search (External Sources)
- [ ] Auto-Summarization Pipeline
- [ ] Learning from Feedback

---

**Created**: 2025-10-26
**Author**: SINTRA.AI System
**Status**: ✅ Production Ready
