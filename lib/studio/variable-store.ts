/**
 * VARIABLE STORE
 *
 * Central storage and resolution engine for workflow variables
 * Foundation of the Flowent AI Intelligence Layer
 */

import {
  Variable,
  VariableSource,
  // VariableType is used in JSDoc comments
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type VariableType,
  WorkflowContext,
  ResolvedVariable,
  Transform
} from './variable-types';

export class VariableStore {
  private variables: Map<string, Variable> = new Map();
  private context: WorkflowContext;

  constructor(initialContext?: Partial<WorkflowContext>) {
    this.context = {
      input: {},
      steps: {},
      env: {},
      system: {
        timestamp: Date.now(),
        userId: 'default-user',
        workflowId: '',
        executionId: `exec_${Date.now()}`
      },
      variables: {},
      ...initialContext
    };
  }

  /**
   * Register a new variable
   */
  register(variable: Variable): void {
    console.log(`[VariableStore] Registering variable: ${variable.name}`);
    this.variables.set(variable.name, variable);
  }

  /**
   * Register multiple variables
   */
  registerMany(variables: Variable[]): void {
    variables.forEach(v => this.register(v));
  }

  /**
   * Get variable definition
   */
  get(name: string): Variable | undefined {
    return this.variables.get(name);
  }

  /**
   * Get all registered variables
   */
  getAll(): Variable[] {
    return Array.from(this.variables.values());
  }

  /**
   * Update workflow context
   */
  updateContext(updates: Partial<WorkflowContext>): void {
    this.context = {
      ...this.context,
      ...updates
    };
    console.log('[VariableStore] Context updated:', Object.keys(updates));
  }

  /**
   * Resolve a variable to its actual value
   */
  resolve(variableName: string): ResolvedVariable {
    const variable = this.variables.get(variableName);

    if (!variable) {
      return {
        name: variableName,
        value: undefined,
        type: 'any',
        source: { type: 'constant', value: undefined },
        resolvedAt: Date.now(),
        error: `Variable "${variableName}" not found`
      };
    }

    try {
      // Get raw value from source
      let value = this.getValueFromSource(variable.source);

      // Apply transformations
      if (variable.transform && variable.transform.length > 0) {
        value = this.applyTransforms(value, variable.transform);
      }

      // Use default value if undefined
      if (value === undefined && variable.defaultValue !== undefined) {
        value = variable.defaultValue;
      }

      // Validate if required
      if (variable.required && (value === undefined || value === null)) {
        throw new Error(`Required variable "${variableName}" has no value`);
      }

      // Store resolved value in context
      this.context.variables[variableName] = value;

      return {
        name: variableName,
        value,
        type: variable.type,
        source: variable.source,
        resolvedAt: Date.now()
      };
    } catch (error) {
      console.error(`[VariableStore] Error resolving variable ${variableName}:`, error);
      return {
        name: variableName,
        value: variable.defaultValue,
        type: variable.type,
        source: variable.source,
        resolvedAt: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Resolve multiple variables
   */
  resolveMany(variableNames: string[]): Record<string, ResolvedVariable> {
    const resolved: Record<string, ResolvedVariable> = {};
    variableNames.forEach(name => {
      resolved[name] = this.resolve(name);
    });
    return resolved;
  }

  /**
   * Get value from variable source
   */
  private getValueFromSource(source: VariableSource): any {
    switch (source.type) {
      case 'input':
        return this.getNestedValue(this.context.input, source.path);

      case 'step':
        const stepOutput = this.context.steps[source.stepId];
        return stepOutput ? this.getNestedValue(stepOutput, source.path) : undefined;

      case 'env':
        return this.context.env[source.key] || process.env[source.key];

      case 'constant':
        return source.value;

      case 'system':
        return this.context.system[source.key];

      default:
        return undefined;
    }
  }

  /**
   * Get nested value from object using dot notation
   * Example: "customer.address.city" → obj.customer.address.city
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) return obj;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Apply transformations to a value
   */
  private applyTransforms(value: any, transforms: Transform[]): any {
    let result = value;

    for (const transform of transforms) {
      result = this.applyTransform(result, transform);
    }

    return result;
  }

  /**
   * Apply a single transformation
   */
  private applyTransform(value: any, transform: Transform): any {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    switch (transform.type) {
      case 'uppercase':
        return String(value).toUpperCase();

      case 'lowercase':
        return String(value).toLowerCase();

      case 'capitalize':
        const str = String(value);
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

      case 'trim':
        return String(value).trim();

      case 'truncate':
        const maxLength = transform.params?.[0] || 100;
        const suffix = transform.params?.[1] || '...';
        const text = String(value);
        return text.length > maxLength
          ? text.substring(0, maxLength) + suffix
          : text;

      case 'replace':
        const searchValue = transform.params?.[0] || '';
        const replaceValue = transform.params?.[1] || '';
        return String(value).replace(new RegExp(searchValue, 'g'), replaceValue);

      case 'split':
        const delimiter = transform.params?.[0] || ',';
        return String(value).split(delimiter);

      case 'join':
        const separator = transform.params?.[0] || ', ';
        return Array.isArray(value) ? value.join(separator) : String(value);

      case 'parseJSON':
        try {
          return JSON.parse(String(value));
        } catch {
          return value;
        }

      case 'stringify':
        return JSON.stringify(value);

      case 'format':
        // Custom format function (future implementation)
        return value;

      default:
        console.warn(`[VariableStore] Unknown transform type: ${transform.type}`);
        return value;
    }
  }

  /**
   * Clear all variables
   */
  clear(): void {
    this.variables.clear();
    console.log('[VariableStore] All variables cleared');
  }

  /**
   * Export current state
   */
  export(): { variables: Variable[]; context: WorkflowContext } {
    return {
      variables: this.getAll(),
      context: this.context
    };
  }

  /**
   * Import state
   */
  import(data: { variables: Variable[]; context: Partial<WorkflowContext> }): void {
    this.clear();
    this.registerMany(data.variables);
    this.updateContext(data.context);
    console.log('[VariableStore] Imported', data.variables.length, 'variables');
  }
}
