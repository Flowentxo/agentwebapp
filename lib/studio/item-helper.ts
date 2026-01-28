/**
 * ITEM HELPER UTILITY
 *
 * n8n-style item-centric data model utilities.
 * Each node processes arrays of items, where each item is a Record<string, any>.
 *
 * Key concepts:
 * - Items: Array of objects that flow through the workflow
 * - $json: Current item's data object
 * - $node["nodeName"].json: Access data from a specific node's output
 * - Automatic iteration: Each node processes each item in the input array
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Single item in the data flow
 */
export interface WorkflowItem {
  json: Record<string, any>;
  binary?: Record<string, BinaryData>;
  pairedItem?: PairedItemInfo;
}

/**
 * Binary data attachment
 */
export interface BinaryData {
  data: string; // Base64 encoded
  mimeType: string;
  fileName?: string;
  fileExtension?: string;
  fileSize?: number;
}

/**
 * Links items to their source items for traceability
 */
export interface PairedItemInfo {
  item: number; // Index of the source item
  input?: number; // Input connection index (for nodes with multiple inputs)
}

/**
 * Result from a node execution - always an array of items
 */
export type NodeExecutionItems = WorkflowItem[];

/**
 * Legacy single-item output for backward compatibility
 */
export type LegacyNodeOutput = Record<string, any> | null | undefined;

// ============================================================================
// ITEM HELPER CLASS
// ============================================================================

export class ItemHelper {
  /**
   * Wraps any value into a standardized array of WorkflowItems.
   * Ensures backward compatibility with single-item outputs.
   *
   * @example
   * wrapInArray({ name: "John" })
   * // Returns: [{ json: { name: "John" } }]
   *
   * @example
   * wrapInArray([{ name: "John" }, { name: "Jane" }])
   * // Returns: [{ json: { name: "John" } }, { json: { name: "Jane" } }]
   */
  static wrapInArray(value: any): WorkflowItem[] {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return [];
    }

    // Already an array of WorkflowItems (has json property)
    if (Array.isArray(value) && value.length > 0 && this.isWorkflowItem(value[0])) {
      return value;
    }

    // Array of plain objects - wrap each in WorkflowItem
    if (Array.isArray(value)) {
      return value.map((item, index) => ({
        json: this.isWorkflowItem(item) ? item.json : (item ?? {}),
        pairedItem: { item: index },
      }));
    }

    // Single WorkflowItem
    if (this.isWorkflowItem(value)) {
      return [value];
    }

    // Single plain object - wrap in WorkflowItem
    return [{
      json: typeof value === 'object' ? value : { value },
      pairedItem: { item: 0 },
    }];
  }

  /**
   * Flattens nested arrays of items into a single flat array.
   * Useful when a node produces multiple items per input item.
   *
   * @example
   * flattenResults([[{ json: { a: 1 } }], [{ json: { b: 2 } }, { json: { c: 3 } }]])
   * // Returns: [{ json: { a: 1 } }, { json: { b: 2 } }, { json: { c: 3 } }]
   */
  static flattenResults(results: WorkflowItem[][]): WorkflowItem[] {
    const flattened: WorkflowItem[] = [];
    let globalIndex = 0;

    for (const resultSet of results) {
      for (const item of resultSet) {
        flattened.push({
          ...item,
          pairedItem: item.pairedItem ?? { item: globalIndex },
        });
        globalIndex++;
      }
    }

    return flattened;
  }

  /**
   * Check if a value is a WorkflowItem (has json property)
   */
  static isWorkflowItem(value: any): value is WorkflowItem {
    return (
      value !== null &&
      typeof value === 'object' &&
      'json' in value &&
      typeof value.json === 'object'
    );
  }

  /**
   * Extract raw JSON data from WorkflowItems.
   * Useful for legacy code that expects plain objects.
   *
   * @example
   * extractJson([{ json: { name: "John" } }])
   * // Returns: [{ name: "John" }]
   */
  static extractJson(items: WorkflowItem[]): Record<string, any>[] {
    return items.map(item => item.json);
  }

  /**
   * Get the first item's JSON or null
   */
  static getFirstJson(items: WorkflowItem[]): Record<string, any> | null {
    return items.length > 0 ? items[0].json : null;
  }

  /**
   * Get single item for backward compatibility.
   * Returns first item's JSON or empty object.
   */
  static getSingleItem(items: WorkflowItem[]): Record<string, any> {
    return items.length > 0 ? items[0].json : {};
  }

  /**
   * Create a single WorkflowItem from a plain object
   */
  static createItem(json: Record<string, any>, itemIndex: number = 0): WorkflowItem {
    return {
      json,
      pairedItem: { item: itemIndex },
    };
  }

  /**
   * Create multiple WorkflowItems from an array of plain objects
   */
  static createItems(jsonArray: Record<string, any>[]): WorkflowItem[] {
    return jsonArray.map((json, index) => this.createItem(json, index));
  }

  /**
   * Merge multiple items into a single item.
   * Useful for aggregation nodes.
   */
  static mergeItems(items: WorkflowItem[], mergeKey: string = 'items'): WorkflowItem {
    return {
      json: {
        [mergeKey]: items.map(item => item.json),
        count: items.length,
      },
      pairedItem: { item: 0 },
    };
  }

  /**
   * Split a single item into multiple items based on an array field.
   * Useful for iterator/split nodes.
   *
   * @example
   * splitItem({ json: { users: [{name: "A"}, {name: "B"}], org: "X" } }, "users")
   * // Returns: [{ json: {name: "A", _parent: {org: "X"}} }, { json: {name: "B", _parent: {org: "X"}} }]
   */
  static splitItem(
    item: WorkflowItem,
    arrayField: string,
    preserveParent: boolean = true
  ): WorkflowItem[] {
    const arrayValue = item.json[arrayField];

    if (!Array.isArray(arrayValue)) {
      return [item]; // Return original if field is not an array
    }

    const parentData = { ...item.json };
    delete parentData[arrayField];

    return arrayValue.map((element, index) => ({
      json: preserveParent
        ? { ...element, _parent: parentData }
        : element,
      pairedItem: { item: index },
    }));
  }

  /**
   * Filter items based on a predicate function
   */
  static filterItems(
    items: WorkflowItem[],
    predicate: (json: Record<string, any>, index: number) => boolean
  ): WorkflowItem[] {
    return items.filter((item, index) => predicate(item.json, index));
  }

  /**
   * Transform items using a mapper function
   */
  static mapItems(
    items: WorkflowItem[],
    mapper: (json: Record<string, any>, index: number) => Record<string, any>
  ): WorkflowItem[] {
    return items.map((item, index) => ({
      ...item,
      json: mapper(item.json, index),
    }));
  }

  /**
   * Get item count
   */
  static count(items: WorkflowItem[]): number {
    return items.length;
  }

  /**
   * Check if items array is empty
   */
  static isEmpty(items: WorkflowItem[]): boolean {
    return items.length === 0;
  }

  /**
   * Get item at specific index
   */
  static getItem(items: WorkflowItem[], index: number): WorkflowItem | undefined {
    return items[index];
  }

  /**
   * Convert legacy node output to WorkflowItems
   * Handles various legacy output formats
   */
  static fromLegacyOutput(output: LegacyNodeOutput): WorkflowItem[] {
    if (output === null || output === undefined) {
      return [];
    }

    // Handle legacy array format
    if (Array.isArray(output)) {
      return this.wrapInArray(output);
    }

    // Handle legacy single object
    return this.wrapInArray(output);
  }

  /**
   * Convert WorkflowItems to legacy single-object format
   * For backward compatibility with old code
   */
  static toLegacyOutput(items: WorkflowItem[]): Record<string, any> | null {
    if (items.length === 0) {
      return null;
    }

    // If single item, return just the JSON
    if (items.length === 1) {
      return items[0].json;
    }

    // If multiple items, return as array
    return {
      items: this.extractJson(items),
      count: items.length,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS (re-export for easier importing)
// ============================================================================

export const wrapInArray = ItemHelper.wrapInArray.bind(ItemHelper);
export const flattenResults = ItemHelper.flattenResults.bind(ItemHelper);
export const extractJson = ItemHelper.extractJson.bind(ItemHelper);
export const createItem = ItemHelper.createItem.bind(ItemHelper);
export const createItems = ItemHelper.createItems.bind(ItemHelper);
export const isWorkflowItem = ItemHelper.isWorkflowItem.bind(ItemHelper);

// ============================================================================
// ITEM CONTEXT FOR VARIABLE RESOLUTION
// ============================================================================

/**
 * Loop context for SplitInBatches and iteration nodes (Phase 2)
 */
export interface LoopContextData {
  /** Current iteration number (0-indexed) */
  runIndex: number;
  /** Index of item within current batch (0-indexed) */
  batchIndex: number;
  /** Total number of items being processed */
  totalItems: number;
  /** Size of each batch */
  batchSize: number;
  /** Whether this is the last batch */
  isLastBatch: boolean;
  /** ID of the current loop node */
  loopNodeId: string;
}

/**
 * Context for resolving item-scoped variables
 */
export interface ItemContext {
  /** Current item index in the iteration */
  itemIndex: number;
  /** Total number of items */
  itemCount: number;
  /** Current item's JSON data ($json) */
  $json: Record<string, any>;
  /** All items in current execution */
  $items: WorkflowItem[];
  /** Access to other node outputs ($node["nodeName"].json) */
  $node: Record<string, { json: Record<string, any>[] }>;
  /** Access to input data */
  $input: {
    first: () => Record<string, any> | null;
    last: () => Record<string, any> | null;
    all: () => Record<string, any>[];
    item: Record<string, any>;
  };
  /** Loop context for SplitInBatches iteration (Phase 2) */
  $loop?: LoopContextData;
}

/**
 * Create item context for variable resolution during iteration
 *
 * @param items - All items in current execution
 * @param currentIndex - Current item index
 * @param nodeOutputs - Outputs from other nodes
 * @param loopContext - Optional loop context for SplitInBatches iteration
 */
export function createItemContext(
  items: WorkflowItem[],
  currentIndex: number,
  nodeOutputs: Record<string, WorkflowItem[]> = {},
  loopContext?: LoopContextData
): ItemContext {
  const currentItem = items[currentIndex] || { json: {} };

  const context: ItemContext = {
    itemIndex: currentIndex,
    itemCount: items.length,
    $json: currentItem.json,
    $items: items,
    $node: Object.fromEntries(
      Object.entries(nodeOutputs).map(([nodeName, nodeItems]) => [
        nodeName,
        { json: nodeItems.map(item => item.json) }
      ])
    ),
    $input: {
      first: () => items.length > 0 ? items[0].json : null,
      last: () => items.length > 0 ? items[items.length - 1].json : null,
      all: () => items.map(item => item.json),
      item: currentItem.json,
    },
  };

  // Add loop context if provided (Phase 2: SplitInBatches)
  if (loopContext) {
    context.$loop = loopContext;
  }

  return context;
}
