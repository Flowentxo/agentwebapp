/**
 * Unit tests for agent selectors
 * Testing the isAgentComplete logic with various scenarios
 */

import { describe, it, expect } from 'vitest';
import { isAgentComplete, filterCompleteAgents, countAgentsByStatus } from '@/lib/agents/selectors';
import { type Agent } from '@/components/agents/AgentsTable';

describe('isAgentComplete', () => {
  describe('null/undefined handling', () => {
    it('should return false for null agent', () => {
      expect(isAgentComplete(null)).toBe(false);
    });

    it('should return false for undefined agent', () => {
      expect(isAgentComplete(undefined)).toBe(false);
    });
  });

  describe('explicit disabled check', () => {
    it('should return false when enabled is false', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        enabled: false,
        buildStatus: 'complete',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });
  });

  describe('explicit API flags (primary source of truth)', () => {
    it('should return true when buildStatus is complete', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        buildStatus: 'complete',
      };
      expect(isAgentComplete(agent)).toBe(true);
    });

    it('should return false when buildStatus is incomplete', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        buildStatus: 'incomplete',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return false when buildStatus is deprecated', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        buildStatus: 'deprecated',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return true when state is ready', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        state: 'ready',
      };
      expect(isAgentComplete(agent)).toBe(true);
    });

    it('should return false when state is draft', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        state: 'draft',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return false when state is disabled', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        state: 'disabled',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return true when isComplete is true', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        isComplete: true,
      };
      expect(isAgentComplete(agent)).toBe(true);
    });

    it('should return false when isComplete is false', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        isComplete: false,
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should prioritize buildStatus over heuristic', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: ['test'],
        buildStatus: 'incomplete',
        // Heuristic would pass but explicit flag should take precedence
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 99 },
        tools: ['tool1'],
        version: '1.0.0',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });
  });

  describe('heuristic fallback (when no explicit flags)', () => {
    it('should return true when all heuristic criteria are met', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: ['test'],
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 95 },
        tools: ['tool1', 'tool2'],
        version: '1.0.0',
      };
      expect(isAgentComplete(agent)).toBe(true);
    });

    it('should return false when endpoint is missing', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: ['test'],
        // No endpoints
        health: { uptimePct: 95 },
        tools: ['tool1'],
        version: '1.0.0',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return false when uptime is below 90%', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: ['test'],
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 89 },
        tools: ['tool1'],
        version: '1.0.0',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return true when uptime is exactly 90%', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: ['test'],
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 90 },
        tools: ['tool1'],
        version: '1.0.0',
      };
      expect(isAgentComplete(agent)).toBe(true);
    });

    it('should return false when successRate is invalid', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: -1, // Invalid
        avgTimeSec: 1.0,
        tags: ['test'],
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 95 },
        tools: ['tool1'],
        version: '1.0.0',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return true when successRate is 0 (valid)', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 0,
        avgTimeSec: 1.0,
        tags: ['test'],
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 95 },
        tools: ['tool1'],
        version: '1.0.0',
      };
      expect(isAgentComplete(agent)).toBe(true);
    });

    it('should return false when tools array is empty', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: ['test'],
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 95 },
        tools: [], // Empty
        version: '1.0.0',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return false when tools is not an array', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: ['test'],
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 95 },
        // No tools
        version: '1.0.0',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return false when version is empty string', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: ['test'],
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 95 },
        tools: ['tool1'],
        version: '',
      };
      expect(isAgentComplete(agent)).toBe(false);
    });

    it('should return false when version is missing', () => {
      const agent: Agent = {
        id: 'test',
        name: 'Test',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: ['test'],
        endpoints: { primary: 'http://test.com' },
        health: { uptimePct: 95 },
        tools: ['tool1'],
        // No version
      };
      expect(isAgentComplete(agent)).toBe(false);
    });
  });
});

describe('filterCompleteAgents', () => {
  it('should filter out incomplete agents', () => {
    const agents: Agent[] = [
      {
        id: 'complete1',
        name: 'Complete 1',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        buildStatus: 'complete',
      },
      {
        id: 'incomplete1',
        name: 'Incomplete 1',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        buildStatus: 'incomplete',
      },
      {
        id: 'complete2',
        name: 'Complete 2',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        state: 'ready',
      },
    ];

    const result = filterCompleteAgents(agents);

    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(['complete1', 'complete2']);
  });

  it('should return empty array when no complete agents', () => {
    const agents: Agent[] = [
      {
        id: 'incomplete1',
        name: 'Incomplete 1',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
        buildStatus: 'incomplete',
      },
    ];

    const result = filterCompleteAgents(agents);

    expect(result).toHaveLength(0);
  });

  it('should handle empty input array', () => {
    const result = filterCompleteAgents([]);
    expect(result).toHaveLength(0);
  });
});

describe('countAgentsByStatus', () => {
  it('should count agents by status correctly', () => {
    const agents: Agent[] = [
      {
        id: '1',
        name: 'Agent 1',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
      },
      {
        id: '2',
        name: 'Agent 2',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
      },
      {
        id: '3',
        name: 'Agent 3',
        status: 'degraded',
        requests: 1000,
        successRate: 80,
        avgTimeSec: 2.0,
        tags: [],
      },
      {
        id: '4',
        name: 'Agent 4',
        status: 'error',
        requests: 1000,
        successRate: 50,
        avgTimeSec: 3.0,
        tags: [],
      },
    ];

    const result = countAgentsByStatus(agents);

    expect(result).toEqual({
      healthy: 2,
      degraded: 1,
      error: 1,
    });
  });

  it('should return zero counts for empty array', () => {
    const result = countAgentsByStatus([]);

    expect(result).toEqual({
      healthy: 0,
      degraded: 0,
      error: 0,
    });
  });

  it('should handle array with only one status type', () => {
    const agents: Agent[] = [
      {
        id: '1',
        name: 'Agent 1',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
      },
      {
        id: '2',
        name: 'Agent 2',
        status: 'healthy',
        requests: 1000,
        successRate: 95,
        avgTimeSec: 1.0,
        tags: [],
      },
    ];

    const result = countAgentsByStatus(agents);

    expect(result).toEqual({
      healthy: 2,
      degraded: 0,
      error: 0,
    });
  });
});
