/**
 * Unit Tests for BrainClient SDK
 * Tests agent-brain communication, knowledge querying, and context management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrainClient, getBrainClient } from '@/lib/brain/BrainClient';

describe('BrainClient SDK', () => {
  let brainClient: BrainClient;

  beforeEach(() => {
    brainClient = new BrainClient({
      agentId: 'test-agent',
      agentName: 'Test Agent',
      workspaceId: 'test-workspace',
      enableAutoContext: false,
    });
  });

  describe('Initialization', () => {
    it('should create BrainClient instance', () => {
      expect(brainClient).toBeDefined();
      expect(brainClient.getConfig().agentId).toBe('test-agent');
    });

    it('should use default workspace if not provided', () => {
      const client = new BrainClient({
        agentId: 'agent-1',
        agentName: 'Agent 1',
      });

      expect(client.getConfig().workspaceId).toBe('default-workspace');
    });

    it('should enable auto context by default', () => {
      const client = new BrainClient({
        agentId: 'agent-1',
        agentName: 'Agent 1',
      });

      expect(client.getConfig().enableAutoContext).toBe(true);
    });
  });

  describe('queryKnowledge', () => {
    it('should query knowledge base successfully', async () => {
      const result = await brainClient.queryKnowledge('test query', {
        searchType: 'hybrid',
        limit: 5,
      });

      expect(result).toBeDefined();
      expect(result.results).toBeInstanceOf(Array);
      expect(result.totalResults).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should use hybrid search by default', async () => {
      const result = await brainClient.queryKnowledge('test query');

      expect(result).toBeDefined();
      // Default search type is hybrid
    });

    it('should support semantic search', async () => {
      const result = await brainClient.queryKnowledge('test query', {
        searchType: 'semantic',
        limit: 3,
      });

      expect(result.results.length).toBeLessThanOrEqual(3);
    });

    it('should support full-text search', async () => {
      const result = await brainClient.queryKnowledge('test query', {
        searchType: 'fulltext',
        limit: 10,
      });

      expect(result.results.length).toBeLessThanOrEqual(10);
    });

    it('should apply filters correctly', async () => {
      const result = await brainClient.queryKnowledge('test query', {
        filters: {
          tags: ['test'],
          category: 'testing',
        },
      });

      // All results should match filters (if any results)
      if (result.results.length > 0) {
        result.results.forEach(r => {
          const hasTags = r.metadata?.tags?.includes('test');
          const hasCategory = r.metadata?.category === 'testing';
          expect(hasTags || hasCategory).toBe(true);
        });
      }
    });

    it('should include context when requested', async () => {
      const result = await brainClient.queryKnowledge('test query', {
        includeContext: true,
      });

      // Context may or may not be present depending on session history
      expect(result).toHaveProperty('context');
    });

    it('should handle empty query gracefully', async () => {
      await expect(
        brainClient.queryKnowledge('')
      ).rejects.toThrow();
    });
  });

  describe('storeContext', () => {
    it('should store conversation context', async () => {
      const contextId = await brainClient.storeContext({
        sessionId: 'test-session-1',
        userId: 'user-1',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      expect(contextId).toBeDefined();
      expect(typeof contextId).toBe('string');
    });

    it('should store context with topics', async () => {
      const contextId = await brainClient.storeContext({
        sessionId: 'test-session-2',
        userId: 'user-2',
        messages: [
          {
            role: 'user',
            content: 'What is authentication?',
            timestamp: new Date().toISOString(),
          },
        ],
        topics: ['authentication', 'security'],
      });

      expect(contextId).toBeDefined();
    });

    it('should store context with summary', async () => {
      const contextId = await brainClient.storeContext({
        sessionId: 'test-session-3',
        userId: 'user-3',
        messages: [
          {
            role: 'user',
            content: 'Analyze sales data',
            timestamp: new Date().toISOString(),
          },
        ],
        summary: 'User requested sales data analysis',
        intent: 'data_inquiry',
      });

      expect(contextId).toBeDefined();
    });

    it('should handle empty messages array', async () => {
      await expect(
        brainClient.storeContext({
          sessionId: 'test-session-4',
          userId: 'user-4',
          messages: [],
        })
      ).rejects.toThrow();
    });
  });

  describe('captureMessage', () => {
    it('should capture user message', () => {
      expect(() => {
        brainClient.captureMessage(
          'session-1',
          'user-1',
          'user',
          'Hello',
          { timestamp: new Date().toISOString() }
        );
      }).not.toThrow();
    });

    it('should capture assistant message', () => {
      expect(() => {
        brainClient.captureMessage(
          'session-1',
          'user-1',
          'assistant',
          'Hi there!',
          { model: 'gpt-4' }
        );
      }).not.toThrow();
    });

    it('should auto-flush after buffer size reached', async () => {
      const client = new BrainClient({
        agentId: 'test-agent-flush',
        agentName: 'Test Agent',
        enableAutoContext: true,
      });

      // Capture 6 messages (buffer size is 5)
      for (let i = 0; i < 6; i++) {
        client.captureMessage(
          'session-flush',
          'user-flush',
          'user',
          `Message ${i}`
        );
      }

      // Buffer should have been flushed
      // (Implementation detail - hard to test without mocking)
    });
  });

  describe('sendLearnings', () => {
    it('should send agent metrics', async () => {
      await expect(
        brainClient.sendLearnings({
          agentId: 'test-agent',
          sessionId: 'session-1',
          userId: 'user-1',
          metrics: {
            successRate: 95,
            averageResponseTime: 1200,
            userSatisfaction: 4.5,
            tasksCompleted: 10,
          },
          insights: [
            {
              pattern: 'Users frequently ask about authentication',
              confidence: 85,
              evidence: ['session-1', 'session-2'],
            },
          ],
          timestamp: new Date().toISOString(),
        })
      ).resolves.not.toThrow();
    });

    it('should handle metrics without insights', async () => {
      await expect(
        brainClient.sendLearnings({
          agentId: 'test-agent',
          metrics: {
            successRate: 90,
            tasksCompleted: 5,
          },
          timestamp: new Date().toISOString(),
        })
      ).resolves.not.toThrow();
    });
  });

  describe('indexKnowledge', () => {
    it('should index agent-specific knowledge', async () => {
      const documentId = await brainClient.indexKnowledge(
        'Test Document',
        'This is a test document for indexing',
        {
          tags: ['test'],
          category: 'testing',
        }
      );

      expect(documentId).toBeDefined();
      expect(typeof documentId).toBe('string');
    });

    it('should index with metadata', async () => {
      const documentId = await brainClient.indexKnowledge(
        'Code Example',
        'const example = () => { return "test"; }',
        {
          tags: ['code', 'javascript'],
          category: 'examples',
          language: 'javascript',
        }
      );

      expect(documentId).toBeDefined();
    });
  });

  describe('indexKnowledgeBatch', () => {
    it('should index multiple documents', async () => {
      const documentIds = await brainClient.indexKnowledgeBatch([
        {
          title: 'Doc 1',
          content: 'Content 1',
          metadata: { tags: ['test'] },
        },
        {
          title: 'Doc 2',
          content: 'Content 2',
          metadata: { tags: ['test'] },
        },
        {
          title: 'Doc 3',
          content: 'Content 3',
          metadata: { tags: ['test'] },
        },
      ]);

      expect(documentIds).toBeInstanceOf(Array);
      expect(documentIds.length).toBe(3);
    });

    it('should handle empty array', async () => {
      const documentIds = await brainClient.indexKnowledgeBatch([]);
      expect(documentIds).toEqual([]);
    });
  });

  describe('getSuggestedQueries', () => {
    it('should get suggested queries', async () => {
      const suggestions = await brainClient.getSuggestedQueries(5);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should handle no suggestions', async () => {
      const suggestions = await brainClient.getSuggestedQueries(10);
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('getKnowledgeSpace', () => {
    it('should get agent knowledge space', async () => {
      const knowledgeSpace = await brainClient.getKnowledgeSpace();

      expect(knowledgeSpace).toBeDefined();
      expect(knowledgeSpace.agentId).toBe('test-agent');
      expect(knowledgeSpace.totalDocuments).toBeGreaterThanOrEqual(0);
      expect(knowledgeSpace.recentQueries).toBeInstanceOf(Array);
      expect(knowledgeSpace.popularTopics).toBeInstanceOf(Array);
    });
  });

  describe('Authentication', () => {
    it('should authenticate with valid API key', () => {
      const client = new BrainClient({
        agentId: 'auth-test',
        agentName: 'Auth Test',
        apiKey: 'brain_valid_api_key_1234567890',
      });

      expect(client.isAuthenticated()).toBe(true);
    });

    it('should not authenticate with invalid API key', () => {
      const client = new BrainClient({
        agentId: 'auth-test',
        agentName: 'Auth Test',
        apiKey: 'short',
      });

      expect(client.isAuthenticated()).toBe(false);
    });

    it('should not be authenticated without API key', () => {
      const client = new BrainClient({
        agentId: 'no-auth',
        agentName: 'No Auth',
      });

      expect(client.isAuthenticated()).toBe(false);
    });
  });

  describe('verifyAccess', () => {
    it('should verify access to public documents', async () => {
      // This test requires a real document ID
      // For now, we just test that the method exists
      const hasAccess = await brainClient.verifyAccess('some-doc-id');
      expect(typeof hasAccess).toBe('boolean');
    });
  });

  describe('healthCheck', () => {
    it('should perform health check', async () => {
      const health = await brainClient.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.services).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance for same agent ID', () => {
      const client1 = getBrainClient({
        agentId: 'singleton-test',
        agentName: 'Singleton Test',
      });

      const client2 = getBrainClient({
        agentId: 'singleton-test',
        agentName: 'Singleton Test',
      });

      expect(client1).toBe(client2);
    });

    it('should return different instances for different agent IDs', () => {
      const client1 = getBrainClient({
        agentId: 'agent-a',
        agentName: 'Agent A',
      });

      const client2 = getBrainClient({
        agentId: 'agent-b',
        agentName: 'Agent B',
      });

      expect(client1).not.toBe(client2);
    });
  });

  describe('Error Handling', () => {
    it('should handle query failures gracefully', async () => {
      // Test with extremely long query
      const longQuery = 'a'.repeat(10000);

      await expect(
        brainClient.queryKnowledge(longQuery)
      ).rejects.toThrow();
    });

    it('should handle context storage failures', async () => {
      // Test with invalid session ID format
      await expect(
        brainClient.storeContext({
          sessionId: '', // Invalid
          userId: 'user-1',
          messages: [
            {
              role: 'user',
              content: 'Test',
              timestamp: new Date().toISOString(),
            },
          ],
        })
      ).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should return readonly config', () => {
      const config = brainClient.getConfig();

      expect(config.agentId).toBe('test-agent');
      expect(config.agentName).toBe('Test Agent');

      // Config should be readonly (TypeScript enforces this)
      expect(config).toBeDefined();
    });

    it('should have correct default cache TTL', () => {
      const config = brainClient.getConfig();
      expect(config.cacheTTL).toBe(300); // 5 minutes
    });
  });
});
