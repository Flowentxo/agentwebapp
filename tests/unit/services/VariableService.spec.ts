/**
 * VARIABLE SERVICE - UNIT TESTS
 *
 * Comprehensive test suite for the VariableService.
 * Tests all variable resolution patterns, edge cases, and security features.
 *
 * @file tests/unit/services/VariableService.spec.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveVariables,
  resolveVariablePath,
  interpolateString,
  findVariableMatches,
  getValueByPath,
  setVariable,
  storeNodeOutput,
  createInitialState,
  findMissingVariables,
  isPathSafe,
} from '@/server/services/VariableService';
import type { ExecutionState } from '@/types/execution';

// ============================================================================
// MOCK LOGGER
// ============================================================================

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a standard test execution state
 */
function createTestState(overrides?: Partial<ExecutionState>): ExecutionState {
  return {
    global: {
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      workspaceId: 'workspace-456',
      env: {
        API_KEY: 'sk-test-key-12345',
        BASE_URL: 'https://api.example.com',
        NODE_ENV: 'test',
      },
      timestamp: 1704067200000, // 2024-01-01 00:00:00 UTC
      isTest: true,
    },
    nodes: {
      'llm-node-1': {
        output: {
          response: 'Hello, World!',
          tokens: 50,
          model: 'gpt-4',
        },
        meta: {
          status: 'completed',
          startedAt: 1704067200000,
          completedAt: 1704067201000,
          durationMs: 1000,
        },
      },
      'analyze-node': {
        output: {
          analysis: {
            score: 85,
            category: 'positive',
            details: {
              confidence: 0.92,
              factors: ['factor1', 'factor2'],
            },
          },
          rawData: [1, 2, 3, 4, 5],
        },
        meta: {
          status: 'completed',
          startedAt: 1704067202000,
          completedAt: 1704067203000,
          durationMs: 1000,
        },
      },
    },
    variables: {
      customVar: 'my-custom-value',
      count: 42,
      isActive: true,
      config: {
        maxRetries: 3,
        timeout: 5000,
      },
    },
    trigger: {
      type: 'webhook',
      payload: {
        email: 'webhook@example.com',
        data: {
          orderId: 'ORD-001',
          items: ['item1', 'item2'],
          metadata: {
            source: 'api',
            priority: 'high',
          },
        },
      },
      timestamp: 1704067200000,
    },
    ...overrides,
  };
}

// ============================================================================
// TESTS: resolveVariablePath
// ============================================================================

describe('resolveVariablePath', () => {
  let state: ExecutionState;

  beforeEach(() => {
    state = createTestState();
  });

  describe('Trigger Resolution', () => {
    it('should resolve trigger payload root', () => {
      const result = resolveVariablePath('trigger.payload', state);
      expect(result.found).toBe(true);
      expect(result.value).toEqual(state.trigger.payload);
    });

    it('should resolve trigger.payload.email', () => {
      const result = resolveVariablePath('trigger.payload.email', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('webhook@example.com');
    });

    it('should resolve nested trigger data', () => {
      const result = resolveVariablePath('trigger.payload.data.orderId', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('ORD-001');
    });

    it('should resolve deeply nested trigger data', () => {
      const result = resolveVariablePath('trigger.payload.data.metadata.priority', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('high');
    });

    it('should resolve trigger type', () => {
      const result = resolveVariablePath('trigger.type', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('webhook');
    });

    it('should resolve trigger timestamp', () => {
      const result = resolveVariablePath('trigger.timestamp', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(1704067200000);
    });

    it('should resolve trigger array data', () => {
      const result = resolveVariablePath('trigger.payload.data.items', state);
      expect(result.found).toBe(true);
      expect(result.value).toEqual(['item1', 'item2']);
    });
  });

  describe('Step Output Resolution', () => {
    it('should resolve node output root', () => {
      const result = resolveVariablePath('llm-node-1.output', state);
      expect(result.found).toBe(true);
      expect(result.value).toEqual({
        response: 'Hello, World!',
        tokens: 50,
        model: 'gpt-4',
      });
    });

    it('should resolve node output field', () => {
      const result = resolveVariablePath('llm-node-1.output.response', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('Hello, World!');
    });

    it('should resolve deeply nested node output', () => {
      const result = resolveVariablePath('analyze-node.output.analysis.score', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(85);
    });

    it('should resolve very deeply nested node output', () => {
      const result = resolveVariablePath('analyze-node.output.analysis.details.confidence', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(0.92);
    });

    it('should resolve node output array', () => {
      const result = resolveVariablePath('analyze-node.output.analysis.details.factors', state);
      expect(result.found).toBe(true);
      expect(result.value).toEqual(['factor1', 'factor2']);
    });

    it('should resolve node meta status', () => {
      const result = resolveVariablePath('llm-node-1.meta.status', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('completed');
    });

    it('should resolve node meta durationMs', () => {
      const result = resolveVariablePath('llm-node-1.meta.durationMs', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(1000);
    });

    it('should return not found for non-existent node', () => {
      const result = resolveVariablePath('non-existent-node.output', state);
      expect(result.found).toBe(false);
      expect(result.value).toBeUndefined();
      expect(result.error).toContain('not found');
    });

    it('should return not found for non-existent output field', () => {
      const result = resolveVariablePath('llm-node-1.output.nonExistentField', state);
      expect(result.found).toBe(false);
      expect(result.value).toBeUndefined();
    });
  });

  describe('Global & Environment Resolution', () => {
    it('should resolve global.userId', () => {
      const result = resolveVariablePath('global.userId', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('user-123');
    });

    it('should resolve global.userEmail', () => {
      const result = resolveVariablePath('global.userEmail', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('test@example.com');
    });

    it('should resolve global.env.API_KEY', () => {
      const result = resolveVariablePath('global.env.API_KEY', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('sk-test-key-12345');
    });

    it('should resolve global.env.BASE_URL', () => {
      const result = resolveVariablePath('global.env.BASE_URL', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('https://api.example.com');
    });

    it('should resolve global.timestamp', () => {
      const result = resolveVariablePath('global.timestamp', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(1704067200000);
    });

    it('should resolve global.isTest', () => {
      const result = resolveVariablePath('global.isTest', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return not found for non-existent env var', () => {
      const result = resolveVariablePath('global.env.NON_EXISTENT', state);
      expect(result.found).toBe(false);
      expect(result.value).toBeUndefined();
    });
  });

  describe('Variables Resolution', () => {
    it('should resolve variables.customVar', () => {
      const result = resolveVariablePath('variables.customVar', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('my-custom-value');
    });

    it('should resolve variables with number value', () => {
      const result = resolveVariablePath('variables.count', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should resolve variables with boolean value', () => {
      const result = resolveVariablePath('variables.isActive', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should resolve nested variable object', () => {
      const result = resolveVariablePath('variables.config.maxRetries', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(3);
    });

    it('should return not found for non-existent variable', () => {
      const result = resolveVariablePath('variables.nonExistent', state);
      expect(result.found).toBe(false);
      expect(result.value).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty path', () => {
      const result = resolveVariablePath('', state);
      expect(result.found).toBe(false);
    });

    it('should handle whitespace in path', () => {
      const result = resolveVariablePath('  trigger.payload.email  ', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('webhook@example.com');
    });

    it('should handle null values in state', () => {
      const stateWithNull = createTestState({
        variables: { nullValue: null },
      });
      const result = resolveVariablePath('variables.nullValue', stateWithNull);
      expect(result.found).toBe(true);
      expect(result.value).toBe(null);
    });

    it('should handle undefined values in state', () => {
      const stateWithUndefined = createTestState({
        variables: { undefinedValue: undefined },
      });
      const result = resolveVariablePath('variables.undefinedValue', stateWithUndefined);
      expect(result.found).toBe(false);
      expect(result.value).toBeUndefined();
    });

    it('should handle empty string values', () => {
      const stateWithEmpty = createTestState({
        variables: { emptyString: '' },
      });
      const result = resolveVariablePath('variables.emptyString', stateWithEmpty);
      expect(result.found).toBe(true);
      expect(result.value).toBe('');
    });

    it('should handle zero values', () => {
      const stateWithZero = createTestState({
        variables: { zero: 0 },
      });
      const result = resolveVariablePath('variables.zero', stateWithZero);
      expect(result.found).toBe(true);
      expect(result.value).toBe(0);
    });

    it('should handle false boolean values', () => {
      const stateWithFalse = createTestState({
        variables: { isFalse: false },
      });
      const result = resolveVariablePath('variables.isFalse', stateWithFalse);
      expect(result.found).toBe(true);
      expect(result.value).toBe(false);
    });
  });
});

// ============================================================================
// TESTS: resolveVariables (Main Recursive Resolver)
// ============================================================================

describe('resolveVariables', () => {
  let state: ExecutionState;

  beforeEach(() => {
    state = createTestState();
  });

  describe('String Resolution', () => {
    it('should resolve pure variable reference to its actual type', () => {
      const result = resolveVariables('{{llm-node-1.output}}', state);
      expect(result).toEqual({
        response: 'Hello, World!',
        tokens: 50,
        model: 'gpt-4',
      });
    });

    it('should resolve embedded variable in string', () => {
      const result = resolveVariables('Hello, {{global.userName}}!', state);
      expect(result).toBe('Hello, Test User!');
    });

    it('should resolve multiple variables in string', () => {
      const result = resolveVariables(
        'User {{global.userId}} with email {{global.userEmail}}',
        state
      );
      expect(result).toBe('User user-123 with email test@example.com');
    });

    it('should preserve number when pure reference', () => {
      const result = resolveVariables('{{variables.count}}', state);
      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should preserve boolean when pure reference', () => {
      const result = resolveVariables('{{variables.isActive}}', state);
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should preserve array when pure reference', () => {
      const result = resolveVariables('{{trigger.payload.data.items}}', state);
      expect(result).toEqual(['item1', 'item2']);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should JSON stringify objects in embedded context', () => {
      const result = resolveVariables('Config: {{variables.config}}', state);
      expect(result).toBe('Config: {"maxRetries":3,"timeout":5000}');
    });

    it('should return undefined for non-existent pure reference', () => {
      const result = resolveVariables('{{nonExistent.path}}', state);
      expect(result).toBeUndefined();
    });

    it('should keep original placeholder for non-existent embedded reference', () => {
      const result = resolveVariables('Value: {{nonExistent.path}}', state);
      expect(result).toBe('Value: {{nonExistent.path}}');
    });
  });

  describe('Object Resolution', () => {
    it('should recursively resolve object values', () => {
      const input = {
        name: '{{global.userName}}',
        email: '{{global.userEmail}}',
        constant: 'static-value',
      };
      const result = resolveVariables(input, state);
      expect(result).toEqual({
        name: 'Test User',
        email: 'test@example.com',
        constant: 'static-value',
      });
    });

    it('should resolve nested objects', () => {
      const input = {
        user: {
          id: '{{global.userId}}',
          settings: {
            active: '{{variables.isActive}}',
          },
        },
      };
      const result = resolveVariables(input, state);
      expect(result).toEqual({
        user: {
          id: 'user-123',
          settings: {
            active: true,
          },
        },
      });
    });

    it('should preserve non-variable values', () => {
      const input = {
        number: 123,
        boolean: true,
        nested: { value: 'static' },
      };
      const result = resolveVariables(input, state);
      expect(result).toEqual(input);
    });
  });

  describe('Array Resolution', () => {
    it('should resolve variables in array elements', () => {
      const input = ['{{global.userId}}', '{{global.userEmail}}', 'static'];
      const result = resolveVariables(input, state);
      expect(result).toEqual(['user-123', 'test@example.com', 'static']);
    });

    it('should resolve nested arrays and objects', () => {
      const input = [
        { name: '{{global.userName}}' },
        ['{{variables.count}}', '{{trigger.type}}'],
      ];
      const result = resolveVariables(input, state);
      expect(result).toEqual([
        { name: 'Test User' },
        [42, 'webhook'],
      ]);
    });
  });

  describe('Primitive Passthrough', () => {
    it('should pass through null', () => {
      expect(resolveVariables(null, state)).toBe(null);
    });

    it('should pass through undefined', () => {
      expect(resolveVariables(undefined, state)).toBe(undefined);
    });

    it('should pass through numbers', () => {
      expect(resolveVariables(42, state)).toBe(42);
    });

    it('should pass through booleans', () => {
      expect(resolveVariables(true, state)).toBe(true);
      expect(resolveVariables(false, state)).toBe(false);
    });

    it('should pass through strings without variables', () => {
      expect(resolveVariables('plain string', state)).toBe('plain string');
    });
  });
});

// ============================================================================
// TESTS: interpolateString
// ============================================================================

describe('interpolateString', () => {
  let state: ExecutionState;

  beforeEach(() => {
    state = createTestState();
  });

  it('should interpolate single variable', () => {
    const result = interpolateString('Hello {{global.userName}}', state);
    expect(result).toBe('Hello Test User');
  });

  it('should interpolate multiple variables', () => {
    const result = interpolateString(
      '{{global.userName}} ({{global.userEmail}}) - ID: {{global.userId}}',
      state
    );
    expect(result).toBe('Test User (test@example.com) - ID: user-123');
  });

  it('should return original string if no variables', () => {
    const result = interpolateString('No variables here', state);
    expect(result).toBe('No variables here');
  });

  it('should handle adjacent variables', () => {
    const result = interpolateString('{{global.userId}}{{global.workspaceId}}', state);
    expect(result).toBe('user-123workspace-456');
  });

  it('should stringify objects', () => {
    const result = interpolateString('Data: {{variables.config}}', state);
    expect(result).toBe('Data: {"maxRetries":3,"timeout":5000}');
  });

  it('should convert null to "null"', () => {
    const stateWithNull = createTestState({
      variables: { nullValue: null },
    });
    const result = interpolateString('Value: {{variables.nullValue}}', stateWithNull);
    expect(result).toBe('Value: null');
  });

  it('should convert numbers to string', () => {
    const result = interpolateString('Count: {{variables.count}}', state);
    expect(result).toBe('Count: 42');
  });
});

// ============================================================================
// TESTS: findVariableMatches
// ============================================================================

describe('findVariableMatches', () => {
  it('should find single match', () => {
    const matches = findVariableMatches('Hello {{name}}');
    expect(matches).toHaveLength(1);
    expect(matches[0].fullMatch).toBe('{{name}}');
    expect(matches[0].path).toBe('name');
  });

  it('should find multiple matches', () => {
    const matches = findVariableMatches('{{a}} and {{b}} and {{c}}');
    expect(matches).toHaveLength(3);
    expect(matches.map((m) => m.path)).toEqual(['a', 'b', 'c']);
  });

  it('should capture full path with dots', () => {
    const matches = findVariableMatches('{{trigger.payload.data.id}}');
    expect(matches).toHaveLength(1);
    expect(matches[0].path).toBe('trigger.payload.data.id');
  });

  it('should return empty array if no matches', () => {
    const matches = findVariableMatches('No variables here');
    expect(matches).toHaveLength(0);
  });

  it('should trim whitespace in path', () => {
    const matches = findVariableMatches('{{ variable.name }}');
    expect(matches).toHaveLength(1);
    expect(matches[0].path).toBe('variable.name');
  });

  it('should capture correct indices', () => {
    const str = 'prefix {{var}} suffix';
    const matches = findVariableMatches(str);
    expect(matches[0].startIndex).toBe(7);
    expect(matches[0].endIndex).toBe(14);
  });
});

// ============================================================================
// TESTS: getValueByPath
// ============================================================================

describe('getValueByPath', () => {
  const obj = {
    a: {
      b: {
        c: 'deep-value',
        d: [1, 2, 3],
      },
    },
    items: [
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ],
  };

  it('should get top-level value', () => {
    expect(getValueByPath({ name: 'test' }, 'name')).toBe('test');
  });

  it('should get nested value', () => {
    expect(getValueByPath(obj, 'a.b.c')).toBe('deep-value');
  });

  it('should get array', () => {
    expect(getValueByPath(obj, 'a.b.d')).toEqual([1, 2, 3]);
  });

  it('should return undefined for non-existent path', () => {
    expect(getValueByPath(obj, 'nonexistent.path')).toBeUndefined();
  });

  it('should return undefined for null object', () => {
    expect(getValueByPath(null, 'any.path')).toBeUndefined();
  });

  it('should return undefined for undefined object', () => {
    expect(getValueByPath(undefined, 'any.path')).toBeUndefined();
  });
});

// ============================================================================
// TESTS: createInitialState
// ============================================================================

describe('createInitialState', () => {
  it('should create state with required fields', () => {
    const state = createInitialState('user-1', 'manual', { key: 'value' });

    expect(state.global.userId).toBe('user-1');
    expect(state.trigger.type).toBe('manual');
    expect(state.trigger.payload).toEqual({ key: 'value' });
    expect(state.nodes).toEqual({});
    expect(state.variables).toEqual({});
  });

  it('should include optional fields', () => {
    const state = createInitialState('user-1', 'webhook', {}, {
      userEmail: 'test@test.com',
      userName: 'Test',
      workspaceId: 'ws-1',
      env: { KEY: 'value' },
      isTest: false,
      variables: { custom: 'var' },
    });

    expect(state.global.userEmail).toBe('test@test.com');
    expect(state.global.userName).toBe('Test');
    expect(state.global.workspaceId).toBe('ws-1');
    expect(state.global.env).toEqual({ KEY: 'value' });
    expect(state.global.isTest).toBe(false);
    expect(state.variables).toEqual({ custom: 'var' });
  });

  it('should default isTest to true', () => {
    const state = createInitialState('user-1', 'api', {});
    expect(state.global.isTest).toBe(true);
  });

  it('should set timestamps', () => {
    const before = Date.now();
    const state = createInitialState('user-1', 'manual', {});
    const after = Date.now();

    expect(state.global.timestamp).toBeGreaterThanOrEqual(before);
    expect(state.global.timestamp).toBeLessThanOrEqual(after);
    expect(state.trigger.timestamp).toBeGreaterThanOrEqual(before);
    expect(state.trigger.timestamp).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// TESTS: storeNodeOutput
// ============================================================================

describe('storeNodeOutput', () => {
  it('should store node output in state', () => {
    const state = createInitialState('user-1', 'manual', {});

    storeNodeOutput(state, 'node-1', { result: 'success' }, {
      status: 'completed',
      startedAt: 1000,
      completedAt: 2000,
    });

    expect(state.nodes['node-1']).toBeDefined();
    expect(state.nodes['node-1'].output).toEqual({ result: 'success' });
    expect(state.nodes['node-1'].meta.status).toBe('completed');
    expect(state.nodes['node-1'].meta.durationMs).toBe(1000);
  });

  it('should store error state', () => {
    const state = createInitialState('user-1', 'manual', {});

    storeNodeOutput(state, 'node-1', null, {
      status: 'error',
      startedAt: 1000,
      completedAt: 1500,
      error: 'Something went wrong',
    });

    expect(state.nodes['node-1'].meta.status).toBe('error');
    expect(state.nodes['node-1'].meta.error).toBe('Something went wrong');
  });
});

// ============================================================================
// TESTS: setVariable
// ============================================================================

describe('setVariable', () => {
  it('should set a variable in state', () => {
    const state = createInitialState('user-1', 'manual', {});

    setVariable(state, 'myVar', 'myValue');

    expect(state.variables.myVar).toBe('myValue');
  });

  it('should overwrite existing variable', () => {
    const state = createInitialState('user-1', 'manual', {}, {
      variables: { myVar: 'old' },
    });

    setVariable(state, 'myVar', 'new');

    expect(state.variables.myVar).toBe('new');
  });

  it('should handle object values', () => {
    const state = createInitialState('user-1', 'manual', {});

    setVariable(state, 'config', { a: 1, b: 2 });

    expect(state.variables.config).toEqual({ a: 1, b: 2 });
  });
});

// ============================================================================
// TESTS: findMissingVariables
// ============================================================================

describe('findMissingVariables', () => {
  let state: ExecutionState;

  beforeEach(() => {
    state = createTestState();
  });

  it('should return empty array when all variables exist', () => {
    const template = {
      userId: '{{global.userId}}',
      email: '{{global.userEmail}}',
    };

    const missing = findMissingVariables(template, state);
    expect(missing).toEqual([]);
  });

  it('should find missing variables in strings', () => {
    const template = 'Hello {{missing.var}}';

    const missing = findMissingVariables(template, state);
    expect(missing).toContain('missing.var');
  });

  it('should find missing variables in objects', () => {
    const template = {
      name: '{{global.userName}}',
      custom: '{{missing.field}}',
    };

    const missing = findMissingVariables(template, state);
    expect(missing).toContain('missing.field');
  });

  it('should find missing variables in arrays', () => {
    const template = ['{{global.userId}}', '{{missing.item}}'];

    const missing = findMissingVariables(template, state);
    expect(missing).toContain('missing.item');
  });

  it('should deduplicate missing variables', () => {
    const template = [
      '{{missing.var}}',
      '{{missing.var}}',
      '{{missing.var}}',
    ];

    const missing = findMissingVariables(template, state);
    expect(missing).toEqual(['missing.var']);
  });

  it('should find missing node references', () => {
    const template = '{{nonexistent-node.output.data}}';

    const missing = findMissingVariables(template, state);
    expect(missing).toContain('nonexistent-node.output.data');
  });
});

// ============================================================================
// TESTS: Security - isPathSafe
// ============================================================================

describe('isPathSafe (Security)', () => {
  it('should allow normal paths', () => {
    expect(isPathSafe('trigger.payload.email')).toBe(true);
    expect(isPathSafe('global.userId')).toBe(true);
    expect(isPathSafe('variables.customVar')).toBe(true);
    expect(isPathSafe('nodeId.output.data')).toBe(true);
  });

  it('should block __proto__ path', () => {
    expect(isPathSafe('__proto__.polluted')).toBe(false);
    expect(isPathSafe('trigger.__proto__.constructor')).toBe(false);
  });

  it('should block constructor path', () => {
    expect(isPathSafe('constructor.prototype')).toBe(false);
    expect(isPathSafe('trigger.constructor')).toBe(false);
  });

  it('should block prototype path', () => {
    expect(isPathSafe('prototype.constructor')).toBe(false);
  });
});

// ============================================================================
// TESTS: Edge Cases & Error Handling
// ============================================================================

describe('Edge Cases', () => {
  let state: ExecutionState;

  beforeEach(() => {
    state = createTestState();
  });

  it('should handle circular reference detection in objects', () => {
    const input = {
      a: '{{global.userId}}',
      b: { c: '{{variables.count}}' },
    };

    const result = resolveVariables(input, state);
    expect(result.a).toBe('user-123');
    expect(result.b.c).toBe(42);
  });

  it('should handle very long paths', () => {
    const longPath = 'trigger.payload.data.metadata.source';
    const result = resolveVariablePath(longPath, state);
    expect(result.found).toBe(true);
    expect(result.value).toBe('api');
  });

  it('should handle special characters in values', () => {
    const stateWithSpecial = createTestState({
      variables: {
        special: 'hello\nworld\ttab',
        unicode: '日本語',
        emoji: '🚀',
      },
    });

    expect(resolveVariables('{{variables.special}}', stateWithSpecial)).toBe('hello\nworld\ttab');
    expect(resolveVariables('{{variables.unicode}}', stateWithSpecial)).toBe('日本語');
    expect(resolveVariables('{{variables.emoji}}', stateWithSpecial)).toBe('🚀');
  });

  it('should handle empty objects and arrays in state', () => {
    const stateWithEmpty = createTestState({
      variables: {
        emptyObj: {},
        emptyArr: [],
      },
    });

    expect(resolveVariables('{{variables.emptyObj}}', stateWithEmpty)).toEqual({});
    expect(resolveVariables('{{variables.emptyArr}}', stateWithEmpty)).toEqual([]);
  });
});
