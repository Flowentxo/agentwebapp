/**
 * CONDITION EXECUTOR V2 - COMPREHENSIVE UNIT TESTS
 *
 * Tests for the core condition evaluation logic including:
 * - All comparison operators (equals, contains, greater_than, etc.)
 * - Logical AND/OR group evaluation
 * - Type coercion between strings/numbers/booleans
 * - Variable resolution integration
 * - Edge cases and error handling
 *
 * @testing-guidelines Applied: Unit tests for core logic with comprehensive coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionState } from '@/types/execution';
import {
  ConditionConfig,
  ConditionGroup,
  ConditionRule,
  ValueSource,
} from '@/lib/studio/condition-types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock OpenAI for AI condition tests
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{"result": true, "reason": "AI evaluated", "confidence": 0.9}' } }],
          usage: { total_tokens: 100 },
          model: 'gpt-4o-mini',
        }),
      },
    },
  })),
}));

// Mock VariableService
vi.mock('@/server/services/VariableService', () => ({
  resolveVariablePath: vi.fn((path: string, state: ExecutionState) => {
    // Simple mock implementation for testing
    const parts = path.split('.');
    let current: any = state;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return { found: false, value: undefined, path };
      }
      current = current[part];
    }

    return { found: current !== undefined, value: current, path };
  }),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import {
  ConditionExecutorV2,
  ConditionEvaluationResult,
} from '@/server/services/executors/ConditionExecutorV2';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a standard ExecutionState for testing
 */
function createTestState(overrides?: Partial<ExecutionState>): ExecutionState {
  return {
    global: {
      userId: 'user-123',
      userEmail: 'test@example.com',
      env: {
        API_KEY: 'sk-test-key',
        DEBUG_MODE: 'true',
      },
      workflowId: 'wf-test',
      executionId: 'exec-test',
      startedAt: new Date().toISOString(),
    },
    nodes: {
      'score-node': {
        output: {
          score: 85,
          grade: 'B',
          passed: true,
        },
        meta: {
          executedAt: new Date().toISOString(),
          duration: 100,
        },
      },
      'user-node': {
        output: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          isVip: false,
          tags: ['customer', 'active'],
        },
        meta: {
          executedAt: new Date().toISOString(),
          duration: 50,
        },
      },
      'empty-node': {
        output: {
          emptyString: '',
          nullValue: null,
          emptyArray: [],
          emptyObject: {},
        },
        meta: {},
      },
    },
    variables: {
      threshold: 80,
      maxRetries: 3,
      isEnabled: true,
      status: 'active',
    },
    trigger: {
      type: 'webhook',
      payload: {
        amount: 100.50,
        currency: 'USD',
        customer: {
          id: 'cust-456',
          tier: 'gold',
        },
      },
      receivedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

/**
 * Create a condition rule for testing
 */
function createRule(
  left: ValueSource | any,
  operator: string,
  right?: ValueSource | any,
  id: string = 'test-rule'
): ConditionRule {
  return {
    id,
    left,
    operator,
    right,
    enabled: true,
  };
}

/**
 * Create a condition group for testing
 */
function createGroup(
  operator: 'AND' | 'OR',
  rules: ConditionRule[],
  groups: ConditionGroup[] = []
): ConditionGroup {
  return {
    operator,
    rules,
    groups,
  };
}

/**
 * Create a full condition config for testing
 */
function createConditionConfig(
  condition: ConditionGroup,
  name: string = 'Test Condition'
): ConditionConfig {
  return {
    name,
    description: 'Test condition config',
    condition,
  };
}

// ============================================================================
// HELPER FUNCTION TESTS (via evaluateOperator)
// ============================================================================

describe('ConditionExecutorV2', () => {
  let executor: ConditionExecutorV2;

  beforeEach(() => {
    executor = new ConditionExecutorV2();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // OPERATOR TESTS: EQUALITY
  // ==========================================================================

  describe('Equality Operators', () => {
    describe('equals operator', () => {
      it('should return true for identical strings', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'hello', right: 'hello', operator: 'equals' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
        expect(result.data?.branch).toBe('true');
      });

      it('should return true for equal numbers', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 42, right: 42, operator: 'equals' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return true for string "42" equals number 42 (type coercion)', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: '42', right: 42, operator: 'equals' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false for different values', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'hello', right: 'world', operator: 'equals' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
        expect(result.data?.branch).toBe('false');
      });
    });

    describe('not_equals operator', () => {
      it('should return true for different strings', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'hello', right: 'world', operator: 'not_equals' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false for identical values', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 100, right: 100, operator: 'not_equals' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // OPERATOR TESTS: NUMERIC COMPARISONS
  // ==========================================================================

  describe('Numeric Comparison Operators', () => {
    describe('greater_than operator', () => {
      it('should return true when left > right', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 100, right: 50, operator: 'greater_than' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false when left < right', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 30, right: 50, operator: 'greater_than' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });

      it('should return false when left == right', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 50, right: 50, operator: 'greater_than' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });

      it('should handle string-to-number coercion', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: '100', right: '50', operator: 'greater_than' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should handle currency strings like "$100.50"', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: '$150.00', right: '$100.00', operator: 'greater_than' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });
    });

    describe('less_than operator', () => {
      it('should return true when left < right', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 30, right: 50, operator: 'less_than' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false when left > right', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 100, right: 50, operator: 'less_than' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });

    describe('greater_than_equal operator', () => {
      it('should return true when left >= right', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 50, right: 50, operator: 'greater_than_equal' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });
    });

    describe('less_than_equal operator', () => {
      it('should return true when left <= right', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 50, right: 50, operator: 'less_than_equal' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });
    });
  });

  // ==========================================================================
  // OPERATOR TESTS: STRING OPERATIONS
  // ==========================================================================

  describe('String Operators', () => {
    describe('contains operator', () => {
      it('should return true when string contains substring', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'Hello World', right: 'World', operator: 'contains' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should be case-insensitive', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'Hello World', right: 'WORLD', operator: 'contains' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false when string does not contain substring', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'Hello World', right: 'foo', operator: 'contains' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });

    describe('not_contains operator', () => {
      it('should return true when string does not contain substring', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'Hello World', right: 'foo', operator: 'not_contains' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });
    });

    describe('starts_with operator', () => {
      it('should return true when string starts with prefix', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'Hello World', right: 'Hello', operator: 'starts_with' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });
    });

    describe('ends_with operator', () => {
      it('should return true when string ends with suffix', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'Hello World', right: 'World', operator: 'ends_with' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });
    });

    describe('matches_regex operator', () => {
      it('should return true when string matches regex pattern', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'test@example.com', right: '^[\\w.-]+@[\\w.-]+\\.\\w+$', operator: 'matches_regex' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false for invalid regex (without crashing)', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'test', right: '[invalid(regex', operator: 'matches_regex' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // OPERATOR TESTS: EMPTY CHECKS
  // ==========================================================================

  describe('Empty Check Operators', () => {
    describe('is_empty operator', () => {
      it('should return true for null', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: null, operator: 'is_empty' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return true for undefined', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: undefined, operator: 'is_empty' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return true for empty string', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: '', operator: 'is_empty' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return true for empty array', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: [], operator: 'is_empty' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return true for empty object', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: {}, operator: 'is_empty' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false for non-empty values', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'hello', operator: 'is_empty' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });

    describe('is_not_empty operator', () => {
      it('should return true for non-empty string', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'hello', operator: 'is_not_empty' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false for empty string', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: '', operator: 'is_not_empty' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // OPERATOR TESTS: BOOLEAN CHECKS
  // ==========================================================================

  describe('Boolean Check Operators', () => {
    describe('is_true operator', () => {
      it('should return true for boolean true', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: true, operator: 'is_true' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return true for string "true"', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'true', operator: 'is_true' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return true for string "yes"', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 'yes', operator: 'is_true' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return true for non-zero number', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 1, operator: 'is_true' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false for boolean false', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: false, operator: 'is_true' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });

    describe('is_false operator', () => {
      it('should return true for boolean false', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: false, operator: 'is_false' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return true for zero', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 0, operator: 'is_false' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });
    });
  });

  // ==========================================================================
  // OPERATOR TESTS: TYPE CHECKS
  // ==========================================================================

  describe('Type Check Operators', () => {
    describe('is_number operator', () => {
      it('should return true for number', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: 42, operator: 'is_number' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false for string', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: '42', operator: 'is_number' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });

      it('should return false for NaN', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: NaN, operator: 'is_number' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });

    describe('is_array operator', () => {
      it('should return true for array', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: [1, 2, 3], operator: 'is_array' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false for object', async () => {
        const state = createTestState();
        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: {
              condition: { left: { a: 1 }, operator: 'is_array' },
            },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // CONDITION CONFIG TESTS (Visual Builder Format)
  // ==========================================================================

  describe('ConditionConfig Evaluation', () => {
    describe('Single Rule Evaluation', () => {
      it('should evaluate a single rule condition config', async () => {
        const state = createTestState();
        const conditionConfig = createConditionConfig(
          createGroup('AND', [
            createRule(
              { type: 'constant', value: 85 },
              'greater_than',
              { type: 'constant', value: 80 }
            ),
          ]),
          'Score Check'
        );

        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: { conditionConfig },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
        expect(result.data?.ruleEvaluations).toHaveLength(1);
        expect(result.data?.ruleEvaluations?.[0].passed).toBe(true);
      });
    });

    describe('AND Group Evaluation', () => {
      it('should return true when all rules in AND group pass', async () => {
        const state = createTestState();
        const conditionConfig = createConditionConfig(
          createGroup('AND', [
            createRule(100, 'greater_than', 50, 'rule-1'),
            createRule('hello', 'contains', 'ell', 'rule-2'),
            createRule(true, 'is_true', undefined, 'rule-3'),
          ]),
          'All Pass AND'
        );

        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: { conditionConfig },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
        expect(result.data?.ruleEvaluations).toHaveLength(3);
      });

      it('should return false when any rule in AND group fails', async () => {
        const state = createTestState();
        const conditionConfig = createConditionConfig(
          createGroup('AND', [
            createRule(100, 'greater_than', 50, 'rule-1'), // true
            createRule(30, 'greater_than', 50, 'rule-2'),  // false
            createRule(true, 'is_true', undefined, 'rule-3'), // true
          ]),
          'One Fail AND'
        );

        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: { conditionConfig },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });

    describe('OR Group Evaluation', () => {
      it('should return true when any rule in OR group passes', async () => {
        const state = createTestState();
        const conditionConfig = createConditionConfig(
          createGroup('OR', [
            createRule(30, 'greater_than', 50, 'rule-1'),  // false
            createRule(100, 'greater_than', 50, 'rule-2'), // true
            createRule(false, 'is_true', undefined, 'rule-3'), // false
          ]),
          'One Pass OR'
        );

        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: { conditionConfig },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should return false when all rules in OR group fail', async () => {
        const state = createTestState();
        const conditionConfig = createConditionConfig(
          createGroup('OR', [
            createRule(30, 'greater_than', 50, 'rule-1'),  // false
            createRule(20, 'greater_than', 50, 'rule-2'),  // false
          ]),
          'All Fail OR'
        );

        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: { conditionConfig },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(false);
      });
    });

    describe('Nested Group Evaluation', () => {
      it('should evaluate nested groups correctly: (A AND B) OR C', async () => {
        const state = createTestState();

        // (A AND B) OR C
        // A: 100 > 50 = true
        // B: 30 > 50 = false
        // C: true is_true = true
        // Result: (true AND false) OR true = false OR true = true

        const conditionConfig = createConditionConfig(
          createGroup('OR', [], [
            // Nested group: A AND B
            createGroup('AND', [
              createRule(100, 'greater_than', 50, 'rule-A'),
              createRule(30, 'greater_than', 50, 'rule-B'),
            ]),
            // Another "group" with just C (as a single-rule group)
            createGroup('AND', [
              createRule(true, 'is_true', undefined, 'rule-C'),
            ]),
          ]),
          'Nested (A AND B) OR C'
        );

        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: { conditionConfig },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });

      it('should evaluate complex nested groups: (A OR B) AND (C OR D)', async () => {
        const state = createTestState();

        // (A OR B) AND (C OR D)
        // A: false, B: true => (A OR B) = true
        // C: false, D: true => (C OR D) = true
        // Result: true AND true = true

        const conditionConfig = createConditionConfig(
          createGroup('AND', [], [
            // Nested group: A OR B
            createGroup('OR', [
              createRule(false, 'is_true', undefined, 'rule-A'),
              createRule(true, 'is_true', undefined, 'rule-B'),
            ]),
            // Nested group: C OR D
            createGroup('OR', [
              createRule(false, 'is_true', undefined, 'rule-C'),
              createRule(true, 'is_true', undefined, 'rule-D'),
            ]),
          ]),
          'Nested (A OR B) AND (C OR D)'
        );

        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: { conditionConfig },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });
    });

    describe('Empty Group Handling', () => {
      it('should return true for empty group (no rules)', async () => {
        const state = createTestState();
        const conditionConfig = createConditionConfig(
          createGroup('AND', []),
          'Empty Group'
        );

        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: { conditionConfig },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
      });
    });

    describe('Disabled Rules', () => {
      it('should skip disabled rules in evaluation', async () => {
        const state = createTestState();
        const disabledRule = createRule(30, 'greater_than', 50, 'disabled-rule');
        disabledRule.enabled = false;

        const conditionConfig = createConditionConfig(
          createGroup('AND', [
            createRule(100, 'greater_than', 50, 'enabled-rule'),
            disabledRule, // This would fail if evaluated
          ]),
          'With Disabled Rule'
        );

        const result = await executor.execute({
          node: {
            id: 'cond-1',
            type: 'condition',
            data: { conditionConfig },
            position: { x: 0, y: 0 },
          },
          context: { state, workflowId: 'test', executionId: 'test' },
          inputs: {},
        });

        expect(result.success).toBe(true);
        expect(result.data?.result).toBe(true);
        // Only the enabled rule should be in evaluations
        expect(result.data?.ruleEvaluations).toHaveLength(1);
      });
    });
  });

  // ==========================================================================
  // VARIABLE RESOLUTION TESTS
  // ==========================================================================

  describe('Variable Resolution in Conditions', () => {
    it('should resolve {{variable}} references in condition values', async () => {
      const state = createTestState();

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: {
            condition: {
              left: '{{variables.threshold}}',
              right: 70,
              operator: 'greater_than',
            },
          },
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      expect(result.success).toBe(true);
      // threshold is 80, which is > 70
      expect(result.data?.result).toBe(true);
    });

    it('should resolve step output references', async () => {
      const state = createTestState();

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: {
            condition: {
              left: '{{nodes.score-node.output.score}}',
              right: 80,
              operator: 'greater_than',
            },
          },
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      expect(result.success).toBe(true);
      // score is 85, which is > 80
      expect(result.data?.result).toBe(true);
    });
  });

  // ==========================================================================
  // DEFAULT / FALLBACK BEHAVIOR TESTS
  // ==========================================================================

  describe('Default Behavior', () => {
    it('should default to true when no condition is configured', async () => {
      const state = createTestState();

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: {},
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe(true);
      expect(result.data?.reason).toContain('No condition configured');
    });

    it('should handle unknown operators gracefully (return false)', async () => {
      const state = createTestState();

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: {
            condition: {
              left: 100,
              right: 50,
              operator: 'unknown_operator',
            },
          },
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe(false);
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle rule evaluation errors gracefully', async () => {
      const state = createTestState();

      // Create a condition config that might cause issues
      const conditionConfig = createConditionConfig(
        createGroup('AND', [
          {
            id: 'error-rule',
            left: { type: 'variable', variableName: 'nonexistent.deep.path' },
            operator: 'equals',
            right: 'test',
            enabled: true,
          } as ConditionRule,
        ]),
        'Error Test'
      );

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: { conditionConfig },
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      // Should not crash, should return a result
      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // JAVASCRIPT EXPRESSION TESTS (Legacy)
  // ==========================================================================

  describe('JavaScript Expression Evaluation (Legacy)', () => {
    it('should evaluate simple JS expression conditions', async () => {
      const state = createTestState();

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: {
            condition: '10 > 5',
          },
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      expect(result.success).toBe(true);
      expect(result.data?.result).toBe(true);
    });

    it('should access variables in JS expressions', async () => {
      const state = createTestState();

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: {
            condition: 'variables.threshold > 70',
          },
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      expect(result.success).toBe(true);
      // threshold is 80, which is > 70
      expect(result.data?.result).toBe(true);
    });
  });

  // ==========================================================================
  // OUTPUT FORMAT TESTS
  // ==========================================================================

  describe('Output Format', () => {
    it('should include branch in output data', async () => {
      const state = createTestState();

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: {
            condition: { left: true, operator: 'is_true' },
          },
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      expect(result.data).toHaveProperty('branch');
      expect(['true', 'false']).toContain(result.data?.branch);
    });

    it('should include reason in output data', async () => {
      const state = createTestState();

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: {
            condition: { left: 100, right: 50, operator: 'greater_than' },
          },
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      expect(result.data).toHaveProperty('reason');
      expect(typeof result.data?.reason).toBe('string');
    });

    it('should include ruleEvaluations when using conditionConfig', async () => {
      const state = createTestState();
      const conditionConfig = createConditionConfig(
        createGroup('AND', [
          createRule(100, 'greater_than', 50, 'test-rule'),
        ])
      );

      const result = await executor.execute({
        node: {
          id: 'cond-1',
          type: 'condition',
          data: { conditionConfig },
          position: { x: 0, y: 0 },
        },
        context: { state, workflowId: 'test', executionId: 'test' },
        inputs: {},
      });

      expect(result.data).toHaveProperty('ruleEvaluations');
      expect(Array.isArray(result.data?.ruleEvaluations)).toBe(true);
      expect(result.data?.ruleEvaluations?.[0]).toMatchObject({
        ruleId: 'test-rule',
        passed: true,
        leftValue: 100,
        rightValue: 50,
        operator: 'greater_than',
      });
    });
  });
});
