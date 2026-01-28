/**
 * SetExecutor
 *
 * Phase 3: Power Features - Low-Code Field Transformation
 *
 * A high-performance node for reshaping JSON without writing code.
 * Supports keeping specific fields, removing fields, and deep-setting
 * values using dot-notation (e.g., "address.zipCode").
 *
 * Operations:
 * - set: Set a field to a value (supports dot-notation for nested fields)
 * - keep: Keep only specified fields
 * - remove: Remove specified fields
 * - rename: Rename fields
 * - move: Move fields to different locations
 * - copy: Copy field values to new locations
 * - convert: Convert field types (string to number, etc.)
 *
 * Examples:
 * - Set: { field: "status", value: "active" }
 * - Keep: { fields: ["id", "name", "email"] }
 * - Remove: { fields: ["password", "internalId"] }
 * - Rename: { from: "user_name", to: "userName" }
 * - Deep Set: { field: "address.city", value: "{{$json.location}}" }
 */

import { createLogger } from '@/lib/logger';
import { INodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '@/types/execution';
import { WorkflowItem, ItemHelper } from '@/lib/studio/item-helper';
import { VariableService } from '../VariableService';

const logger = createLogger('set-executor');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Operation types for Set node
 */
export type SetOperation =
  | 'set'
  | 'keep'
  | 'remove'
  | 'rename'
  | 'move'
  | 'copy'
  | 'convert'
  | 'setIf';

/**
 * Field assignment for set operation
 */
export interface FieldAssignment {
  /** Target field path (supports dot-notation) */
  field: string;

  /** Value to set (can include {{variable}} references) */
  value: unknown;

  /** Optional mode for handling existing values */
  mode?: 'overwrite' | 'skipIfExists' | 'appendIfArray';
}

/**
 * Field keep configuration
 */
export interface KeepConfig {
  /** Fields to keep (supports dot-notation) */
  fields: string[];

  /** Whether to keep nested structure */
  preserveStructure?: boolean;
}

/**
 * Field remove configuration
 */
export interface RemoveConfig {
  /** Fields to remove (supports dot-notation) */
  fields: string[];
}

/**
 * Field rename configuration
 */
export interface RenameConfig {
  /** Original field name */
  from: string;

  /** New field name */
  to: string;
}

/**
 * Field move configuration
 */
export interface MoveConfig {
  /** Source field path */
  from: string;

  /** Destination field path */
  to: string;
}

/**
 * Field copy configuration
 */
export interface CopyConfig {
  /** Source field path */
  from: string;

  /** Destination field path */
  to: string;
}

/**
 * Field type conversion
 */
export interface ConvertConfig {
  /** Field to convert */
  field: string;

  /** Target type */
  toType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'json';

  /** Options for conversion */
  options?: {
    dateFormat?: string;
    numberFormat?: 'integer' | 'float';
    defaultValue?: unknown;
  };
}

/**
 * Conditional set operation
 */
export interface SetIfConfig {
  /** Field to set */
  field: string;

  /** Value if condition is true */
  valueIfTrue: unknown;

  /** Value if condition is false */
  valueIfFalse?: unknown;

  /** Condition expression */
  condition: string;
}

/**
 * Set node configuration
 */
export interface SetNodeConfig {
  /** Operations to perform */
  operations: Array<{
    type: SetOperation;
    config: FieldAssignment | KeepConfig | RemoveConfig | RenameConfig |
            MoveConfig | CopyConfig | ConvertConfig | SetIfConfig | FieldAssignment[];
  }>;

  /** Include all input fields by default */
  includeAllFields?: boolean;

  /** Run in batch mode (same transformation for all items) */
  batchMode?: boolean;
}

// ============================================================================
// SET EXECUTOR
// ============================================================================

export class SetExecutor implements INodeExecutor {
  /**
   * Execute the Set node
   */
  async execute(input: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const { node, context, inputs } = input;
    const startTime = Date.now();

    // Get configuration
    const config = this.parseConfig(node.data);

    // Get input items
    const inputItems = this.normalizeInputItems(inputs);

    if (inputItems.length === 0) {
      return {
        data: { items: [] },
        success: true,
        meta: { durationMs: Date.now() - startTime, itemCount: 0 },
      };
    }

    try {
      // Process each item
      const resultItems: WorkflowItem[] = [];

      for (let i = 0; i < inputItems.length; i++) {
        const item = inputItems[i];
        let json = config.includeAllFields !== false ? { ...item.json } : {};

        // Apply each operation
        for (const operation of config.operations) {
          json = this.applyOperation(json, operation, item, inputItems, i, context);
        }

        resultItems.push({ json, pairedItem: { item: i } });
      }

      logger.debug('Set execution completed', {
        nodeId: node.id,
        itemsIn: inputItems.length,
        itemsOut: resultItems.length,
        operationsCount: config.operations.length,
      });

      return {
        data: { items: resultItems },
        success: true,
        meta: {
          durationMs: Date.now() - startTime,
          itemCount: resultItems.length,
        },
      };

    } catch (error: any) {
      logger.error('Set executor error', {
        nodeId: node.id,
        error: error.message,
      });

      return {
        data: null,
        success: false,
        error: error.message,
        meta: { durationMs: Date.now() - startTime },
      };
    }
  }

  /**
   * Parse node configuration
   */
  private parseConfig(data: any): SetNodeConfig {
    // Handle simple field assignments (legacy format)
    if (data?.fields && Array.isArray(data.fields)) {
      return {
        operations: [{
          type: 'set',
          config: data.fields.map((f: any) => ({
            field: f.name || f.field,
            value: f.value,
            mode: f.mode,
          })),
        }],
        includeAllFields: data.includeAllFields !== false,
      };
    }

    // Handle new operations format
    if (data?.operations && Array.isArray(data.operations)) {
      return {
        operations: data.operations,
        includeAllFields: data.includeAllFields !== false,
        batchMode: data.batchMode,
      };
    }

    // Handle single operation shortcuts
    if (data?.set) {
      return {
        operations: [{
          type: 'set',
          config: Array.isArray(data.set) ? data.set : [data.set],
        }],
        includeAllFields: data.includeAllFields !== false,
      };
    }

    if (data?.keep) {
      return {
        operations: [{
          type: 'keep',
          config: { fields: Array.isArray(data.keep) ? data.keep : [data.keep] },
        }],
        includeAllFields: false,
      };
    }

    if (data?.remove) {
      return {
        operations: [{
          type: 'remove',
          config: { fields: Array.isArray(data.remove) ? data.remove : [data.remove] },
        }],
        includeAllFields: true,
      };
    }

    // Default empty config
    return {
      operations: [],
      includeAllFields: true,
    };
  }

  /**
   * Apply a single operation to the JSON object
   */
  private applyOperation(
    json: Record<string, unknown>,
    operation: SetNodeConfig['operations'][0],
    currentItem: WorkflowItem,
    allItems: WorkflowItem[],
    itemIndex: number,
    context: any
  ): Record<string, unknown> {
    switch (operation.type) {
      case 'set':
        return this.applySet(json, operation.config as FieldAssignment[], currentItem, context);

      case 'keep':
        return this.applyKeep(json, operation.config as KeepConfig);

      case 'remove':
        return this.applyRemove(json, operation.config as RemoveConfig);

      case 'rename':
        return this.applyRename(json, operation.config as RenameConfig);

      case 'move':
        return this.applyMove(json, operation.config as MoveConfig);

      case 'copy':
        return this.applyCopy(json, operation.config as CopyConfig);

      case 'convert':
        return this.applyConvert(json, operation.config as ConvertConfig);

      case 'setIf':
        return this.applySetIf(json, operation.config as SetIfConfig, currentItem, context);

      default:
        logger.warn(`Unknown operation type: ${operation.type}`);
        return json;
    }
  }

  /**
   * Apply set operation
   */
  private applySet(
    json: Record<string, unknown>,
    assignments: FieldAssignment[],
    currentItem: WorkflowItem,
    context: any
  ): Record<string, unknown> {
    const result = { ...json };

    for (const assignment of assignments) {
      // Resolve value if it contains variable references
      let value = assignment.value;
      if (typeof value === 'string' && value.includes('{{')) {
        value = this.resolveVariables(value, currentItem, context);
      }

      // Handle mode
      if (assignment.mode === 'skipIfExists') {
        const existing = this.getValueByPath(result, assignment.field);
        if (existing !== undefined) {
          continue;
        }
      }

      if (assignment.mode === 'appendIfArray') {
        const existing = this.getValueByPath(result, assignment.field);
        if (Array.isArray(existing)) {
          this.setValueByPath(result, assignment.field, [...existing, value]);
          continue;
        }
      }

      // Set the value
      this.setValueByPath(result, assignment.field, value);
    }

    return result;
  }

  /**
   * Apply keep operation
   */
  private applyKeep(
    json: Record<string, unknown>,
    config: KeepConfig
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const fieldPath of config.fields) {
      const value = this.getValueByPath(json, fieldPath);
      if (value !== undefined) {
        if (config.preserveStructure) {
          this.setValueByPath(result, fieldPath, value);
        } else {
          // Flatten to top level
          const lastPart = fieldPath.split('.').pop()!;
          result[lastPart] = value;
        }
      }
    }

    return result;
  }

  /**
   * Apply remove operation
   */
  private applyRemove(
    json: Record<string, unknown>,
    config: RemoveConfig
  ): Record<string, unknown> {
    const result = this.deepClone(json);

    for (const fieldPath of config.fields) {
      this.deleteByPath(result, fieldPath);
    }

    return result;
  }

  /**
   * Apply rename operation
   */
  private applyRename(
    json: Record<string, unknown>,
    config: RenameConfig
  ): Record<string, unknown> {
    const result = this.deepClone(json);
    const value = this.getValueByPath(result, config.from);

    if (value !== undefined) {
      this.setValueByPath(result, config.to, value);
      this.deleteByPath(result, config.from);
    }

    return result;
  }

  /**
   * Apply move operation (same as rename but more explicit)
   */
  private applyMove(
    json: Record<string, unknown>,
    config: MoveConfig
  ): Record<string, unknown> {
    return this.applyRename(json, { from: config.from, to: config.to });
  }

  /**
   * Apply copy operation
   */
  private applyCopy(
    json: Record<string, unknown>,
    config: CopyConfig
  ): Record<string, unknown> {
    const result = { ...json };
    const value = this.getValueByPath(result, config.from);

    if (value !== undefined) {
      // Deep clone the value to avoid shared references
      const clonedValue = this.deepClone(value);
      this.setValueByPath(result, config.to, clonedValue);
    }

    return result;
  }

  /**
   * Apply convert operation
   */
  private applyConvert(
    json: Record<string, unknown>,
    config: ConvertConfig
  ): Record<string, unknown> {
    const result = { ...json };
    const value = this.getValueByPath(result, config.field);

    if (value === undefined || value === null) {
      if (config.options?.defaultValue !== undefined) {
        this.setValueByPath(result, config.field, config.options.defaultValue);
      }
      return result;
    }

    let converted: unknown;

    switch (config.toType) {
      case 'string':
        converted = String(value);
        break;

      case 'number':
        if (config.options?.numberFormat === 'integer') {
          converted = parseInt(String(value), 10);
        } else {
          converted = parseFloat(String(value));
        }
        if (isNaN(converted as number)) {
          converted = config.options?.defaultValue ?? 0;
        }
        break;

      case 'boolean':
        if (typeof value === 'string') {
          converted = value.toLowerCase() === 'true' || value === '1';
        } else {
          converted = Boolean(value);
        }
        break;

      case 'array':
        if (Array.isArray(value)) {
          converted = value;
        } else if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            converted = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            converted = [value];
          }
        } else {
          converted = [value];
        }
        break;

      case 'object':
        if (typeof value === 'object' && !Array.isArray(value)) {
          converted = value;
        } else if (typeof value === 'string') {
          try {
            converted = JSON.parse(value);
          } catch {
            converted = config.options?.defaultValue ?? {};
          }
        } else {
          converted = { value };
        }
        break;

      case 'date':
        if (value instanceof Date) {
          converted = value.toISOString();
        } else if (typeof value === 'number') {
          converted = new Date(value).toISOString();
        } else if (typeof value === 'string') {
          const date = new Date(value);
          converted = isNaN(date.getTime()) ? value : date.toISOString();
        } else {
          converted = value;
        }
        break;

      case 'json':
        if (typeof value === 'string') {
          try {
            converted = JSON.parse(value);
          } catch {
            converted = value;
          }
        } else {
          converted = value;
        }
        break;

      default:
        converted = value;
    }

    this.setValueByPath(result, config.field, converted);
    return result;
  }

  /**
   * Apply conditional set operation
   */
  private applySetIf(
    json: Record<string, unknown>,
    config: SetIfConfig,
    currentItem: WorkflowItem,
    context: any
  ): Record<string, unknown> {
    const result = { ...json };

    // Evaluate condition
    const conditionResult = this.evaluateCondition(config.condition, currentItem, context);

    const value = conditionResult ? config.valueIfTrue : config.valueIfFalse;

    if (value !== undefined) {
      // Resolve variables in value
      let resolvedValue = value;
      if (typeof resolvedValue === 'string' && resolvedValue.includes('{{')) {
        resolvedValue = this.resolveVariables(resolvedValue, currentItem, context);
      }
      this.setValueByPath(result, config.field, resolvedValue);
    }

    return result;
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(
    condition: string,
    currentItem: WorkflowItem,
    context: any
  ): boolean {
    try {
      // Simple expression evaluation
      // Supports: ==, !=, >, <, >=, <=, &&, ||, !
      // And field references: $json.field

      // Replace $json references
      let expr = condition;
      const jsonRefs = expr.match(/\$json\.[\w.]+/g) || [];
      for (const ref of jsonRefs) {
        const path = ref.slice(6); // Remove '$json.'
        const value = this.getValueByPath(currentItem.json, path);
        const valueStr = JSON.stringify(value);
        expr = expr.replace(ref, valueStr);
      }

      // Replace variable references
      if (expr.includes('{{')) {
        expr = this.resolveVariables(expr, currentItem, context);
      }

      // Safe evaluation (very limited)
      // Only allow comparisons and logical operators
      const safePattern = /^[\s\d\w"'.,\-\+\*\/\(\)\[\]!<>=&|?:]+$/;
      if (!safePattern.test(expr)) {
        logger.warn('Unsafe condition expression', { condition, expr });
        return false;
      }

      // Use Function constructor for evaluation (safer than eval)
      const fn = new Function(`return (${expr});`);
      return Boolean(fn());
    } catch (error) {
      logger.warn('Condition evaluation failed', { condition, error });
      return false;
    }
  }

  /**
   * Resolve variable references in a string
   */
  private resolveVariables(
    value: string,
    currentItem: WorkflowItem,
    context: any
  ): unknown {
    // Simple variable resolution for common patterns
    // Full resolution would use VariableService

    let result = value;

    // Replace $json references
    const jsonRefs = result.match(/\{\{\$json\.[\w.]+\}\}/g) || [];
    for (const ref of jsonRefs) {
      const path = ref.slice(8, -2); // Remove '{{$json.' and '}}'
      const fieldValue = this.getValueByPath(currentItem.json, path);
      if (typeof fieldValue === 'string' || typeof fieldValue === 'number' || typeof fieldValue === 'boolean') {
        result = result.replace(ref, String(fieldValue));
      } else if (fieldValue !== undefined) {
        result = result.replace(ref, JSON.stringify(fieldValue));
      }
    }

    // Replace $itemIndex
    result = result.replace(/\{\{\$itemIndex\}\}/g, String(context.$itemIndex || 0));

    // If entire string was a single reference, return the actual value
    if (jsonRefs.length === 1 && value === jsonRefs[0]) {
      const path = value.slice(8, -2);
      return this.getValueByPath(currentItem.json, path);
    }

    return result;
  }

  /**
   * Get value by dot-notation path
   */
  private getValueByPath(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * Set value by dot-notation path
   */
  private setValueByPath(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] === undefined || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Delete value by dot-notation path
   */
  private deleteByPath(obj: Record<string, unknown>, path: string): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] === undefined || typeof current[key] !== 'object') {
        return; // Path doesn't exist
      }
      current = current[key] as Record<string, unknown>;
    }

    delete current[keys[keys.length - 1]];
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Normalize input items
   */
  private normalizeInputItems(inputs: any): WorkflowItem[] {
    if (inputs.items) {
      return ItemHelper.wrapInArray(inputs.items);
    }
    if (inputs.previousOutput) {
      return ItemHelper.wrapInArray(inputs.previousOutput);
    }
    if (inputs.data) {
      return ItemHelper.wrapInArray(inputs.data);
    }
    if (Array.isArray(inputs)) {
      return ItemHelper.wrapInArray(inputs);
    }
    if (typeof inputs === 'object' && inputs !== null) {
      return ItemHelper.wrapInArray(inputs);
    }
    return [];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let setExecutorInstance: SetExecutor | null = null;

export function getSetExecutor(): SetExecutor {
  if (!setExecutorInstance) {
    setExecutorInstance = new SetExecutor();
  }
  return setExecutorInstance;
}

export default SetExecutor;
