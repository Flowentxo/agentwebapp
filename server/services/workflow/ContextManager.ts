/**
 * ContextManager
 *
 * Manages execution context and variable resolution for pipelines
 * Handles {{variable}} syntax parsing and value injection
 * Part of Phase 3: Context & Logic
 */

// =============================================================================
// TYPES
// =============================================================================

export interface VariableContext {
  // Trigger inputs
  inputs: Record<string, unknown>;

  // Step results (nodeId -> result)
  steps: Record<string, unknown>;

  // Custom variables set during execution
  variables: Record<string, unknown>;

  // Environment variables (safe subset)
  env: Record<string, string>;

  // Execution metadata
  execution: {
    id: string;
    pipelineId: string;
    startedAt: string;
    currentNodeId: string;
    triggerType: string;
  };
}

export interface ResolvedVariable {
  path: string;
  value: unknown;
  found: boolean;
}

// =============================================================================
// CONTEXT MANAGER CLASS
// =============================================================================

export class ContextManager {
  private context: VariableContext;

  constructor(initialContext?: Partial<VariableContext>) {
    this.context = {
      inputs: initialContext?.inputs || {},
      steps: initialContext?.steps || {},
      variables: initialContext?.variables || {},
      env: this.getSafeEnv(),
      execution: initialContext?.execution || {
        id: '',
        pipelineId: '',
        startedAt: new Date().toISOString(),
        currentNodeId: '',
        triggerType: 'manual',
      },
    };
  }

  // ===========================================================================
  // CONTEXT MANAGEMENT
  // ===========================================================================

  /**
   * Get the full context
   */
  getContext(): VariableContext {
    return this.context;
  }

  /**
   * Update execution metadata
   */
  setExecutionMetadata(metadata: Partial<VariableContext['execution']>): void {
    this.context.execution = { ...this.context.execution, ...metadata };
  }

  /**
   * Set a step result
   */
  setStepResult(nodeId: string, result: unknown): void {
    this.context.steps[nodeId] = result;
  }

  /**
   * Get a step result
   */
  getStepResult(nodeId: string): unknown {
    return this.context.steps[nodeId];
  }

  /**
   * Set a custom variable
   */
  setVariable(name: string, value: unknown): void {
    this.context.variables[name] = value;
  }

  /**
   * Get a custom variable
   */
  getVariable(name: string): unknown {
    return this.context.variables[name];
  }

  /**
   * Set inputs (from trigger)
   */
  setInputs(inputs: Record<string, unknown>): void {
    this.context.inputs = { ...this.context.inputs, ...inputs };
  }

  // ===========================================================================
  // VARIABLE RESOLUTION
  // ===========================================================================

  /**
   * Resolve all {{variables}} in a string
   * Supports nested paths like {{steps.node_1.output.data.value}}
   */
  resolveString(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // Match {{path.to.variable}} patterns
    const variablePattern = /\{\{([^}]+)\}\}/g;

    return text.replace(variablePattern, (match, path) => {
      const resolved = this.resolvePath(path.trim());

      if (!resolved.found) {
        console.warn(`[ContextManager] Variable not found: ${path}`);
        return match; // Keep original if not found
      }

      // Convert to string representation
      if (resolved.value === null) return 'null';
      if (resolved.value === undefined) return 'undefined';
      if (typeof resolved.value === 'object') {
        return JSON.stringify(resolved.value);
      }
      return String(resolved.value);
    });
  }

  /**
   * Resolve variables in an object (deep)
   */
  resolveObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.resolveString(obj) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveObject(item)) as T;
    }

    if (typeof obj === 'object') {
      const resolved: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObject(value);
      }
      return resolved as T;
    }

    return obj;
  }

  /**
   * Resolve a dot-notation path to a value
   */
  resolvePath(path: string): ResolvedVariable {
    const parts = path.split('.');
    const rootKey = parts[0];

    // Determine which context to look in
    let current: unknown;

    switch (rootKey) {
      case 'inputs':
        current = this.context.inputs;
        parts.shift(); // Remove 'inputs' prefix
        break;

      case 'steps':
        current = this.context.steps;
        parts.shift(); // Remove 'steps' prefix
        break;

      case 'variables':
      case 'vars':
        current = this.context.variables;
        parts.shift();
        break;

      case 'env':
        current = this.context.env;
        parts.shift();
        break;

      case 'execution':
      case 'exec':
        current = this.context.execution;
        parts.shift();
        break;

      default:
        // Try steps first (for backwards compatibility: {{node_1.output}})
        if (this.context.steps[rootKey] !== undefined) {
          current = this.context.steps;
        } else if (this.context.inputs[rootKey] !== undefined) {
          current = this.context.inputs;
        } else if (this.context.variables[rootKey] !== undefined) {
          current = this.context.variables;
        } else {
          // Not found
          return { path, value: undefined, found: false };
        }
    }

    // Navigate the path
    for (const part of parts) {
      if (current === null || current === undefined) {
        return { path, value: undefined, found: false };
      }

      if (typeof current !== 'object') {
        return { path, value: undefined, found: false };
      }

      current = (current as Record<string, unknown>)[part];
    }

    return { path, value: current, found: true };
  }

  /**
   * Check if a path exists in context
   */
  hasPath(path: string): boolean {
    return this.resolvePath(path).found;
  }

  // ===========================================================================
  // EXPRESSION EVALUATION
  // ===========================================================================

  /**
   * Evaluate a JavaScript expression with context
   * Used for condition nodes
   */
  evaluateExpression(expression: string): unknown {
    // First resolve any {{variables}} in the expression
    const resolvedExpression = this.resolveString(expression);

    try {
      // Create a safe evaluation context
      const evalContext = {
        inputs: this.context.inputs,
        steps: this.context.steps,
        variables: this.context.variables,
        vars: this.context.variables,
        env: this.context.env,
        execution: this.context.execution,
        exec: this.context.execution,

        // Helper functions
        parseInt: parseInt,
        parseFloat: parseFloat,
        JSON: JSON,
        Math: Math,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Array: Array,
        Object: Object,
        Date: Date,

        // Utility functions
        isEmpty: (val: unknown) =>
          val === null ||
          val === undefined ||
          val === '' ||
          (Array.isArray(val) && val.length === 0) ||
          (typeof val === 'object' && Object.keys(val as object).length === 0),

        isNotEmpty: (val: unknown) =>
          val !== null &&
          val !== undefined &&
          val !== '' &&
          !(Array.isArray(val) && val.length === 0) &&
          !(typeof val === 'object' && Object.keys(val as object).length === 0),

        contains: (arr: unknown[], val: unknown) =>
          Array.isArray(arr) && arr.includes(val),

        length: (val: unknown) => {
          if (typeof val === 'string') return val.length;
          if (Array.isArray(val)) return val.length;
          if (typeof val === 'object' && val !== null) return Object.keys(val).length;
          return 0;
        },

        get: (obj: unknown, path: string, defaultVal?: unknown) => {
          const result = this.resolvePath(path);
          return result.found ? result.value : defaultVal;
        },
      };

      // Use Function constructor for safer evaluation than eval()
      const evalFn = new Function(
        ...Object.keys(evalContext),
        `"use strict"; return (${resolvedExpression});`
      );

      return evalFn(...Object.values(evalContext));
    } catch (error) {
      console.error('[ContextManager] Expression evaluation failed:', error);
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }

  /**
   * Evaluate a condition and return boolean
   */
  evaluateCondition(condition: string): boolean {
    const result = this.evaluateExpression(condition);
    return Boolean(result);
  }

  // ===========================================================================
  // TRANSFORM EVALUATION
  // ===========================================================================

  /**
   * Evaluate a transform expression
   * Returns the transformed value
   */
  evaluateTransform(transform: string, input: unknown): unknown {
    // Add input to context temporarily
    const originalInput = this.context.variables._input;
    this.context.variables._input = input;

    try {
      const result = this.evaluateExpression(transform);
      return result;
    } finally {
      // Restore original
      if (originalInput === undefined) {
        delete this.context.variables._input;
      } else {
        this.context.variables._input = originalInput;
      }
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Get a safe subset of environment variables
   */
  private getSafeEnv(): Record<string, string> {
    const safeKeys = [
      'NODE_ENV',
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_APP_NAME',
    ];

    const env: Record<string, string> = {};
    for (const key of safeKeys) {
      if (process.env[key]) {
        env[key] = process.env[key]!;
      }
    }
    return env;
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  /**
   * Serialize context for storage/transmission
   */
  toJSON(): VariableContext {
    return JSON.parse(JSON.stringify(this.context));
  }

  /**
   * Create from serialized context
   */
  static fromJSON(json: VariableContext): ContextManager {
    return new ContextManager(json);
  }
}

// =============================================================================
// STANDALONE HELPER FUNCTIONS
// =============================================================================

/**
 * Quick resolve of a template string
 */
export function resolveTemplate(
  template: string,
  context: Partial<VariableContext>
): string {
  const manager = new ContextManager(context);
  return manager.resolveString(template);
}

/**
 * Quick evaluation of a condition
 */
export function evaluateCondition(
  condition: string,
  context: Partial<VariableContext>
): boolean {
  const manager = new ContextManager(context);
  return manager.evaluateCondition(condition);
}

/**
 * Parse variable references from a string
 * Returns array of variable paths found
 */
export function parseVariableReferences(text: string): string[] {
  const variablePattern = /\{\{([^}]+)\}\}/g;
  const references: string[] = [];
  let match;

  while ((match = variablePattern.exec(text)) !== null) {
    references.push(match[1].trim());
  }

  return references;
}
