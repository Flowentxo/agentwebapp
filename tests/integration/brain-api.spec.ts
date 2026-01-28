/**
 * Integration Tests for Brain AI API Endpoints
 * Tests all REST APIs with real database connections
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE = 'http://localhost:3000/api/brain';

describe('Brain AI API Integration Tests', () => {
  let testDocumentId: string;
  let testSessionId: string;

  beforeAll(() => {
    testSessionId = `test-session-${Date.now()}`;
  });

  describe('POST /api/brain/ingest', () => {
    it('should ingest a single document', async () => {
      const response = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: [
            {
              title: 'Test Document for API Integration',
              content: 'This is a test document to verify the ingest endpoint works correctly. It contains sample content for indexing.',
              metadata: {
                tags: ['test', 'integration'],
                category: 'testing',
                sourceType: 'upload',
              },
            },
          ],
          workspaceId: 'test-workspace',
          createdBy: 'integration-test',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].id).toBeDefined();
      expect(data.statistics.documentsIndexed).toBe(1);

      testDocumentId = data.results[0].id;
    });

    it('should reject empty documents array', async () => {
      const response = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: [],
          createdBy: 'test',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should reject missing createdBy', async () => {
      const response = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: [{ title: 'Test', content: 'Test content' }],
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should handle batch upload', async () => {
      const response = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: Array.from({ length: 5 }, (_, i) => ({
            title: `Batch Document ${i + 1}`,
            content: `This is batch document number ${i + 1} for testing.`,
            metadata: { tags: ['batch', 'test'] },
          })),
          createdBy: 'batch-test',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.statistics.documentsIndexed).toBe(5);
    });
  });

  describe('POST /api/brain/query', () => {
    it('should query with hybrid search', async () => {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test document',
          workspaceId: 'test-workspace',
          searchType: 'hybrid',
          limit: 5,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.results).toBeInstanceOf(Array);
      expect(data.searchType).toBe('hybrid');
      expect(data.responseTime).toBeGreaterThan(0);
    });

    it('should query with semantic search', async () => {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'integration testing',
          searchType: 'semantic',
          limit: 3,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.searchType).toBe('semantic');
    });

    it('should query with full-text search', async () => {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'document',
          searchType: 'fulltext',
          limit: 3,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.searchType).toBe('fulltext');
    });

    it('should apply filters', async () => {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test',
          filters: {
            tags: ['test'],
            category: 'testing',
          },
          limit: 10,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results.every((r: any) =>
        r.metadata?.tags?.includes('test') || r.metadata?.category === 'testing'
      )).toBe(true);
    });

    it('should reject empty query', async () => {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should use cache on repeated queries', async () => {
      const query = { query: 'cache test query', useCache: true };

      // First call
      const response1 = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      const data1 = await response1.json();

      // Second call (should hit cache)
      const response2 = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      const data2 = await response2.json();

      expect(data2.cached).toBe(true);
      expect(data2.results).toEqual(data1.results);
    });
  });

  describe('GET /api/brain/query', () => {
    it('should query via GET method', async () => {
      const response = await fetch(`${API_BASE}/query?q=test&limit=3`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.query).toBe('test');
    });

    it('should reject GET without query param', async () => {
      const response = await fetch(`${API_BASE}/query`);
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/brain/context', () => {
    it('should store session context', async () => {
      const response = await fetch(`${API_BASE}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: testSessionId,
          userId: 'test-user-123',
          agentId: 'dexter',
          messages: [
            {
              role: 'user',
              content: 'Hello, can you help me?',
              timestamp: new Date().toISOString(),
            },
            {
              role: 'assistant',
              content: 'Of course! How can I assist you today?',
              timestamp: new Date().toISOString(),
            },
          ],
          topics: ['greeting', 'assistance'],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.contextId).toBeDefined();
      expect(data.messageCount).toBe(2);
    });

    it('should update existing context', async () => {
      const response = await fetch(`${API_BASE}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: testSessionId,
          userId: 'test-user-123',
          messages: [
            {
              role: 'user',
              content: 'Updated message',
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should reject invalid messages', async () => {
      const response = await fetch(`${API_BASE}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          userId: 'test-user',
          messages: [
            {
              role: 'invalid-role',
              content: 'Test',
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/brain/context', () => {
    it('should retrieve session context', async () => {
      const response = await fetch(
        `${API_BASE}/context?sessionId=${testSessionId}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.context).toBeDefined();
      expect(data.context.sessionId).toBe(testSessionId);
    });

    it('should query contexts with filters', async () => {
      const response = await fetch(
        `${API_BASE}/context?userId=test-user-123&limit=5`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contexts).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await fetch(
        `${API_BASE}/context?sessionId=non-existent-session-xyz`
      );

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/brain/suggest', () => {
    it('should get all suggestion types', async () => {
      const response = await fetch(`${API_BASE}/suggest?type=all&limit=5`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.suggestions).toBeDefined();
    });

    it('should get popular queries', async () => {
      const response = await fetch(`${API_BASE}/suggest?type=popular&limit=10`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.suggestions.popularQueries).toBeDefined();
    });

    it('should get topic suggestions', async () => {
      const response = await fetch(`${API_BASE}/suggest?type=topics&limit=5`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.suggestions.topics).toBeDefined();
    });
  });

  describe('POST /api/brain/suggest', () => {
    it('should provide suggestions based on input', async () => {
      const response = await fetch(`${API_BASE}/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: 'test document',
          types: ['queries', 'topics', 'documents'],
          limit: 5,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.suggestions).toBeInstanceOf(Array);
    });

    it('should reject empty input', async () => {
      const response = await fetch(`${API_BASE}/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: '',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/brain/health', () => {
    it('should return health status', async () => {
      const response = await fetch(`${API_BASE}/health`);

      expect(response.status).toBeOneOf([200, 503]); // 200 healthy, 503 degraded
      const data = await response.json();
      expect(data.status).toBeOneOf(['healthy', 'degraded', 'unhealthy']);
      expect(data.services).toBeDefined();
      expect(data.services.postgresql).toBeDefined();
      expect(data.services.pgvector).toBeDefined();
      expect(data.services.redis).toBeDefined();
      expect(data.services.openai).toBeDefined();
    });

    it('should include response time', async () => {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      expect(data.responseTime).toBeGreaterThan(0);
    });
  });
});

// Custom matcher for "toBeOneOf"
expect.extend({
  toBeOneOf(received: any, array: any[]) {
    const pass = array.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${array.join(', ')}`
          : `expected ${received} to be one of ${array.join(', ')}`,
    };
  },
});
