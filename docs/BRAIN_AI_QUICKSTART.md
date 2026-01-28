# 🚀 Brain AI Quick Start Guide

Get up and running with Brain AI in 5 minutes!

---

## Step 1: Setup Database

### Enable pgvector Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Run Migrations

```bash
# Apply Brain AI migrations
npm run db:push

# Or manually
psql -d your_database -f drizzle/migrations/0007_add_brain_ai_tables.sql
```

### Verify Tables

```sql
SELECT tablename FROM pg_tables WHERE tablename LIKE 'brain_%';
-- Should show: brain_documents, brain_contexts, brain_learnings, brain_query_logs
```

---

## Step 2: Configure Environment

Create `.env.local` (or update existing):

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Optional but recommended
REDIS_URL=redis://localhost:6379
OPENAI_MODEL=text-embedding-3-small
OPENAI_MAX_TOKENS=2000
```

---

## Step 3: Index Your First Document

### Via API

```bash
curl -X POST http://localhost:3000/api/brain/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "title": "Welcome to Brain AI",
        "content": "Brain AI is an intelligent knowledge base that provides context-aware assistance.",
        "metadata": {
          "tags": ["introduction", "brain-ai"],
          "category": "documentation"
        }
      }
    ],
    "createdBy": "admin"
  }'
```

### Via Code

```typescript
import { knowledgeIndexer } from '@/lib/brain';

const result = await knowledgeIndexer.indexDocument({
  title: 'My First Document',
  content: 'This is a test document for Brain AI.',
  createdBy: 'admin',
  metadata: {
    tags: ['test'],
    category: 'demo',
  },
});

console.log(`✅ Indexed: ${result.id}`);
```

---

## Step 4: Search Knowledge Base

### Via API

```bash
curl -X POST http://localhost:3000/api/brain/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is Brain AI?",
    "searchType": "hybrid",
    "limit": 5
  }'
```

### Via Code

```typescript
import { brainService } from '@/lib/brain';

const result = await brainService.query('What is Brain AI?', {
  searchType: 'hybrid',
  limit: 5,
});

console.log(`Found ${result.totalResults} results:`);
result.documents.forEach(doc => {
  console.log(`- ${doc.title} (similarity: ${doc.similarity})`);
});
```

---

## Step 5: Track Conversation Context

### Store Context

```typescript
import { contextManager } from '@/lib/brain';

await contextManager.upsertSessionContext({
  sessionId: 'demo-session-123',
  userId: 'user-001',
  agentId: 'dexter',
  messages: [
    {
      role: 'user',
      content: 'Hello, how can Brain AI help me?',
      timestamp: new Date().toISOString(),
    },
    {
      role: 'assistant',
      content: 'Brain AI can help you search knowledge, track context, and more!',
      timestamp: new Date().toISOString(),
    },
  ],
  topics: ['introduction', 'capabilities'],
});

console.log('✅ Context saved');
```

### Retrieve Context

```typescript
const context = await contextManager.getSessionContext('demo-session-123');
console.log(`Session has ${context?.messages.length} messages`);
```

---

## Step 6: Get AI Suggestions

```bash
curl 'http://localhost:3000/api/brain/suggest?type=all&limit=5'
```

**Response**:
```json
{
  "success": true,
  "suggestions": {
    "popularQueries": ["What is Brain AI?"],
    "topics": ["introduction", "brain-ai"],
    "contextSuggestions": []
  }
}
```

---

## Step 7: Health Check

Verify all services are running:

```bash
curl http://localhost:3000/api/brain/health
```

**Expected**:
```json
{
  "status": "healthy",
  "services": {
    "postgresql": { "status": "healthy", "documentsCount": 1 },
    "pgvector": { "status": "healthy" },
    "redis": { "status": "healthy", "connected": true },
    "openai": { "status": "configured" }
  }
}
```

---

## Common Use Cases

### 1. Document Q&A

```typescript
// Index documentation
await knowledgeIndexer.indexDocument({
  title: 'API Documentation',
  content: 'Our API supports REST and GraphQL endpoints...',
  createdBy: 'docs-team',
});

// Query it
const answer = await brainService.query('How do I use the API?', {
  limit: 3,
});
```

### 2. Agent Memory

```typescript
// Store what agent learned
await contextManager.upsertSessionContext({
  sessionId: agentSession,
  userId: user.id,
  agentId: 'dexter',
  messages: conversationHistory,
  keyPoints: ['User prefers detailed explanations', 'Interested in financial data'],
});

// Retrieve for next interaction
const previousContext = await contextManager.getSessionContext(agentSession);
```

### 3. Smart Search

```typescript
// Hybrid search with filters
const results = await brainService.query('authentication setup', {
  searchType: 'hybrid', // 70% semantic + 30% full-text
  filters: {
    tags: ['security'],
    category: 'documentation',
  },
  minSimilarity: 0.7,
});
```

---

## Troubleshooting

### Issue: "relation 'brain_documents' does not exist"

**Fix**: Run migrations
```bash
npm run db:push
```

### Issue: "extension 'vector' does not exist"

**Fix**: Enable pgvector
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: "OPENAI_API_KEY is not set"

**Fix**: Add to `.env.local`
```bash
OPENAI_API_KEY=sk-your-key-here
```

### Issue: Redis connection failed

**Fix**: Either install Redis or ignore (Brain AI works in degraded mode)
```bash
# Install Redis (optional)
brew install redis  # macOS
sudo apt install redis  # Ubuntu

# Start Redis
redis-server
```

---

## Next Steps

1. ✅ **Bulk Import**: Use `/api/brain/ingest` to upload multiple documents
2. ✅ **Context Tracking**: Integrate with your agents for memory
3. ✅ **Custom Metadata**: Add tags and categories for better filtering
4. ✅ **Analytics**: Monitor popular queries via `/api/brain/suggest`
5. ✅ **Advanced RAG**: Combine with OpenAI for intelligent responses

---

## Need Help?

- 📖 Full Documentation: `docs/BRAIN_AI_MODULE.md`
- 🔧 API Reference: `app/api/brain/*/route.ts`
- 💬 Issues: Create a GitHub issue

---

**Happy Building! 🧠✨**
