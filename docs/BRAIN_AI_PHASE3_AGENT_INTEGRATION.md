# 🤖 Brain AI - Phase 3: Agent Integration

**Version**: 1.0.0
**Status**: ✅ Production Ready
**Last Updated**: 2025-10-26

---

## 📋 Overview

Phase 3 delivers complete agent-brain integration with the **BrainClient SDK**, enabling all agents to intelligently query knowledge, store context, and learn from interactions.

### Key Achievements

✅ **BrainClient SDK** - Complete SDK for agent-brain communication
✅ **Auto Context Capture** - Automatic conversation tracking
✅ **Agent Authentication** - Secure API key management
✅ **Knowledge Spaces** - Agent-specific knowledge isolation
✅ **Learning Loop** - Performance metrics and insights
✅ **Monitoring** - Real-time agent interaction tracking
✅ **Comprehensive Testing** - Unit + integration tests

---

## 🏗️ Architecture

### Agent Integration Flow

```
┌─────────────────┐
│  Agent (Dexter) │
└────────┬────────┘
         │ Uses
         ▼
┌─────────────────────────┐
│   BrainClient SDK       │
│ ┌─────────────────────┐ │
│ │ queryKnowledge()    │ │
│ │ storeContext()      │ │
│ │ sendLearnings()     │ │
│ │ indexKnowledge()    │ │
│ └─────────────────────┘ │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Brain AI Services     │
│ ┌─────────────────────┐ │
│ │ BrainService        │ │
│ │ ContextManager      │ │
│ │ KnowledgeIndexer    │ │
│ └─────────────────────┘ │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  PostgreSQL + pgvector  │
└─────────────────────────┘
```

### Auto Context Capture

```
User Message → Agent Processing → AutoContextCapture
                                         │
                      ┌──────────────────┼──────────────────┐
                      │                  │                  │
                   Buffer           Extract Topics     Classify Intent
                      │                  │                  │
                      └──────────────────┴──────────────────┘
                                         │
                                    Flush Buffer
                                         │
                                  BrainClient.storeContext()
                                         │
                                   Brain AI Storage
```

---

## 🔑 Core Components

### 1. BrainClient SDK

**Location**: `lib/brain/BrainClient.ts`

The primary interface for agents to communicate with Brain AI.

#### Features

- **Knowledge Querying** - Hybrid search with context
- **Context Storage** - Session tracking and management
- **Learning Loop** - Performance metrics reporting
- **Knowledge Indexing** - Agent-specific document storage
- **Authentication** - API key validation
- **Health Checks** - Service status monitoring

#### Usage Example

```typescript
import { getBrainClient } from '@/lib/brain';

// Initialize client for agent
const brainClient = getBrainClient({
  agentId: 'dexter',
  agentName: 'Dexter',
  apiKey: 'brain_dexter_api_key_here',
  workspaceId: 'default-workspace',
  enableAutoContext: true,
});

// Query knowledge
const result = await brainClient.queryKnowledge('Q4 sales trends', {
  searchType: 'hybrid',
  limit: 5,
  includeContext: true,
});

// Store context
await brainClient.storeContext({
  sessionId: 'session-123',
  userId: 'user-456',
  messages: [
    { role: 'user', content: 'Show me sales data', timestamp: new Date().toISOString() },
    { role: 'assistant', content: 'Here is the data...', timestamp: new Date().toISOString() },
  ],
  topics: ['sales', 'data'],
  intent: 'data_inquiry',
});

// Send learnings
await brainClient.sendLearnings({
  agentId: 'dexter',
  metrics: {
    successRate: 95,
    averageResponseTime: 1200,
    userSatisfaction: 4.5,
  },
  insights: [
    {
      pattern: 'Users frequently ask about Q4 sales',
      confidence: 85,
      evidence: ['session-1', 'session-2'],
    },
  ],
  timestamp: new Date().toISOString(),
});
```

### 2. AutoContextCapture

**Location**: `lib/brain/AutoContextCapture.ts`

Automatically captures agent conversations without manual intervention.

#### Features

- **Automatic Buffering** - Buffers messages before storage
- **Smart Flushing** - Auto-flush based on size or time
- **Topic Extraction** - Rule-based topic identification
- **Intent Classification** - Automatic intent detection
- **Conversation Summarization** - Optional LLM-based summaries

#### Usage Example

```typescript
import { getAutoContextCapture } from '@/lib/brain';

// Initialize auto-capture
const contextCapture = getAutoContextCapture({
  agentId: 'dexter',
  agentName: 'Dexter',
  enableAutoCapture: true,
  bufferSize: 5,
  flushIntervalMs: 300000, // 5 minutes
  enableTopicExtraction: true,
  enableIntentClassification: true,
});

// Capture messages automatically
function handleUserMessage(sessionId: string, userId: string, message: string) {
  // Capture user message
  contextCapture.captureMessage(sessionId, userId, 'user', message);

  // Process and generate response
  const response = generateResponse(message);

  // Capture assistant response
  contextCapture.captureMessage(sessionId, userId, 'assistant', response, {
    model: 'gpt-4',
    tokensUsed: 250,
  });

  // Buffer will auto-flush when full or after timeout
}
```

### 3. Agent Authentication

**Location**: `lib/brain/AgentAuth.ts`

Secure API key management for agent-brain communication.

#### Features

- **API Key Generation** - Create secure API keys
- **Key Validation** - Hash-based authentication
- **Permission Management** - Granular access control
- **Expiration** - Optional key expiration
- **Usage Tracking** - Last used timestamps

#### API Key Structure

```
brain_{32_random_hex_chars}
```

Example: `brain_a1b2c3d4e5f6...` (69 characters total)

#### Usage Example

```typescript
import { agentAuth } from '@/lib/brain';

// Generate API key for agent
const { apiKey, keyId } = await agentAuth.generateApiKey(
  'dexter',
  'Dexter Production Key',
  ['query', 'context', 'index', 'metrics'],
  30 // Expires in 30 days
);

console.log('API Key:', apiKey); // Share with agent (ONLY ONCE!)
console.log('Key ID:', keyId); // Store for management

// Validate API key
const validation = await agentAuth.validateApiKey(apiKey);
if (validation.valid) {
  console.log('Agent ID:', validation.agentId);
  console.log('Permissions:', validation.permissions);
}

// List all keys for an agent
const keys = await agentAuth.listApiKeys('dexter');
console.log('Active keys:', keys.filter(k => k.isActive));

// Revoke a key
await agentAuth.revokeApiKey(keyId);
```

### 4. Agent Metrics Tracker

**Location**: `lib/brain/AgentMetricsTracker.ts`

Monitors agent-brain interactions and performance.

#### Features

- **Real-time Tracking** - Query, context, indexing metrics
- **Performance Metrics** - P50/P95/P99 response times
- **Usage Analytics** - API calls, tokens, cost estimates
- **Anomaly Detection** - Automatic alerting
- **Trend Analysis** - Historical performance data

#### Usage Example

```typescript
import { agentMetricsTracker } from '@/lib/brain';

// Track a query
await agentMetricsTracker.trackQuery(
  'dexter',
  'Q4 sales trends',
  true, // success
  1200, // response time in ms
  { searchType: 'hybrid' }
);

// Get agent metrics
const metrics = await agentMetricsTracker.getAgentMetrics('dexter', 'day');
console.log('Total queries:', metrics.metrics.totalQueries);
console.log('Success rate:', metrics.metrics.successfulQueries / metrics.metrics.totalQueries);
console.log('Avg response time:', metrics.metrics.averageResponseTime);
console.log('Cache hit rate:', metrics.metrics.cacheHitRate);

// Check for anomalies
const alerts = await agentMetricsTracker.checkAnomalies('dexter');
for (const alert of alerts) {
  console.log(`[${alert.severity}] ${alert.message}`);
}

// Get performance trends
const trends = await agentMetricsTracker.getAgentTrends('dexter', 7);
trends.forEach(day => {
  console.log(`${day.date}: ${day.queries} queries, ${day.avgResponseTime}ms avg`);
});
```

---

## 🔌 API Endpoints

### GET /api/brain/agents/metrics

Get metrics for agent-brain interactions.

**Query Parameters**:
- `agentId` (optional) - Specific agent ID
- `period` - `hour` | `day` | `week` (default: `day`)
- `includeAlerts` - `true` | `false` (default: `false`)
- `includeTrends` - `true` | `false` (default: `false`)
- `trendDays` - Number of days for trends (default: `7`)

**Example Requests**:

```bash
# Get all agents metrics for today
curl 'http://localhost:3000/api/brain/agents/metrics?period=day'

# Get specific agent with alerts
curl 'http://localhost:3000/api/brain/agents/metrics?agentId=dexter&includeAlerts=true'

# Get trends for last 14 days
curl 'http://localhost:3000/api/brain/agents/metrics?agentId=dexter&includeTrends=true&trendDays=14'
```

**Example Response**:

```json
{
  "success": true,
  "timestamp": "2025-10-26T10:00:00Z",
  "agent": {
    "agentId": "dexter",
    "period": "day",
    "metrics": {
      "totalQueries": 150,
      "successfulQueries": 142,
      "failedQueries": 8,
      "averageResponseTime": 850,
      "totalContextsStored": 45,
      "totalDocumentsIndexed": 12,
      "cacheHitRate": 65.3
    },
    "performance": {
      "p50ResponseTime": 600,
      "p95ResponseTime": 1500,
      "p99ResponseTime": 2200
    },
    "usage": {
      "totalApiCalls": 150,
      "totalTokensUsed": 45000,
      "estimatedCost": 4.50
    }
  },
  "alerts": [
    {
      "severity": "info",
      "type": "high-usage",
      "message": "Agent dexter has high API usage: 150 calls in last hour",
      "agentId": "dexter",
      "timestamp": "2025-10-26T10:00:00Z"
    }
  ],
  "responseTime": 45
}
```

---

## 🚀 Integration Guide

### Step 1: Initialize BrainClient in Your Agent

```typescript
// In your agent initialization file
import { getBrainClient } from '@/lib/brain';
import { getAutoContextCapture } from '@/lib/brain';

export class DexterAgent {
  private brainClient;
  private contextCapture;

  constructor() {
    this.brainClient = getBrainClient({
      agentId: 'dexter',
      agentName: 'Dexter',
      apiKey: process.env.DEXTER_BRAIN_API_KEY,
      workspaceId: 'default-workspace',
    });

    this.contextCapture = getAutoContextCapture({
      agentId: 'dexter',
      agentName: 'Dexter',
      bufferSize: 5,
      enableTopicExtraction: true,
    });
  }

  async handleMessage(sessionId: string, userId: string, message: string) {
    // 1. Capture user message
    this.contextCapture.captureMessage(sessionId, userId, 'user', message);

    // 2. Query knowledge base
    const knowledge = await this.brainClient.queryKnowledge(message, {
      searchType: 'hybrid',
      limit: 3,
      includeContext: true,
    });

    // 3. Use knowledge to enhance response
    const response = await this.generateResponse(message, knowledge);

    // 4. Capture assistant response
    this.contextCapture.captureMessage(sessionId, userId, 'assistant', response);

    return response;
  }
}
```

### Step 2: Generate API Key for Agent

```bash
# Run migration to create agent_api_keys table
npm run db:push

# Generate API key (via script or admin panel)
node -e "
const { agentAuth } = require('./lib/brain/AgentAuth');
agentAuth.generateApiKey('dexter', 'Production Key', ['query', 'context', 'metrics'])
  .then(({ apiKey }) => console.log('API Key:', apiKey));
"
```

### Step 3: Add API Key to Environment

```bash
# Add to .env.local
DEXTER_BRAIN_API_KEY=brain_a1b2c3d4e5f6...
```

### Step 4: Monitor Agent Performance

```bash
# Check agent metrics
curl 'http://localhost:3000/api/brain/agents/metrics?agentId=dexter&includeAlerts=true'
```

---

## 📊 Agent-Specific Knowledge Spaces

Each agent has its own isolated knowledge space for personalized information.

### Creating Agent Knowledge

```typescript
// Index agent-specific knowledge
await brainClient.indexKnowledge(
  'Dexter Internal: Sales Analysis Best Practices',
  'When analyzing sales data, always consider seasonality...',
  {
    tags: ['sales', 'analysis', 'best-practices'],
    category: 'internal',
    agentSpecific: true,
  }
);

// Batch index
await brainClient.indexKnowledgeBatch([
  {
    title: 'Q4 Analysis Template',
    content: 'Template for Q4 analysis...',
    metadata: { tags: ['template'] },
  },
  {
    title: 'Common Sales Queries',
    content: 'Users often ask about...',
    metadata: { tags: ['faq'] },
  },
]);
```

### Querying Agent Knowledge Space

```typescript
// Get agent's knowledge space stats
const knowledgeSpace = await brainClient.getKnowledgeSpace();

console.log('Total documents:', knowledgeSpace.totalDocuments);
console.log('Recent queries:', knowledgeSpace.recentQueries);
console.log('Popular topics:', knowledgeSpace.popularTopics);
console.log('Performance score:', knowledgeSpace.performanceScore);
```

---

## 🔄 Learning Loop

Agents report performance metrics to enable adaptive improvements.

### Reporting Metrics

```typescript
// After each session, send learnings
await brainClient.sendLearnings({
  agentId: 'dexter',
  sessionId: 'session-123',
  userId: 'user-456',
  metrics: {
    successRate: 95,
    averageResponseTime: 1200,
    userSatisfaction: 4.5,
    tasksCompleted: 10,
    errorCount: 1,
    commonIssues: ['Data not found'],
  },
  insights: [
    {
      pattern: 'Users ask about Q4 sales on Mondays',
      confidence: 88,
      evidence: ['session-1', 'session-15', 'session-30'],
    },
  ],
  timestamp: new Date().toISOString(),
});
```

### Feedback Loop

```typescript
// Report query feedback
await brainClient.reportFeedback(
  'query-id-123',
  true, // was helpful
  'Excellent results, exactly what I needed'
);
```

---

## 🧪 Testing

### Unit Tests

Run BrainClient SDK tests:

```bash
npx vitest tests/unit/brain/BrainClient.spec.ts
```

Run AutoContextCapture tests:

```bash
npx vitest tests/unit/brain/AutoContextCapture.spec.ts
```

### Integration Testing

```bash
# Test agent-brain interaction
npx vitest tests/integration/brain-agent-integration.spec.ts
```

### Test Coverage

```bash
npx vitest --coverage lib/brain/
```

---

## 📈 Monitoring & Observability

### Real-time Dashboards

Access metrics at:
- `/api/brain/agents/metrics` - Agent performance
- `/api/brain/metrics` - Overall Brain AI metrics
- `/api/brain/health` - Service health

### Alerting

Automatic alerts for:
- High failure rates (> 20%)
- Slow response times (P95 > 3s)
- Low cache hit rates (< 30%)
- High usage (> 1000 calls/hour)

### Logging

All agent interactions are logged:
- Query logs in `brain_query_logs`
- Context snapshots in `brain_contexts`
- Learnings in `brain_learnings`

---

## 🔧 Troubleshooting

### Issue: API Key Invalid

**Fix**: Regenerate API key and update environment variable

```bash
# Generate new key
node scripts/generate-agent-api-key.js dexter

# Update .env.local
DEXTER_BRAIN_API_KEY=new_key_here
```

### Issue: Context Not Being Captured

**Fix**: Check auto-capture configuration

```typescript
// Ensure auto-capture is enabled
const contextCapture = getAutoContextCapture({
  agentId: 'dexter',
  agentName: 'Dexter',
  enableAutoCapture: true, // ← Must be true
});
```

### Issue: Low Cache Hit Rate

**Fix**: Enable caching in queries

```typescript
const result = await brainClient.queryKnowledge('query', {
  useCache: true, // ← Enable caching
});
```

---

## 📝 Best Practices

### 1. Always Use BrainClient Singleton

```typescript
// ✅ Good
const brainClient = getBrainClient({ agentId: 'dexter', agentName: 'Dexter' });

// ❌ Bad
const brainClient = new BrainClient({ agentId: 'dexter', agentName: 'Dexter' });
```

### 2. Flush Contexts on Shutdown

```typescript
// Cleanup on agent shutdown
process.on('SIGTERM', async () => {
  await contextCapture.cleanup();
  process.exit(0);
});
```

### 3. Use Appropriate Buffer Sizes

```typescript
// High-traffic agents
bufferSize: 10, // Flush less frequently

// Low-traffic agents
bufferSize: 3, // Flush more frequently
```

### 4. Monitor Performance Regularly

```typescript
// Daily health check
setInterval(async () => {
  const health = await brainClient.healthCheck();
  if (health.status !== 'healthy') {
    console.warn('Brain AI unhealthy:', health);
  }
}, 60000); // Every minute
```

---

## 🎯 Next Steps

1. ✅ **Integrate with Existing Agents** - Add BrainClient to all 4 agents
2. ✅ **Setup Monitoring** - Configure alerts and dashboards
3. ✅ **Train Agents** - Index agent-specific knowledge
4. ✅ **Optimize Performance** - Tune cache settings and buffer sizes
5. ✅ **Collect Feedback** - Implement user feedback loop

---

## 📚 Related Documentation

- [Brain AI Module Overview](./BRAIN_AI_MODULE.md)
- [Brain AI Quick Start](./BRAIN_AI_QUICKSTART.md)
- [API Reference](../app/api/brain/)
- [Example Integrations](../lib/brain/examples/)

---

**Created**: 2025-10-26
**Author**: SINTRA.AI System
**Status**: ✅ Phase 3 Complete
