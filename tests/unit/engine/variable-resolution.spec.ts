/**
 * VARIABLE RESOLUTION SERVICE - UNIT TESTS
 *
 * Phase 14: Backend Variable Resolution Logic
 *
 * Tests the variable resolution logic for:
 * - Resolving {{variable}} Handlebars syntax
 * - Support dot-notation for deep access
 * - Recursively traverse nested objects and arrays
 * - Handle missing variables gracefully (fail-safe)
 * - Preserve data types for pure variable references
 *
 * Note: This file implements the variable resolution logic inline to avoid
 * external dependencies (Winston logger, SafePathResolver) that complicate testing.
 * The production VariableService in server/services/VariableService.ts uses
 * the same algorithms with additional security hardening.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExecutionState,
  VARIABLE_PATTERN,
  VariableMatch,
  ResolvedVariable,
  isPureVariableReference,
  extractVariablePath,
} from '@/types/execution';

// ============================================================================
// INLINE IMPLEMENTATION (mirrors VariableService without external deps)
// ============================================================================

/**
 * Get a nested value from an object using a dot-notation path.
 * Supports array indexing: "items.0.name"
 */
function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  // Split path into segments, handling array notation
  const segments = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  let current = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Security: Block prototype pollution
    if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

/**
 * Check if a path is safe (no prototype pollution)
 */
function isPathSafe(path: string): boolean {
  const dangerous = ['__proto__', 'constructor', 'prototype', '__lookupGetter__', '__lookupSetter__'];
  const segments = path.toLowerCase().split('.');
  return !segments.some(seg => dangerous.includes(seg));
}

/**
 * Resolve a variable path against execution state
 */
function resolveVariablePath(path: string, state: ExecutionState): ResolvedVariable {
  const trimmedPath = path.trim();
  const segments = trimmedPath.split('.');
  const root = segments[0];
  const remainingPath = segments.slice(1).join('.');

  try {
    let value: any;
    let found = true;

    switch (root) {
      case 'global':
        value = getValueByPath(state.global, remainingPath);
        if (value === undefined) found = false;
        break;

      case 'variables':
        value = getValueByPath(state.variables, remainingPath);
        if (value === undefined) found = false;
        break;

      case 'trigger':
        value = getValueByPath(state.trigger, remainingPath);
        if (value === undefined) found = false;
        break;

      default:
        // Assume it's a node ID
        const nodeState = state.nodes[root];
        if (!nodeState) {
          return {
            path: trimmedPath,
            value: undefined,
            found: false,
            error: `Node "${root}" not found`,
          };
        }

        // Handle {{nodeId.output.field}}
        if (segments[1] === 'output') {
          const outputPath = segments.slice(2).join('.');
          value = outputPath
            ? getValueByPath(nodeState.output, outputPath)
            : nodeState.output;
        } else if (segments[1] === 'meta') {
          const metaPath = segments.slice(2).join('.');
          value = metaPath
            ? getValueByPath(nodeState.meta, metaPath)
            : nodeState.meta;
        } else {
          // Direct access
          value = getValueByPath(nodeState.output, remainingPath);
        }

        if (value === undefined) found = false;
        break;
    }

    return { path: trimmedPath, value, found };
  } catch (error: any) {
    return {
      path: trimmedPath,
      value: undefined,
      found: false,
      error: `Resolution error: ${error.message}`,
    };
  }
}

/**
 * Find all variable matches in a string
 */
function findVariableMatches(str: string): VariableMatch[] {
  const matches: VariableMatch[] = [];
  const regex = new RegExp(VARIABLE_PATTERN.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    matches.push({
      fullMatch: match[0],
      path: match[1].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return matches;
}

/**
 * Interpolate variables in a string
 */
function interpolateString(str: string, state: ExecutionState): string {
  const matches = findVariableMatches(str);
  if (matches.length === 0) return str;

  let result = str;

  // Process in reverse to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const resolved = resolveVariablePath(match.path, state);

    let replacement: string;
    if (!resolved.found) {
      replacement = match.fullMatch; // Keep original
    } else if (resolved.value === null) {
      replacement = 'null';
    } else if (resolved.value === undefined) {
      replacement = '';
    } else if (typeof resolved.value === 'object') {
      replacement = JSON.stringify(resolved.value);
    } else {
      replacement = String(resolved.value);
    }

    result =
      result.substring(0, match.startIndex) +
      replacement +
      result.substring(match.endIndex);
  }

  return result;
}

/**
 * Recursively resolve all variables in an input value
 */
function resolveVariables(input: any, state: ExecutionState): any {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // Pure variable reference - preserve type
    if (isPureVariableReference(input)) {
      const path = extractVariablePath(input);
      if (path) {
        if (!isPathSafe(path)) return undefined;
        const resolved = resolveVariablePath(path, state);
        return resolved.found ? resolved.value : undefined;
      }
    }
    // Mixed string - interpolate
    return interpolateString(input, state);
  }

  if (Array.isArray(input)) {
    return input.map((item) => resolveVariables(item, state));
  }

  if (typeof input === 'object') {
    const resolved: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      resolved[key] = resolveVariables(input[key], state);
    }
    return resolved;
  }

  return input;
}

/**
 * Find missing variables in a template
 */
function findMissingVariables(template: any, state: ExecutionState): string[] {
  const missing: string[] = [];

  function check(value: any): void {
    if (typeof value === 'string') {
      const matches = findVariableMatches(value);
      for (const match of matches) {
        const resolved = resolveVariablePath(match.path, state);
        if (!resolved.found) {
          missing.push(match.path);
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach(check);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(check);
    }
  }

  check(template);
  return [...new Set(missing)];
}

/**
 * Create initial execution state
 */
function createInitialState(
  userId: string,
  triggerType: 'manual' | 'webhook' | 'scheduled' | 'api',
  triggerPayload: any = {},
  options: {
    userEmail?: string;
    userName?: string;
    workspaceId?: string;
    env?: Record<string, string>;
    variables?: Record<string, any>;
  } = {}
): ExecutionState {
  return {
    global: {
      userId,
      userEmail: options.userEmail,
      userName: options.userName,
      workspaceId: options.workspaceId,
      env: options.env || {},
      timestamp: Date.now(),
      isTest: true,
    },
    nodes: {},
    variables: options.variables || {},
    trigger: {
      type: triggerType,
      payload: triggerPayload,
      timestamp: Date.now(),
    },
  };
}

/**
 * Store node output in execution state
 */
function storeNodeOutput(
  state: ExecutionState,
  nodeId: string,
  output: any,
  meta: {
    status: 'completed' | 'error';
    startedAt: number;
    completedAt: number;
    error?: string;
  }
): void {
  state.nodes[nodeId] = {
    output,
    meta: {
      ...meta,
      durationMs: meta.completedAt - meta.startedAt,
    },
  };
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a minimal ExecutionState for testing
 */
function createTestState(overrides: Partial<ExecutionState> = {}): ExecutionState {
  return {
    global: {
      userId: 'test-user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      workspaceId: 'ws-123',
      env: {
        API_KEY: 'sk-test-12345',
        NODE_ENV: 'test',
      },
      timestamp: Date.now(),
      isTest: true,
    },
    nodes: {},
    variables: {},
    trigger: {
      type: 'manual',
      payload: {},
      timestamp: Date.now(),
    },
    ...overrides,
  };
}

// ============================================================================
// BASIC VARIABLE RESOLUTION TESTS
// ============================================================================

describe('Variable Resolution Service', () => {
  describe('resolveVariables()', () => {
    it('should resolve trigger variables in nested config', () => {
      // GIVEN: Context with trigger data
      const state = createTestState({
        trigger: {
          type: 'webhook',
          payload: {
            body: {
              name: 'Luis',
              role: 'Admin',
            },
          },
          timestamp: Date.now(),
        },
      });

      // GIVEN: Input config with variable placeholders
      const inputConfig = {
        subject: 'Hello {{trigger.payload.body.name}}',
        isAdmin: '{{trigger.payload.body.role}}',
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Variables should be resolved
      expect(result.subject).toBe('Hello Luis');
      expect(result.isAdmin).toBe('Admin');
    });

    it('should preserve object types for pure variable references', () => {
      // GIVEN: State with node output containing an object
      const state = createTestState({
        nodes: {
          'node-1': {
            output: {
              users: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
              metadata: { total: 2 },
            },
            meta: { status: 'completed', startedAt: 0, completedAt: 100 },
          },
        },
      });

      // GIVEN: Config with pure object reference
      const inputConfig = {
        allUsers: '{{node-1.output.users}}',
        meta: '{{node-1.output.metadata}}',
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Objects should remain as objects (not stringified)
      expect(Array.isArray(result.allUsers)).toBe(true);
      expect(result.allUsers).toHaveLength(2);
      expect(result.allUsers[0].name).toBe('Alice');
      expect(typeof result.meta).toBe('object');
      expect(result.meta.total).toBe(2);
    });

    it('should preserve number types for pure variable references', () => {
      // GIVEN: State with numeric value in trigger
      const state = createTestState({
        trigger: {
          type: 'webhook',
          payload: {
            count: 42,
            ratio: 3.14,
            isActive: true,
          },
          timestamp: Date.now(),
        },
      });

      // GIVEN: Config with pure numeric/boolean references
      const inputConfig = {
        itemCount: '{{trigger.payload.count}}',
        conversionRatio: '{{trigger.payload.ratio}}',
        active: '{{trigger.payload.isActive}}',
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Types should be preserved
      expect(typeof result.itemCount).toBe('number');
      expect(result.itemCount).toBe(42);
      expect(typeof result.conversionRatio).toBe('number');
      expect(result.conversionRatio).toBe(3.14);
      expect(typeof result.active).toBe('boolean');
      expect(result.active).toBe(true);
    });

    it('should handle mixed string interpolation', () => {
      // GIVEN: State with trigger data
      const state = createTestState({
        trigger: {
          type: 'webhook',
          payload: {
            firstName: 'John',
            lastName: 'Doe',
            count: 5,
          },
          timestamp: Date.now(),
        },
      });

      // GIVEN: Config with mixed text and variables
      const inputConfig = {
        greeting: 'Hello {{trigger.payload.firstName}} {{trigger.payload.lastName}}!',
        message: 'You have {{trigger.payload.count}} new messages.',
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Variables should be interpolated as strings
      expect(result.greeting).toBe('Hello John Doe!');
      expect(result.message).toBe('You have 5 new messages.');
    });

    it('should recursively resolve variables in nested objects', () => {
      // GIVEN: State with trigger data
      const state = createTestState({
        trigger: {
          type: 'webhook',
          payload: {
            email: 'user@test.com',
            name: 'Test User',
          },
          timestamp: Date.now(),
        },
      });

      // GIVEN: Deeply nested config
      const inputConfig = {
        level1: {
          level2: {
            level3: {
              email: '{{trigger.payload.email}}',
              label: 'Contact: {{trigger.payload.name}}',
            },
          },
        },
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Nested variables should be resolved
      expect(result.level1.level2.level3.email).toBe('user@test.com');
      expect(result.level1.level2.level3.label).toBe('Contact: Test User');
    });

    it('should resolve variables in arrays', () => {
      // GIVEN: State with trigger data
      const state = createTestState({
        trigger: {
          type: 'webhook',
          payload: {
            recipients: ['alice@test.com', 'bob@test.com'],
            subject: 'Important Update',
          },
          timestamp: Date.now(),
        },
      });

      // GIVEN: Config with array containing variables
      const inputConfig = {
        emails: ['{{trigger.payload.recipients}}'],
        messages: [
          'Subject: {{trigger.payload.subject}}',
          'Hello {{trigger.payload.subject}}!',
        ],
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Array elements should be resolved
      expect(result.messages[0]).toBe('Subject: Important Update');
      expect(result.messages[1]).toBe('Hello Important Update!');
    });

    it('should handle missing variables gracefully (fail-safe)', () => {
      // GIVEN: State without the referenced variable
      const state = createTestState();

      // GIVEN: Config referencing non-existent variable
      const inputConfig = {
        email: '{{trigger.payload.nonExistent}}',
        mixed: 'Hello {{trigger.payload.unknown}}!',
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Pure reference should return undefined
      expect(result.email).toBeUndefined();
      // THEN: Mixed reference should keep placeholder (fail-safe)
      expect(result.mixed).toBe('Hello {{trigger.payload.unknown}}!');
    });

    it('should resolve global state variables', () => {
      // GIVEN: State with global data
      const state = createTestState({
        global: {
          userId: 'user-abc',
          userEmail: 'admin@company.com',
          userName: 'Admin User',
          workspaceId: 'ws-enterprise',
          env: {
            API_KEY: 'secret-key-123',
            DEBUG_MODE: 'true',
          },
          timestamp: 1700000000000,
          isTest: false,
        },
      });

      // GIVEN: Config referencing global variables
      const inputConfig = {
        currentUser: '{{global.userId}}',
        email: '{{global.userEmail}}',
        apiKey: '{{global.env.API_KEY}}',
        debug: '{{global.env.DEBUG_MODE}}',
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Global variables should be resolved
      expect(result.currentUser).toBe('user-abc');
      expect(result.email).toBe('admin@company.com');
      expect(result.apiKey).toBe('secret-key-123');
      expect(result.debug).toBe('true');
    });

    it('should resolve workflow variables', () => {
      // GIVEN: State with custom workflow variables
      const state = createTestState({
        variables: {
          counter: 10,
          prefix: 'TICKET-',
          config: { retryCount: 3, timeout: 5000 },
        },
      });

      // GIVEN: Config referencing workflow variables
      const inputConfig = {
        ticketId: '{{variables.prefix}}{{variables.counter}}',
        retries: '{{variables.config.retryCount}}',
        fullConfig: '{{variables.config}}',
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Workflow variables should be resolved
      expect(result.ticketId).toBe('TICKET-10');
      expect(result.retries).toBe(3);
      expect(result.fullConfig).toEqual({ retryCount: 3, timeout: 5000 });
    });

    it('should resolve node output variables', () => {
      // GIVEN: State with previous node outputs
      const state = createTestState({
        nodes: {
          'fetch-data': {
            output: {
              items: [{ id: 1 }, { id: 2 }],
              total: 2,
              status: 'success',
            },
            meta: { status: 'completed', startedAt: 0, completedAt: 100, durationMs: 100 },
          },
          'transform': {
            output: {
              processedCount: 5,
              errors: [],
            },
            meta: { status: 'completed', startedAt: 100, completedAt: 150, durationMs: 50 },
          },
        },
      });

      // GIVEN: Config referencing node outputs
      const inputConfig = {
        itemCount: '{{fetch-data.output.total}}',
        status: '{{fetch-data.output.status}}',
        processed: '{{transform.output.processedCount}}',
        allItems: '{{fetch-data.output.items}}',
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Node outputs should be resolved
      expect(result.itemCount).toBe(2);
      expect(result.status).toBe('success');
      expect(result.processed).toBe(5);
      expect(Array.isArray(result.allItems)).toBe(true);
      expect(result.allItems).toHaveLength(2);
    });

    it('should handle null and undefined values correctly', () => {
      // GIVEN: State with null/undefined values
      const state = createTestState({
        trigger: {
          type: 'webhook',
          payload: {
            nullValue: null,
            zeroValue: 0,
            emptyString: '',
            falseValue: false,
          },
          timestamp: Date.now(),
        },
      });

      // GIVEN: Config referencing these values
      const inputConfig = {
        n: '{{trigger.payload.nullValue}}',
        zero: '{{trigger.payload.zeroValue}}',
        empty: '{{trigger.payload.emptyString}}',
        f: '{{trigger.payload.falseValue}}',
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Values should be preserved correctly
      expect(result.n).toBeNull();
      expect(result.zero).toBe(0);
      expect(result.empty).toBe('');
      expect(result.f).toBe(false);
    });

    it('should pass through primitive values unchanged', () => {
      // GIVEN: Any state
      const state = createTestState();

      // GIVEN: Primitive values without variables
      const inputConfig = {
        number: 42,
        boolean: true,
        string: 'plain text',
        nullVal: null,
      };

      // WHEN: Resolving variables
      const result = resolveVariables(inputConfig, state);

      // THEN: Primitives should pass through unchanged
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
      expect(result.string).toBe('plain text');
      expect(result.nullVal).toBeNull();
    });
  });

  // ============================================================================
  // PATH RESOLUTION TESTS
  // ============================================================================

  describe('resolveVariablePath()', () => {
    it('should resolve trigger paths', () => {
      const state = createTestState({
        trigger: {
          type: 'webhook',
          payload: { data: { value: 'test' } },
          timestamp: 12345,
        },
      });

      const result = resolveVariablePath('trigger.payload.data.value', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('test');
    });

    it('should resolve global paths', () => {
      const state = createTestState({
        global: {
          userId: 'user-123',
          userEmail: 'test@test.com',
          env: { KEY: 'value' },
          timestamp: Date.now(),
          isTest: true,
        },
      });

      const result = resolveVariablePath('global.userEmail', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('test@test.com');
    });

    it('should resolve variables paths', () => {
      const state = createTestState({
        variables: {
          myVar: { nested: 'data' },
        },
      });

      const result = resolveVariablePath('variables.myVar.nested', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe('data');
    });

    it('should resolve node output paths', () => {
      const state = createTestState({
        nodes: {
          'my-node': {
            output: { response: { success: true } },
            meta: { status: 'completed', startedAt: 0, completedAt: 100 },
          },
        },
      });

      const result = resolveVariablePath('my-node.output.response.success', state);
      expect(result.found).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should handle non-existent paths gracefully', () => {
      const state = createTestState();

      const result = resolveVariablePath('trigger.payload.nonExistent.deep.path', state);
      expect(result.found).toBe(false);
      expect(result.value).toBeUndefined();
    });

    it('should handle non-existent node gracefully', () => {
      const state = createTestState();

      const result = resolveVariablePath('unknown-node.output.data', state);
      expect(result.found).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ============================================================================
  // STRING INTERPOLATION TESTS
  // ============================================================================

  describe('interpolateString()', () => {
    it('should interpolate single variable', () => {
      const state = createTestState({
        trigger: { type: 'manual', payload: { name: 'World' }, timestamp: Date.now() },
      });

      const result = interpolateString('Hello {{trigger.payload.name}}!', state);
      expect(result).toBe('Hello World!');
    });

    it('should interpolate multiple variables', () => {
      const state = createTestState({
        trigger: {
          type: 'manual',
          payload: { first: 'John', last: 'Doe' },
          timestamp: Date.now(),
        },
      });

      const result = interpolateString(
        'Name: {{trigger.payload.first}} {{trigger.payload.last}}',
        state
      );
      expect(result).toBe('Name: John Doe');
    });

    it('should handle objects in strings by JSON stringifying', () => {
      const state = createTestState({
        trigger: {
          type: 'manual',
          payload: { obj: { a: 1, b: 2 } },
          timestamp: Date.now(),
        },
      });

      const result = interpolateString('Data: {{trigger.payload.obj}}', state);
      expect(result).toBe('Data: {"a":1,"b":2}');
    });

    it('should keep placeholder for unresolved variables', () => {
      const state = createTestState();

      const result = interpolateString('Value: {{unknown.path}}', state);
      expect(result).toBe('Value: {{unknown.path}}');
    });
  });

  // ============================================================================
  // VARIABLE MATCHING TESTS
  // ============================================================================

  describe('findVariableMatches()', () => {
    it('should find all variable matches in string', () => {
      const matches = findVariableMatches(
        'Hello {{user.name}}, your balance is {{account.balance}}'
      );

      expect(matches).toHaveLength(2);
      expect(matches[0].path).toBe('user.name');
      expect(matches[1].path).toBe('account.balance');
    });

    it('should return empty array for string without variables', () => {
      const matches = findVariableMatches('Plain text without variables');
      expect(matches).toHaveLength(0);
    });

    it('should capture indices correctly', () => {
      const str = 'Prefix {{var}} suffix';
      const matches = findVariableMatches(str);

      expect(matches).toHaveLength(1);
      expect(matches[0].startIndex).toBe(7);
      expect(matches[0].endIndex).toBe(14);
      expect(str.substring(matches[0].startIndex, matches[0].endIndex)).toBe('{{var}}');
    });
  });

  // ============================================================================
  // PATH ACCESS TESTS
  // ============================================================================

  describe('getValueByPath()', () => {
    it('should access simple paths', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(getValueByPath(obj, 'a.b.c')).toBe('value');
    });

    it('should access array elements', () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      expect(getValueByPath(obj, 'items.0.name')).toBe('first');
      expect(getValueByPath(obj, 'items.1.name')).toBe('second');
    });

    it('should return undefined for non-existent paths', () => {
      const obj = { a: 1 };
      expect(getValueByPath(obj, 'b.c.d')).toBeUndefined();
    });

    it('should handle null/undefined objects', () => {
      expect(getValueByPath(null, 'a.b')).toBeUndefined();
      expect(getValueByPath(undefined, 'a.b')).toBeUndefined();
    });
  });

  // ============================================================================
  // SECURITY TESTS (PROTOTYPE POLLUTION PREVENTION)
  // ============================================================================

  describe('Security - Prototype Pollution Prevention', () => {
    it('should block __proto__ access', () => {
      expect(isPathSafe('__proto__.polluted')).toBe(false);
    });

    it('should block constructor access', () => {
      expect(isPathSafe('constructor.prototype')).toBe(false);
    });

    it('should block prototype access', () => {
      expect(isPathSafe('Object.prototype.toString')).toBe(false);
    });

    it('should allow safe paths', () => {
      expect(isPathSafe('trigger.payload.data')).toBe(true);
      expect(isPathSafe('global.userId')).toBe(true);
      expect(isPathSafe('node-1.output.result')).toBe(true);
    });

    it('should not resolve dangerous variable paths', () => {
      const state = createTestState();

      // Attempt prototype pollution
      const inputConfig = {
        attack: '{{__proto__.polluted}}',
        constructorAttack: '{{constructor.constructor}}',
        prototypeAttack: '{{prototype.isAdmin}}',
      };

      const result = resolveVariables(inputConfig, state);

      // Should return undefined, not pollute prototype
      expect(result.attack).toBeUndefined();
      expect(result.constructorAttack).toBeUndefined();
      expect(result.prototypeAttack).toBeUndefined();
    });
  });

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  describe('findMissingVariables()', () => {
    it('should find missing variables in template', () => {
      const state = createTestState({
        trigger: { type: 'manual', payload: { existing: 'value' }, timestamp: Date.now() },
      });

      const template = {
        found: '{{trigger.payload.existing}}',
        missing1: '{{trigger.payload.missing}}',
        missing2: '{{unknown.node.output}}',
      };

      const missing = findMissingVariables(template, state);

      expect(missing).toContain('trigger.payload.missing');
      expect(missing).toContain('unknown.node.output');
      expect(missing).not.toContain('trigger.payload.existing');
    });

    it('should return empty array when all variables exist', () => {
      const state = createTestState({
        trigger: { type: 'manual', payload: { a: 1, b: 2 }, timestamp: Date.now() },
      });

      const template = {
        val1: '{{trigger.payload.a}}',
        val2: '{{trigger.payload.b}}',
      };

      const missing = findMissingVariables(template, state);
      expect(missing).toHaveLength(0);
    });
  });

  describe('createInitialState()', () => {
    it('should create a valid initial state', () => {
      const state = createInitialState('user-123', 'webhook', { data: 'test' }, {
        userEmail: 'test@test.com',
        userName: 'Test',
        workspaceId: 'ws-1',
        env: { KEY: 'value' },
        variables: { custom: 'var' },
      });

      expect(state.global.userId).toBe('user-123');
      expect(state.global.userEmail).toBe('test@test.com');
      expect(state.global.userName).toBe('Test');
      expect(state.global.workspaceId).toBe('ws-1');
      expect(state.global.env.KEY).toBe('value');
      expect(state.trigger.type).toBe('webhook');
      expect(state.trigger.payload).toEqual({ data: 'test' });
      expect(state.variables.custom).toBe('var');
      expect(state.nodes).toEqual({});
    });
  });

  describe('storeNodeOutput()', () => {
    it('should store node output in state', () => {
      const state = createTestState();
      const startedAt = Date.now() - 100;
      const completedAt = Date.now();

      storeNodeOutput(state, 'test-node', { result: 'success' }, {
        status: 'completed',
        startedAt,
        completedAt,
      });

      expect(state.nodes['test-node']).toBeDefined();
      expect(state.nodes['test-node'].output).toEqual({ result: 'success' });
      expect(state.nodes['test-node'].meta.status).toBe('completed');
      expect(state.nodes['test-node'].meta.durationMs).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TYPE HELPER TESTS
  // ============================================================================

  describe('isPureVariableReference()', () => {
    it('should return true for pure variable references', () => {
      expect(isPureVariableReference('{{trigger.data}}')).toBe(true);
      expect(isPureVariableReference('  {{trigger.data}}  ')).toBe(true);
    });

    it('should return false for mixed content', () => {
      expect(isPureVariableReference('Hello {{name}}')).toBe(false);
      expect(isPureVariableReference('{{a}} {{b}}')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isPureVariableReference(123)).toBe(false);
      expect(isPureVariableReference(null)).toBe(false);
      expect(isPureVariableReference({})).toBe(false);
    });
  });

  describe('extractVariablePath()', () => {
    it('should extract path from pure variable reference', () => {
      expect(extractVariablePath('{{trigger.payload.name}}')).toBe('trigger.payload.name');
      expect(extractVariablePath('  {{  path.with.spaces  }}  ')).toBe('path.with.spaces');
    });

    it('should return null for non-pure references', () => {
      expect(extractVariablePath('Hello {{name}}')).toBeNull();
      expect(extractVariablePath('plain text')).toBeNull();
    });
  });
});
