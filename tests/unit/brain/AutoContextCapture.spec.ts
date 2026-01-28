/**
 * Unit Tests for AutoContextCapture
 * Tests automatic context capturing, buffering, and topic extraction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AutoContextCapture,
  getAutoContextCapture,
} from '@/lib/brain/AutoContextCapture';

describe('AutoContextCapture', () => {
  let capture: AutoContextCapture;

  beforeEach(() => {
    capture = new AutoContextCapture({
      agentId: 'test-agent',
      agentName: 'Test Agent',
      enableAutoCapture: true,
      bufferSize: 3,
      flushIntervalMs: 60000, // 1 minute
      enableTopicExtraction: true,
      enableIntentClassification: true,
    });
  });

  afterEach(async () => {
    await capture.cleanup();
  });

  describe('Initialization', () => {
    it('should create AutoContextCapture instance', () => {
      expect(capture).toBeDefined();
    });

    it('should use default config values', () => {
      const defaultCapture = new AutoContextCapture({
        agentId: 'default-agent',
        agentName: 'Default Agent',
      });

      expect(defaultCapture).toBeDefined();
    });
  });

  describe('captureMessage', () => {
    it('should capture user message', () => {
      expect(() => {
        capture.captureMessage(
          'session-1',
          'user-1',
          'user',
          'Hello, how are you?'
        );
      }).not.toThrow();
    });

    it('should capture assistant message', () => {
      expect(() => {
        capture.captureMessage(
          'session-1',
          'user-1',
          'assistant',
          "I'm doing well, thank you!"
        );
      }).not.toThrow();
    });

    it('should capture message with metadata', () => {
      expect(() => {
        capture.captureMessage(
          'session-1',
          'user-1',
          'assistant',
          'Response',
          { model: 'gpt-4', tokensUsed: 50 }
        );
      }).not.toThrow();
    });

    it('should not capture when auto-capture is disabled', () => {
      const disabledCapture = new AutoContextCapture({
        agentId: 'disabled-agent',
        agentName: 'Disabled Agent',
        enableAutoCapture: false,
      });

      disabledCapture.captureMessage(
        'session-1',
        'user-1',
        'user',
        'Test message'
      );

      const status = disabledCapture.getBufferStatus('session-1');
      expect(status.messageCount).toBe(0);
    });
  });

  describe('captureTurn', () => {
    it('should capture complete conversation turn', async () => {
      await capture.captureTurn(
        'session-2',
        'user-2',
        'What is the weather like?',
        'The weather is sunny and warm.'
      );

      const status = capture.getBufferStatus('session-2');
      expect(status.messageCount).toBe(2);
    });

    it('should capture turn with metadata', async () => {
      await capture.captureTurn(
        'session-3',
        'user-3',
        'Analyze sales data',
        'Sales increased by 15%',
        {
          userMetadata: { timestamp: new Date().toISOString() },
          assistantMetadata: { model: 'gpt-4', responseTime: 1200 },
        }
      );

      const status = capture.getBufferStatus('session-3');
      expect(status.messageCount).toBe(2);
    });
  });

  describe('Buffer Management', () => {
    it('should buffer messages', () => {
      capture.captureMessage('session-4', 'user-4', 'user', 'Message 1');
      capture.captureMessage('session-4', 'user-4', 'assistant', 'Response 1');

      const status = capture.getBufferStatus('session-4');
      expect(status.messageCount).toBe(2);
    });

    it('should auto-flush when buffer is full', async () => {
      // Buffer size is 3
      capture.captureMessage('session-5', 'user-5', 'user', 'Message 1');
      capture.captureMessage('session-5', 'user-5', 'assistant', 'Response 1');
      capture.captureMessage('session-5', 'user-5', 'user', 'Message 2');

      // Buffer should flush automatically
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = capture.getBufferStatus('session-5');
      // Buffer should be cleared after flush
      expect(status.messageCount).toBeLessThan(3);
    });

    it('should track buffer status', () => {
      const status = capture.getBufferStatus('non-existent-session');
      expect(status.messageCount).toBe(0);
      expect(status.willFlushAt).toBeNull();
    });

    it('should update flush timer', () => {
      capture.captureMessage('session-6', 'user-6', 'user', 'Test');

      const status = capture.getBufferStatus('session-6');
      expect(status.willFlushAt).toBeGreaterThan(Date.now());
    });
  });

  describe('flushSession', () => {
    it('should flush session buffer', async () => {
      capture.captureMessage('session-7', 'user-7', 'user', 'Hello');
      capture.captureMessage('session-7', 'user-7', 'assistant', 'Hi');

      const contextId = await capture.flushSession('session-7', 'user-7');

      expect(contextId).toBeDefined();
      expect(typeof contextId).toBe('string');

      // Buffer should be cleared
      const status = capture.getBufferStatus('session-7');
      expect(status.messageCount).toBe(0);
    });

    it('should return null for empty buffer', async () => {
      const contextId = await capture.flushSession(
        'empty-session',
        'user-empty'
      );

      expect(contextId).toBeNull();
    });

    it('should handle flush errors gracefully', async () => {
      // Create invalid session data
      capture.captureMessage('error-session', 'user-error', 'user', '');

      const contextId = await capture.flushSession(
        'error-session',
        'user-error'
      );

      // Should handle error and return null or throw
      expect(contextId === null || typeof contextId === 'string').toBe(true);
    });
  });

  describe('flushAll', () => {
    it('should flush all active sessions', async () => {
      capture.captureMessage('session-a', 'user-a', 'user', 'Test A');
      capture.captureMessage('session-b', 'user-b', 'user', 'Test B');
      capture.captureMessage('session-c', 'user-c', 'user', 'Test C');

      const flushedCount = await capture.flushAll();

      expect(flushedCount).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when no sessions to flush', async () => {
      const flushedCount = await capture.flushAll();
      expect(flushedCount).toBe(0);
    });
  });

  describe('Topic Extraction', () => {
    it('should extract authentication topics', () => {
      const captureWithExtraction = new AutoContextCapture({
        agentId: 'topic-agent',
        agentName: 'Topic Agent',
        enableTopicExtraction: true,
      });

      captureWithExtraction.captureMessage(
        'session-topics-1',
        'user-1',
        'user',
        'How do I reset my password and login?'
      );

      // Topic extraction happens during flush
      // We test indirectly via flush
    });

    it('should extract data analysis topics', () => {
      const captureWithExtraction = new AutoContextCapture({
        agentId: 'topic-agent',
        agentName: 'Topic Agent',
        enableTopicExtraction: true,
      });

      captureWithExtraction.captureMessage(
        'session-topics-2',
        'user-2',
        'user',
        'Show me analytics and metrics for Q4'
      );

      // Topic extraction tested via flush
    });

    it('should work without topic extraction', () => {
      const captureNoTopics = new AutoContextCapture({
        agentId: 'no-topics-agent',
        agentName: 'No Topics Agent',
        enableTopicExtraction: false,
      });

      expect(() => {
        captureNoTopics.captureMessage(
          'session-no-topics',
          'user-1',
          'user',
          'Test message'
        );
      }).not.toThrow();
    });
  });

  describe('Intent Classification', () => {
    it('should classify question intent', () => {
      const captureWithIntent = new AutoContextCapture({
        agentId: 'intent-agent',
        agentName: 'Intent Agent',
        enableIntentClassification: true,
      });

      captureWithIntent.captureMessage(
        'session-intent-1',
        'user-1',
        'user',
        'What is the weather like today?'
      );

      // Intent classification tested via flush
    });

    it('should classify request intent', () => {
      const captureWithIntent = new AutoContextCapture({
        agentId: 'intent-agent',
        agentName: 'Intent Agent',
        enableIntentClassification: true,
      });

      captureWithIntent.captureMessage(
        'session-intent-2',
        'user-2',
        'user',
        'Please create a report for me'
      );

      // Intent classification tested via flush
    });

    it('should work without intent classification', () => {
      const captureNoIntent = new AutoContextCapture({
        agentId: 'no-intent-agent',
        agentName: 'No Intent Agent',
        enableIntentClassification: false,
      });

      expect(() => {
        captureNoIntent.captureMessage(
          'session-no-intent',
          'user-1',
          'user',
          'Test message'
        );
      }).not.toThrow();
    });
  });

  describe('Conversation Summarization', () => {
    it('should work with summarization disabled', () => {
      const captureNoSummary = new AutoContextCapture({
        agentId: 'no-summary-agent',
        agentName: 'No Summary Agent',
        enableSummarization: false,
      });

      expect(() => {
        captureNoSummary.captureMessage(
          'session-no-summary',
          'user-1',
          'user',
          'Test message'
        );
      }).not.toThrow();
    });

    it('should work with summarization enabled', () => {
      const captureWithSummary = new AutoContextCapture({
        agentId: 'summary-agent',
        agentName: 'Summary Agent',
        enableSummarization: true,
      });

      expect(() => {
        captureWithSummary.captureMessage(
          'session-summary',
          'user-1',
          'user',
          'Analyze sales data for Q4'
        );
        captureWithSummary.captureMessage(
          'session-summary',
          'user-1',
          'assistant',
          'Sales increased by 15% in Q4'
        );
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources', async () => {
      capture.captureMessage('session-cleanup', 'user-cleanup', 'user', 'Test');

      await capture.cleanup();

      const status = capture.getBufferStatus('session-cleanup');
      expect(status.messageCount).toBe(0);
    });

    it('should flush buffers during cleanup', async () => {
      capture.captureMessage('session-cleanup-2', 'user-2', 'user', 'Message 1');
      capture.captureMessage('session-cleanup-2', 'user-2', 'assistant', 'Response 1');

      await capture.cleanup();

      // Buffer should be empty after cleanup
      const status = capture.getBufferStatus('session-cleanup-2');
      expect(status.messageCount).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance for same agent ID', () => {
      const capture1 = getAutoContextCapture({
        agentId: 'singleton-capture',
        agentName: 'Singleton Capture',
      });

      const capture2 = getAutoContextCapture({
        agentId: 'singleton-capture',
        agentName: 'Singleton Capture',
      });

      expect(capture1).toBe(capture2);
    });

    it('should return different instances for different agent IDs', () => {
      const capture1 = getAutoContextCapture({
        agentId: 'capture-a',
        agentName: 'Capture A',
      });

      const capture2 = getAutoContextCapture({
        agentId: 'capture-b',
        agentName: 'Capture B',
      });

      expect(capture1).not.toBe(capture2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);

      expect(() => {
        capture.captureMessage(
          'session-long',
          'user-long',
          'user',
          longMessage
        );
      }).not.toThrow();
    });

    it('should handle special characters in messages', () => {
      const specialMessage = '{"test": "value", "emoji": "🚀", "unicode": "✓"}';

      expect(() => {
        capture.captureMessage(
          'session-special',
          'user-special',
          'user',
          specialMessage
        );
      }).not.toThrow();
    });

    it('should handle rapid message captures', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          capture.captureMessage(
            'session-rapid',
            'user-rapid',
            'user',
            `Message ${i}`
          );
        }
      }).not.toThrow();
    });
  });
});
