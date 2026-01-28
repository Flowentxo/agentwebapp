/**
 * Variable Resolver for Workflow Pipelines
 *
 * Resolves {{nodeId.path.to.value}} placeholders in node configurations
 * by looking up values from previous node outputs in the execution context.
 */

import { ExecutionContext, NodeOutput } from './types';

// ============================================
// TYPES
// ============================================

interface ResolveOptions {
  /** If true, throws an error when a variable cannot be resolved */
  strict?: boolean;
  /** Default value to use when a variable cannot be resolved (only used if strict=false) */
  defaultValue?: unknown;
}

// ============================================
// VARIABLE PATTERN
// ============================================

// Matches {{nodeId.path.to.value}} or {{nodeId}}
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

// ============================================
// PATH ACCESSOR (like lodash.get)
// ============================================

/**
 * Safely access a nested property using a dot-separated path
 * @example getByPath({ a: { b: { c: 1 } } }, 'a.b.c') => 1
 */
function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === 'object') {
      // Handle array access like "items.0.name"
      if (Array.isArray(current) && /^\d+$/.test(part)) {
        current = current[parseInt(part, 10)];
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    } else {
      return undefined;
    }
  }

  return current;
}

// ============================================
// VARIABLE RESOLVER CLASS
// ============================================

export class VariableResolver {
  private context: ExecutionContext;
  private options: ResolveOptions;

  constructor(context: ExecutionContext, options: ResolveOptions = {}) {
    this.context = context;
    this.options = {
      strict: false,
      defaultValue: undefined,
      ...options,
    };
  }

  /**
   * Resolve all variables in a configuration object
   * Recursively traverses the object and replaces {{}} placeholders
   */
  resolve<T>(config: T): T {
    return this.resolveValue(config) as T;
  }

  /**
   * Resolve a single value (can be string, object, array, or primitive)
   */
  private resolveValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle strings with potential variable references
    if (typeof value === 'string') {
      return this.resolveString(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.resolveValue(item));
    }

    // Handle objects
    if (typeof value === 'object') {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveValue(val);
      }
      return resolved;
    }

    // Primitives (numbers, booleans) pass through
    return value;
  }

  /**
   * Resolve variables in a string
   * If the entire string is a single variable, return the raw value (not stringified)
   */
  private resolveString(str: string): unknown {
    // Check if the entire string is a single variable reference
    const trimmed = str.trim();
    const singleVarMatch = trimmed.match(/^\{\{([^}]+)\}\}$/);

    if (singleVarMatch) {
      // Return the raw value (could be object, array, etc.)
      const reference = singleVarMatch[1];
      return this.lookupVariable(reference);
    }

    // Otherwise, replace all variables inline (stringify objects)
    return str.replace(VARIABLE_PATTERN, (match, reference) => {
      const value = this.lookupVariable(reference);

      if (value === undefined) {
        return this.options.strict ? match : '';
      }

      // Stringify objects/arrays for inline replacement
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  /**
   * Look up a variable reference in the execution context
   * @param reference - Format: "nodeId" or "nodeId.path.to.value"
   */
  private lookupVariable(reference: string): unknown {
    const parts = reference.split('.');
    const nodeId = parts[0];
    const path = parts.slice(1).join('.');

    // Special case: "trigger" refers to triggerData
    if (nodeId === 'trigger') {
      const triggerData = this.context.triggerData;
      return path ? getByPath(triggerData, path) : triggerData;
    }

    // Special case: "variables" refers to workflow variables
    if (nodeId === 'variables') {
      return path ? getByPath(this.context.variables, path) : this.context.variables;
    }

    // Look up node output
    const nodeOutput = this.context.nodeOutputs[nodeId];

    if (!nodeOutput) {
      if (this.options.strict) {
        throw new Error(`Variable reference error: Node "${nodeId}" not found in context`);
      }
      console.warn(`[VariableResolver] Node "${nodeId}" not found in context`);
      return this.options.defaultValue;
    }

    if (!nodeOutput.success) {
      if (this.options.strict) {
        throw new Error(`Variable reference error: Node "${nodeId}" did not execute successfully`);
      }
      console.warn(`[VariableResolver] Node "${nodeId}" failed, cannot access its output`);
      return this.options.defaultValue;
    }

    // Get the data from the node output
    const data = nodeOutput.data;

    // If no path specified, return the entire data object
    if (!path) {
      return data;
    }

    // Navigate to the specific path
    const value = getByPath(data, path);

    if (value === undefined && this.options.strict) {
      throw new Error(`Variable reference error: Path "${path}" not found in node "${nodeId}" output`);
    }

    return value;
  }
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

/**
 * Resolve all variables in a configuration object
 *
 * @example
 * const config = {
 *   prompt: "Analyze this: {{webhook-1.body.message}}",
 *   data: "{{data-transform-1.result}}"
 * };
 * const resolved = resolveVariables(config, context);
 */
export function resolveVariables<T>(
  config: T,
  context: ExecutionContext,
  options?: ResolveOptions
): T {
  const resolver = new VariableResolver(context, options);
  return resolver.resolve(config);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a string contains variable references
 */
export function hasVariables(value: string): boolean {
  return VARIABLE_PATTERN.test(value);
}

/**
 * Extract all variable references from a string
 * @returns Array of references like ["webhook-1.body", "agent-2.response"]
 */
export function extractVariables(value: string): string[] {
  const matches = value.matchAll(VARIABLE_PATTERN);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Get list of node IDs referenced in a config object
 */
export function getReferencedNodeIds(config: unknown): string[] {
  const nodeIds = new Set<string>();

  function traverse(value: unknown) {
    if (typeof value === 'string') {
      const refs = extractVariables(value);
      refs.forEach((ref) => {
        const nodeId = ref.split('.')[0];
        if (nodeId !== 'trigger' && nodeId !== 'variables') {
          nodeIds.add(nodeId);
        }
      });
    } else if (Array.isArray(value)) {
      value.forEach(traverse);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(traverse);
    }
  }

  traverse(config);
  return Array.from(nodeIds);
}

export default VariableResolver;
