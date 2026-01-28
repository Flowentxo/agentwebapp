# 🚀 Brain AI Phase 3 - Quick Start Guide

Get your agents connected to Brain AI in 10 minutes!

---

## Step 1: Run Database Migration

Add the agent API keys table:

```bash
# Apply migration
psql -d your_database -f drizzle/migrations/0008_add_agent_api_keys.sql

# Or use drizzle
npm run db:push
```

**Verify**:
```sql
SELECT tablename FROM pg_tables WHERE tablename = 'agent_api_keys';
```

---

## Step 2: Generate API Key for Your Agent

Create a simple script `scripts/generate-agent-api-key.ts`:

```typescript
import { agentAuth } from '@/lib/brain/AgentAuth';

async function main() {
  const agentId = process.argv[2] || 'dexter';
  const agentName = process.argv[3] || 'Dexter';

  const { apiKey, keyId } = await agentAuth.generateApiKey(
    agentId,
    `${agentName} Production Key`,
    ['query', 'context', 'index', 'metrics'],
    null // No expiration
  );

  console.log('✅ API Key Generated!');
  console.log('Agent ID:', agentId);
  console.log('Key ID:', keyId);
  console.log('API Key:', apiKey);
  console.log('\n⚠️  IMPORTANT: Save this API key! You won\'t see it again.');
  console.log('\nAdd to .env.local:');
  console.log(`${agentId.toUpperCase()}_BRAIN_API_KEY=${apiKey}`);
}

main();
```

Run it:
```bash
npx tsx scripts/generate-agent-api-key.ts dexter "Dexter"
```

**Output**:
```
✅ API Key Generated!
Agent ID: dexter
Key ID: a1b2c3d4-...
API Key: brain_a1b2c3d4e5f6789012345678...

⚠️  IMPORTANT: Save this API key! You won't see it again.

Add to .env.local:
DEXTER_BRAIN_API_KEY=brain_a1b2c3d4e5f6789012345678...
```

---

## Step 3: Add API Key to Environment

Edit `.env.local`:

```bash
# Dexter Agent
DEXTER_BRAIN_API_KEY=brain_a1b2c3d4e5f6789012345678...

# Cassie Agent
CASSIE_BRAIN_API_KEY=brain_b2c3d4e5f6789012345678...

# Emmie Agent
EMMIE_BRAIN_API_KEY=brain_c3d4e5f6789012345678...

# Aura Agent
AURA_BRAIN_API_KEY=brain_d4e5f6789012345678...
```

---

## Step 4: Integrate BrainClient into Agent

Edit your agent file (e.g., `lib/agents/dexter.ts`):

```typescript
import { getBrainClient, getAutoContextCapture } from '@/lib/brain';

export class DexterAgent {
  private brainClient = getBrainClient({
    agentId: 'dexter',
    agentName: 'Dexter',
    apiKey: process.env.DEXTER_BRAIN_API_KEY,
    workspaceId: 'default-workspace',
  });

  private contextCapture = getAutoContextCapture({
    agentId: 'dexter',
    agentName: 'Dexter',
    bufferSize: 5,
    enableTopicExtraction: true,
    enableIntentClassification: true,
  });

  async processMessage(sessionId: string, userId: string, message: string) {
    // 1. Capture user message
    this.contextCapture.captureMessage(sessionId, userId, 'user', message);

    // 2. Query Brain for relevant knowledge
    const knowledge = await this.brainClient.queryKnowledge(message, {
      searchType: 'hybrid',
      limit: 3,
      includeContext: true,
    });

    // 3. Generate response using knowledge
    const response = await this.generateResponse(message, knowledge);

    // 4. Capture response
    this.contextCapture.captureMessage(sessionId, userId, 'assistant', response, {
      model: 'gpt-4',
      tokensUsed: 250,
    });

    return response;
  }

  private async generateResponse(message: string, knowledge: any) {
    // Your LLM logic here
    // Use knowledge.results to enhance context
    const context = knowledge.results
      .map((r: any) => r.content.substring(0, 200))
      .join('\n\n');

    return `Based on available data: ${context}`;
  }
}
```

---

## Step 5: Test Agent-Brain Integration

### Test 1: Query Knowledge

```typescript
import { getBrainClient } from '@/lib/brain';

const brainClient = getBrainClient({
  agentId: 'dexter',
  agentName: 'Dexter',
  apiKey: process.env.DEXTER_BRAIN_API_KEY,
});

const result = await brainClient.queryKnowledge('sales data Q4', {
  searchType: 'hybrid',
  limit: 5,
});

console.log('Found:', result.totalResults);
console.log('Results:', result.results);
```

### Test 2: Store Context

```typescript
const contextId = await brainClient.storeContext({
  sessionId: 'test-session-1',
  userId: 'test-user-1',
  messages: [
    {
      role: 'user',
      content: 'Show me Q4 sales',
      timestamp: new Date().toISOString(),
    },
    {
      role: 'assistant',
      content: 'Here is Q4 sales data...',
      timestamp: new Date().toISOString(),
    },
  ],
  topics: ['sales', 'Q4'],
  intent: 'data_inquiry',
});

console.log('✅ Context stored:', contextId);
```

### Test 3: Index Knowledge

```typescript
const docId = await brainClient.indexKnowledge(
  'Dexter: Sales Analysis Best Practices',
  'When analyzing sales, consider seasonality and market trends...',
  {
    tags: ['sales', 'analysis', 'best-practices'],
    category: 'internal',
  }
);

console.log('✅ Document indexed:', docId);
```

### Test 4: Send Learnings

```typescript
await brainClient.sendLearnings({
  agentId: 'dexter',
  metrics: {
    successRate: 95,
    averageResponseTime: 1200,
    tasksCompleted: 10,
  },
  insights: [
    {
      pattern: 'Users frequently ask about Q4 sales data',
      confidence: 85,
      evidence: ['session-1', 'session-2'],
    },
  ],
  timestamp: new Date().toISOString(),
});

console.log('✅ Learnings sent');
```

---

## Step 6: Monitor Agent Performance

### Via API

```bash
# Get metrics for Dexter
curl 'http://localhost:3000/api/brain/agents/metrics?agentId=dexter&includeAlerts=true'

# Get all agents
curl 'http://localhost:3000/api/brain/agents/metrics?period=day'

# Get trends
curl 'http://localhost:3000/api/brain/agents/metrics?agentId=dexter&includeTrends=true&trendDays=7'
```

### Via Code

```typescript
import { agentMetricsTracker } from '@/lib/brain';

// Get metrics
const metrics = await agentMetricsTracker.getAgentMetrics('dexter', 'day');

console.log('Total queries:', metrics.metrics.totalQueries);
console.log('Success rate:', metrics.metrics.successfulQueries / metrics.metrics.totalQueries);
console.log('Avg response time:', metrics.metrics.averageResponseTime);
console.log('Cache hit rate:', metrics.metrics.cacheHitRate);

// Check for alerts
const alerts = await agentMetricsTracker.checkAnomalies('dexter');
alerts.forEach(alert => {
  console.log(`[${alert.severity}] ${alert.message}`);
});
```

---

## Step 7: (Optional) Enable Auto Context Capture

### Full Auto-Capture Example

```typescript
import { getAutoContextCapture } from '@/lib/brain';

const contextCapture = getAutoContextCapture({
  agentId: 'dexter',
  agentName: 'Dexter',
  enableAutoCapture: true,
  bufferSize: 5, // Flush every 5 messages
  flushIntervalMs: 300000, // Or every 5 minutes
  enableTopicExtraction: true,
  enableIntentClassification: true,
});

// In your chat handler
export async function handleChatMessage(sessionId, userId, userMessage) {
  // Capture user message
  contextCapture.captureMessage(sessionId, userId, 'user', userMessage);

  // Process and respond
  const response = await generateResponse(userMessage);

  // Capture assistant message
  contextCapture.captureMessage(sessionId, userId, 'assistant', response, {
    model: 'gpt-4',
    tokensUsed: 250,
  });

  return response;
}

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await contextCapture.cleanup();
  process.exit(0);
});
```

---

## Common Issues & Fixes

### Issue: "API Key Invalid"

**Cause**: API key not set or incorrect

**Fix**:
```bash
# Check .env.local has the key
cat .env.local | grep BRAIN_API_KEY

# Regenerate if needed
npx tsx scripts/generate-agent-api-key.ts dexter
```

### Issue: "Brain AI unavailable"

**Cause**: Brain AI services not running

**Fix**:
```bash
# Check health
curl http://localhost:3000/api/brain/health

# Verify database connection
psql -d your_database -c "SELECT COUNT(*) FROM brain_documents;"

# Restart dev server
npm run dev
```

### Issue: Context not being saved

**Cause**: Auto-capture disabled or buffer not flushing

**Fix**:
```typescript
// Manually flush
await contextCapture.flushSession(sessionId, userId);

// Or reduce buffer size for immediate flushing
bufferSize: 1
```

### Issue: Low cache hit rate

**Cause**: Cache not enabled in queries

**Fix**:
```typescript
// Enable caching
const result = await brainClient.queryKnowledge('query', {
  useCache: true, // ← Add this
});
```

---

## Performance Tuning

### For High-Traffic Agents

```typescript
const brainClient = getBrainClient({
  agentId: 'high-traffic-agent',
  agentName: 'High Traffic Agent',
  cacheTTL: 600, // 10 minutes cache
});

const contextCapture = getAutoContextCapture({
  agentId: 'high-traffic-agent',
  agentName: 'High Traffic Agent',
  bufferSize: 10, // Larger buffer
  flushIntervalMs: 600000, // 10 minutes
});
```

### For Low-Traffic Agents

```typescript
const contextCapture = getAutoContextCapture({
  agentId: 'low-traffic-agent',
  agentName: 'Low Traffic Agent',
  bufferSize: 3, // Smaller buffer
  flushIntervalMs: 60000, // 1 minute
});
```

---

## Next Steps

1. ✅ **Index Agent Knowledge** - Upload agent-specific documents
2. ✅ **Setup Monitoring** - Configure alerts for your agents
3. ✅ **Optimize Queries** - Tune search parameters for better results
4. ✅ **Collect Feedback** - Implement user feedback loop
5. ✅ **Scale** - Add more agents as needed

---

## Full Example: Complete Agent Integration

```typescript
// lib/agents/dexter-with-brain.ts
import { getBrainClient, getAutoContextCapture, agentMetricsTracker } from '@/lib/brain';

export class DexterWithBrain {
  private brainClient = getBrainClient({
    agentId: 'dexter',
    agentName: 'Dexter',
    apiKey: process.env.DEXTER_BRAIN_API_KEY,
  });

  private contextCapture = getAutoContextCapture({
    agentId: 'dexter',
    agentName: 'Dexter',
    bufferSize: 5,
    enableTopicExtraction: true,
  });

  async handleMessage(sessionId: string, userId: string, message: string) {
    const startTime = Date.now();

    try {
      // 1. Capture user message
      this.contextCapture.captureMessage(sessionId, userId, 'user', message);

      // 2. Query knowledge
      const knowledge = await this.brainClient.queryKnowledge(message, {
        searchType: 'hybrid',
        limit: 3,
        includeContext: true,
        useCache: true,
      });

      // 3. Generate response
      const response = await this.generateResponse(message, knowledge);

      // 4. Capture response
      this.contextCapture.captureMessage(sessionId, userId, 'assistant', response);

      // 5. Track success
      await agentMetricsTracker.trackQuery(
        'dexter',
        message,
        true,
        Date.now() - startTime
      );

      return response;
    } catch (error) {
      // Track failure
      await agentMetricsTracker.trackQuery(
        'dexter',
        message,
        false,
        Date.now() - startTime
      );
      throw error;
    }
  }

  private async generateResponse(message: string, knowledge: any) {
    // Use knowledge to enhance response
    const context = knowledge.results
      .map((r: any) => `${r.title}: ${r.content.substring(0, 100)}`)
      .join('\n');

    return `Based on available knowledge:\n${context}\n\nAnswer: ...`;
  }

  async cleanup() {
    await this.contextCapture.cleanup();
  }
}

// Usage
const agent = new DexterWithBrain();
const response = await agent.handleMessage('session-1', 'user-1', 'Show me Q4 sales');
console.log(response);
```

---

**Ready to go! Your agent is now powered by Brain AI** 🧠✨

For more details, see [Brain AI Phase 3 Documentation](./BRAIN_AI_PHASE3_AGENT_INTEGRATION.md)
