/**
 * VARIABLE SERVICE
 *
 * Recursive variable resolver for the Flowent Pipeline Studio.
 * Replaces handlebars-syntax {{path.to.value}} with actual values from execution state.
 *
 * Features:
 * - Deep recursive traversal of nested objects/arrays
 * - Smart typing: preserves Object/Array types when placeholder is the entire value
 * - Safe path resolution with undefined fallback
 * - Support for global, nodes, variables, and trigger state
 * - **SECURITY**: Prototype pollution protection via SafePathResolver
 * - **n8n-STYLE**: Supports $json, $node["nodeName"].json, $input, $items syntax
 * - **ITEM-SCOPE**: Resolves variables in context of current item during iteration
 */

import { createLogger } from '@/lib/logger';
import {
  ExecutionState,
  VARIABLE_PATTERN,
  VariableMatch,
  ResolvedVariable,
  isPureVariableReference,
  extractVariablePath,
} from '@/types/execution';
import {
  safeGetValueByPath,
  isForbiddenSegment,
  validatePath,
  sanitizeObject,
} from './security/SafePathResolver';
import {
  WorkflowItem,
  ItemContext,
  LoopContextData,
  createItemContext,
} from '@/lib/studio/item-helper';

const logger = createLogger('variable-service');

// ============================================================================
// N8N-STYLE VARIABLE PATTERNS
// ============================================================================

/**
 * Pattern for n8n-style $json references: $json.field or $json["field"]
 */
const N8N_JSON_PATTERN = /^\$json(?:\.|\[)/;

/**
 * Pattern for n8n-style $node["nodeName"].json references
 */
const N8N_NODE_PATTERN = /^\$node\["([^"]+)"\]\.json(?:\.|\[|$)/;

/**
 * Pattern for n8n-style $input.first(), $input.last(), $input.all(), $input.item
 */
const N8N_INPUT_PATTERN = /^\$input\.(first|last|all|item)(?:\(\))?(?:\.|\[|$)/;

/**
 * Pattern for $items[index] reference
 */
const N8N_ITEMS_PATTERN = /^\$items\[(\d+)\](?:\.json)?(?:\.|\[|$)/;

/**
 * Pattern for $itemIndex and $itemCount
 */
const N8N_ITEM_META_PATTERN = /^\$(itemIndex|itemCount)$/;

/**
 * Pattern for loop context variables (Phase 2)
 * $runIndex - Current iteration number (0-indexed)
 * $batchIndex - Index of item within current batch
 * $itemIndex - Global index of item across all iterations
 * $totalItems - Total number of items being processed
 * $batchSize - Size of each batch
 * $isLastBatch - Whether this is the last batch
 * $loopNodeId - ID of the current loop node
 */
const LOOP_CONTEXT_PATTERN = /^\$(runIndex|batchIndex|totalItems|batchSize|isLastBatch|loopNodeId)$/;

// ============================================================================
// PATH RESOLUTION (Hardened against prototype pollution)
// ============================================================================

/**
 * Safely get a nested value from an object using a dot-notation path.
 * Supports array indexing with bracket notation: "items[0].name"
 *
 * **SECURITY**: This function uses SafePathResolver to prevent prototype
 * pollution attacks like {{constructor.constructor('return process')()}}.
 *
 * @param obj - The object to traverse
 * @param path - Dot-notation path (e.g., "user.profile.name" or "items[0].id")
 * @returns The value at the path, or undefined if not found/blocked
 */
export function getValueByPath(obj: any, path: string): any {
  const result = safeGetValueByPath(obj, path);

  // Log security violations
  if (result.blocked) {
    logger.warn('Blocked prototype pollution attempt in variable resolution', {
      path,
      blockedSegment: result.blockedSegment,
    });
  }

  return result.value;
}

/**
 * Check if a variable path contains dangerous segments
 * @param path - The path to validate
 * @returns true if path is safe, false if it contains dangerous patterns
 */
export function isPathSafe(path: string): boolean {
  const validation = validatePath(path);
  return validation.valid;
}

// ============================================================================
// VARIABLE PATH RESOLUTION
// ============================================================================

/**
 * Resolve a variable path against the execution state.
 *
 * Supported path formats:
 * - {{global.userId}} → state.global.userId
 * - {{global.env.API_KEY}} → state.global.env.API_KEY
 * - {{nodeId.output.data}} → state.nodes[nodeId].output.data
 * - {{nodeId.output}} → state.nodes[nodeId].output (entire output)
 * - {{variables.myVar}} → state.variables.myVar
 * - {{trigger.payload.field}} → state.trigger.payload.field
 *
 * @param path - The variable path (without braces)
 * @param state - The execution state
 * @returns ResolvedVariable with value and metadata
 */
export function resolveVariablePath(
  path: string,
  state: ExecutionState
): ResolvedVariable {
  const trimmedPath = path.trim();

  // Determine the root context based on the first segment
  const segments = trimmedPath.split('.');
  const root = segments[0];
  const remainingPath = segments.slice(1).join('.');

  try {
    let value: any;
    let found = true;

    switch (root) {
      case 'global':
        // {{global.userId}}, {{global.env.KEY}}
        value = getValueByPath(state.global, remainingPath);
        if (value === undefined) found = false;
        break;

      case 'variables':
        // {{variables.customVar}}
        value = getValueByPath(state.variables, remainingPath);
        if (value === undefined) found = false;
        break;

      case 'trigger':
        // {{trigger.payload.data}}, {{trigger.type}}
        value = getValueByPath(state.trigger, remainingPath);
        if (value === undefined) found = false;
        break;

      default:
        // Assume it's a node ID: {{nodeId.output.field}}
        // Check if this node exists in state
        const nodeState = state.nodes[root];

        if (!nodeState) {
          // Node hasn't been executed yet or doesn't exist
          logger.warn(`Variable resolution: Node "${root}" not found in state`, {
            path: trimmedPath,
            availableNodes: Object.keys(state.nodes),
          });
          return {
            path: trimmedPath,
            value: undefined,
            found: false,
            error: `Node "${root}" not found or not yet executed`,
          };
        }

        // Get value from node state
        // For {{nodeId.output.field}}, we need to handle the 'output' segment specially
        if (segments[1] === 'output') {
          // {{nodeId.output}} or {{nodeId.output.field}}
          const outputPath = segments.slice(2).join('.');
          value = outputPath
            ? getValueByPath(nodeState.output, outputPath)
            : nodeState.output;
        } else if (segments[1] === 'meta') {
          // {{nodeId.meta.status}}
          const metaPath = segments.slice(2).join('.');
          value = metaPath
            ? getValueByPath(nodeState.meta, metaPath)
            : nodeState.meta;
        } else {
          // Direct access: {{nodeId.someField}} → try output first
          value = getValueByPath(nodeState.output, remainingPath);
        }

        if (value === undefined) found = false;
        break;
    }

    return {
      path: trimmedPath,
      value,
      found,
      error: found ? undefined : `Path "${trimmedPath}" resolved to undefined`,
    };
  } catch (error: any) {
    logger.error('Variable resolution error', {
      path: trimmedPath,
      error: error.message,
    });

    return {
      path: trimmedPath,
      value: undefined,
      found: false,
      error: `Resolution error: ${error.message}`,
    };
  }
}

// ============================================================================
// N8N-STYLE VARIABLE RESOLUTION (ITEM-SCOPED)
// ============================================================================

/**
 * Resolve n8n-style variables that are scoped to the current item.
 *
 * Supported syntax:
 * - {{$json.field}} → Current item's JSON data
 * - {{$json["field"]}} → Current item's JSON data (bracket notation)
 * - {{$node["nodeName"].json}} → All items from a node
 * - {{$node["nodeName"].json[0].field}} → Specific item from a node
 * - {{$input.first()}} → First input item
 * - {{$input.last()}} → Last input item
 * - {{$input.all()}} → All input items
 * - {{$input.item}} → Current input item
 * - {{$items[0].json}} → Specific item by index
 * - {{$itemIndex}} → Current item index
 * - {{$itemCount}} → Total item count
 *
 * @param path - The n8n-style variable path (without braces)
 * @param itemContext - Current item context with $json, $node, etc.
 * @returns ResolvedVariable with value and metadata
 */
export function resolveN8nVariablePath(
  path: string,
  itemContext: ItemContext
): ResolvedVariable {
  const trimmedPath = path.trim();

  try {
    // Handle $itemIndex
    if (trimmedPath === '$itemIndex') {
      return {
        path: trimmedPath,
        value: itemContext.itemIndex,
        found: true,
      };
    }

    // Handle $itemCount
    if (trimmedPath === '$itemCount') {
      return {
        path: trimmedPath,
        value: itemContext.itemCount,
        found: true,
      };
    }

    // ========================================================================
    // PHASE 2: Loop Context Variables (SplitInBatches)
    // ========================================================================

    // Handle $runIndex - Current iteration number
    if (trimmedPath === '$runIndex') {
      if (itemContext.$loop) {
        return {
          path: trimmedPath,
          value: itemContext.$loop.runIndex,
          found: true,
        };
      }
      return {
        path: trimmedPath,
        value: undefined,
        found: false,
        error: 'Loop context not available - $runIndex can only be used inside a SplitInBatches loop',
      };
    }

    // Handle $batchIndex - Index within current batch
    if (trimmedPath === '$batchIndex') {
      if (itemContext.$loop) {
        return {
          path: trimmedPath,
          value: itemContext.$loop.batchIndex,
          found: true,
        };
      }
      return {
        path: trimmedPath,
        value: undefined,
        found: false,
        error: 'Loop context not available - $batchIndex can only be used inside a SplitInBatches loop',
      };
    }

    // Handle $totalItems - Total count of all items
    if (trimmedPath === '$totalItems') {
      if (itemContext.$loop) {
        return {
          path: trimmedPath,
          value: itemContext.$loop.totalItems,
          found: true,
        };
      }
      return {
        path: trimmedPath,
        value: undefined,
        found: false,
        error: 'Loop context not available - $totalItems can only be used inside a SplitInBatches loop',
      };
    }

    // Handle $batchSize - Size of each batch
    if (trimmedPath === '$batchSize') {
      if (itemContext.$loop) {
        return {
          path: trimmedPath,
          value: itemContext.$loop.batchSize,
          found: true,
        };
      }
      return {
        path: trimmedPath,
        value: undefined,
        found: false,
        error: 'Loop context not available - $batchSize can only be used inside a SplitInBatches loop',
      };
    }

    // Handle $isLastBatch - Whether this is the final batch
    if (trimmedPath === '$isLastBatch') {
      if (itemContext.$loop) {
        return {
          path: trimmedPath,
          value: itemContext.$loop.isLastBatch,
          found: true,
        };
      }
      return {
        path: trimmedPath,
        value: undefined,
        found: false,
        error: 'Loop context not available - $isLastBatch can only be used inside a SplitInBatches loop',
      };
    }

    // Handle $loopNodeId - ID of the current loop node
    if (trimmedPath === '$loopNodeId') {
      if (itemContext.$loop) {
        return {
          path: trimmedPath,
          value: itemContext.$loop.loopNodeId,
          found: true,
        };
      }
      return {
        path: trimmedPath,
        value: undefined,
        found: false,
        error: 'Loop context not available - $loopNodeId can only be used inside a SplitInBatches loop',
      };
    }

    // ========================================================================
    // End Phase 2 Loop Context Variables
    // ========================================================================

    // Handle $json.field or $json["field"]
    if (N8N_JSON_PATTERN.test(trimmedPath)) {
      // Extract path after $json. or $json[
      let remainingPath: string;
      if (trimmedPath.startsWith('$json.')) {
        remainingPath = trimmedPath.substring(6);
      } else if (trimmedPath.startsWith('$json[')) {
        // Handle bracket notation: $json["field"]
        const bracketMatch = trimmedPath.match(/^\$json\["([^"]+)"\](.*)$/);
        if (bracketMatch) {
          const field = bracketMatch[1];
          const rest = bracketMatch[2];
          remainingPath = rest.startsWith('.') ? field + rest : field + rest;
        } else {
          remainingPath = trimmedPath.substring(5);
        }
      } else {
        remainingPath = '';
      }

      const value = remainingPath
        ? getValueByPath(itemContext.$json, remainingPath)
        : itemContext.$json;

      return {
        path: trimmedPath,
        value,
        found: value !== undefined,
        error: value === undefined ? `$json path "${remainingPath}" not found` : undefined,
      };
    }

    // Handle $node["nodeName"].json
    const nodeMatch = trimmedPath.match(N8N_NODE_PATTERN);
    if (nodeMatch) {
      const nodeName = nodeMatch[1];
      const nodeData = itemContext.$node[nodeName];

      if (!nodeData) {
        return {
          path: trimmedPath,
          value: undefined,
          found: false,
          error: `Node "${nodeName}" not found in context`,
        };
      }

      // Extract remaining path after $node["nodeName"].json
      const afterJson = trimmedPath.substring(trimmedPath.indexOf('].json') + 6);

      if (!afterJson) {
        // Just $node["nodeName"].json - return all items
        return {
          path: trimmedPath,
          value: nodeData.json,
          found: true,
        };
      }

      // Handle $node["nodeName"].json[0].field
      if (afterJson.startsWith('[')) {
        const indexMatch = afterJson.match(/^\[(\d+)\](.*)$/);
        if (indexMatch) {
          const index = parseInt(indexMatch[1], 10);
          const itemPath = indexMatch[2].startsWith('.')
            ? indexMatch[2].substring(1)
            : indexMatch[2];

          const itemData = nodeData.json[index];
          if (itemData === undefined) {
            return {
              path: trimmedPath,
              value: undefined,
              found: false,
              error: `Item index ${index} not found in node "${nodeName}"`,
            };
          }

          const value = itemPath ? getValueByPath(itemData, itemPath) : itemData;
          return {
            path: trimmedPath,
            value,
            found: value !== undefined,
          };
        }
      }

      // Handle $node["nodeName"].json.field (applies to all items)
      if (afterJson.startsWith('.')) {
        const fieldPath = afterJson.substring(1);
        const value = nodeData.json.map((item: any) => getValueByPath(item, fieldPath));
        return {
          path: trimmedPath,
          value,
          found: true,
        };
      }

      return {
        path: trimmedPath,
        value: nodeData.json,
        found: true,
      };
    }

    // Handle $input.first(), $input.last(), $input.all(), $input.item
    const inputMatch = trimmedPath.match(N8N_INPUT_PATTERN);
    if (inputMatch) {
      const method = inputMatch[1];
      const afterMethod = trimmedPath.substring(trimmedPath.indexOf(method) + method.length);
      // Remove optional () for first/last/all
      const cleanAfter = afterMethod.replace(/^\(\)/, '');
      const remainingPath = cleanAfter.startsWith('.') ? cleanAfter.substring(1) : '';

      let baseValue: any;
      switch (method) {
        case 'first':
          baseValue = itemContext.$input.first();
          break;
        case 'last':
          baseValue = itemContext.$input.last();
          break;
        case 'all':
          baseValue = itemContext.$input.all();
          break;
        case 'item':
          baseValue = itemContext.$input.item;
          break;
        default:
          baseValue = undefined;
      }

      if (baseValue === null || baseValue === undefined) {
        return {
          path: trimmedPath,
          value: undefined,
          found: false,
          error: `$input.${method} returned no data`,
        };
      }

      const value = remainingPath ? getValueByPath(baseValue, remainingPath) : baseValue;
      return {
        path: trimmedPath,
        value,
        found: value !== undefined,
      };
    }

    // Handle $items[index]
    const itemsMatch = trimmedPath.match(N8N_ITEMS_PATTERN);
    if (itemsMatch) {
      const index = parseInt(itemsMatch[1], 10);
      const item = itemContext.$items[index];

      if (!item) {
        return {
          path: trimmedPath,
          value: undefined,
          found: false,
          error: `Item at index ${index} not found`,
        };
      }

      // Extract path after $items[n].json or $items[n]
      let afterItems = trimmedPath.substring(trimmedPath.indexOf(']') + 1);
      if (afterItems.startsWith('.json')) {
        afterItems = afterItems.substring(5);
      }

      const remainingPath = afterItems.startsWith('.') ? afterItems.substring(1) : afterItems;
      const value = remainingPath ? getValueByPath(item.json, remainingPath) : item.json;

      return {
        path: trimmedPath,
        value,
        found: value !== undefined,
      };
    }

    // Not an n8n-style variable
    return {
      path: trimmedPath,
      value: undefined,
      found: false,
      error: `Unknown n8n variable syntax: ${trimmedPath}`,
    };
  } catch (error: any) {
    logger.error('N8n variable resolution error', {
      path: trimmedPath,
      error: error.message,
    });

    return {
      path: trimmedPath,
      value: undefined,
      found: false,
      error: `Resolution error: ${error.message}`,
    };
  }
}

/**
 * Check if a path is an n8n-style variable reference
 */
export function isN8nStylePath(path: string): boolean {
  const trimmed = path.trim();
  return (
    trimmed.startsWith('$json') ||
    trimmed.startsWith('$node') ||
    trimmed.startsWith('$input') ||
    trimmed.startsWith('$items') ||
    trimmed === '$itemIndex' ||
    trimmed === '$itemCount' ||
    // Phase 2: Loop context variables
    LOOP_CONTEXT_PATTERN.test(trimmed)
  );
}

// ============================================================================
// STRING INTERPOLATION
// ============================================================================

/**
 * Find all variable matches in a string.
 *
 * @param str - The string to search
 * @returns Array of VariableMatch objects
 */
export function findVariableMatches(str: string): VariableMatch[] {
  const matches: VariableMatch[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  const regex = new RegExp(VARIABLE_PATTERN.source, 'g');

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
 * Interpolate variables within a string.
 *
 * @param str - String containing {{variable}} references
 * @param state - Execution state
 * @returns Interpolated string with variables replaced
 */
export function interpolateString(str: string, state: ExecutionState): string {
  const matches = findVariableMatches(str);

  if (matches.length === 0) {
    return str;
  }

  let result = str;

  // Process matches in reverse order to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const resolved = resolveVariablePath(match.path, state);

    let replacement: string;

    if (!resolved.found) {
      // Keep the original placeholder or use empty string
      logger.debug(`Variable not found: ${match.path}`, { path: match.path });
      replacement = match.fullMatch; // Keep original: {{path}}
    } else if (resolved.value === null) {
      replacement = 'null';
    } else if (resolved.value === undefined) {
      replacement = '';
    } else if (typeof resolved.value === 'object') {
      // For objects/arrays in string context, JSON stringify
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

// ============================================================================
// RECURSIVE RESOLVER (MAIN FUNCTION)
// ============================================================================

/**
 * Recursively resolve all variables in an input value.
 *
 * This is the main entry point for variable resolution. It handles:
 * - Strings with embedded variables: "Hello {{global.userName}}"
 * - Pure variable references that should preserve type: {{nodeId.output}}
 * - Nested objects and arrays
 * - Primitive values (pass-through)
 *
 * **Smart Typing Feature:**
 * If a string is ONLY a variable reference (e.g., "{{nodeId.output.data}}")
 * and the resolved value is an Object or Array, the return type will be
 * that Object/Array, not a stringified version.
 *
 * **SECURITY Features:**
 * - Blocks prototype pollution attacks (e.g., {{constructor.constructor}})
 * - Validates all paths before resolution
 * - Sanitizes object keys to prevent injection
 *
 * @param input - The input to resolve (can be any type)
 * @param state - The execution state containing all variable values
 * @returns The resolved value with all variables replaced
 */
export function resolveVariables(input: any, state: ExecutionState): any {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return input;
  }

  // Handle strings
  if (typeof input === 'string') {
    // Check if this is a PURE variable reference (no other text)
    if (isPureVariableReference(input)) {
      const path = extractVariablePath(input);
      if (path) {
        // SECURITY: Validate path before resolution
        if (!isPathSafe(path)) {
          logger.warn('Blocked unsafe variable path', { path });
          return undefined;
        }

        const resolved = resolveVariablePath(path, state);

        if (resolved.found) {
          // SMART TYPING: Return the actual value, preserving its type
          // This allows {{nodeId.output}} to return an Object, not "[object Object]"
          // SECURITY: Sanitize object values to remove dangerous properties
          if (typeof resolved.value === 'object' && resolved.value !== null) {
            return sanitizeObject(resolved.value);
          }
          return resolved.value;
        } else {
          // Return undefined for unresolved pure references
          logger.debug('Pure variable reference not found', { path });
          return undefined;
        }
      }
    }

    // For strings with embedded variables or other text, interpolate
    return interpolateString(input, state);
  }

  // Handle arrays - recursively resolve each element
  if (Array.isArray(input)) {
    return input.map((item) => resolveVariables(item, state));
  }

  // Handle objects - recursively resolve each value
  if (typeof input === 'object') {
    const resolved: Record<string, any> = {};

    for (const key of Object.keys(input)) {
      // SECURITY: Skip keys that could be used for prototype pollution
      if (isForbiddenSegment(key)) {
        logger.warn('Skipped forbidden key in variable resolution', { key });
        continue;
      }
      resolved[key] = resolveVariables(input[key], state);
    }

    return resolved;
  }

  // Primitives (number, boolean) pass through unchanged
  return input;
}

/**
 * Resolve variables with item-scope context (n8n-style).
 *
 * This function extends resolveVariables to support n8n-style
 * item-scoped variables like $json, $node, $input, $items.
 *
 * @param input - The input to resolve (can be any type)
 * @param state - The execution state containing all variable values
 * @param itemContext - Optional item context for n8n-style resolution
 * @returns The resolved value with all variables replaced
 */
export function resolveVariablesWithItemContext(
  input: any,
  state: ExecutionState,
  itemContext?: ItemContext
): any {
  // If no item context, fall back to standard resolution
  if (!itemContext) {
    return resolveVariables(input, state);
  }

  // Handle null/undefined
  if (input === null || input === undefined) {
    return input;
  }

  // Handle strings
  if (typeof input === 'string') {
    // Check if this is a PURE variable reference
    if (isPureVariableReference(input)) {
      const path = extractVariablePath(input);
      if (path) {
        // SECURITY: Validate path before resolution
        if (!isPathSafe(path)) {
          logger.warn('Blocked unsafe variable path', { path });
          return undefined;
        }

        // Check if it's an n8n-style path
        if (isN8nStylePath(path)) {
          const resolved = resolveN8nVariablePath(path, itemContext);
          if (resolved.found) {
            if (typeof resolved.value === 'object' && resolved.value !== null) {
              return sanitizeObject(resolved.value);
            }
            return resolved.value;
          }
          return undefined;
        }

        // Fall back to standard resolution
        const resolved = resolveVariablePath(path, state);
        if (resolved.found) {
          if (typeof resolved.value === 'object' && resolved.value !== null) {
            return sanitizeObject(resolved.value);
          }
          return resolved.value;
        }
        return undefined;
      }
    }

    // For strings with embedded variables, interpolate with item context
    return interpolateStringWithItemContext(input, state, itemContext);
  }

  // Handle arrays - recursively resolve each element
  if (Array.isArray(input)) {
    return input.map((item) => resolveVariablesWithItemContext(item, state, itemContext));
  }

  // Handle objects - recursively resolve each value
  if (typeof input === 'object') {
    const resolved: Record<string, any> = {};

    for (const key of Object.keys(input)) {
      if (isForbiddenSegment(key)) {
        logger.warn('Skipped forbidden key in variable resolution', { key });
        continue;
      }
      resolved[key] = resolveVariablesWithItemContext(input[key], state, itemContext);
    }

    return resolved;
  }

  // Primitives pass through unchanged
  return input;
}

/**
 * Interpolate variables within a string, supporting item context.
 */
function interpolateStringWithItemContext(
  str: string,
  state: ExecutionState,
  itemContext: ItemContext
): string {
  const matches = findVariableMatches(str);

  if (matches.length === 0) {
    return str;
  }

  let result = str;

  // Process matches in reverse order to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    let resolved: ResolvedVariable;

    // Check if it's an n8n-style path
    if (isN8nStylePath(match.path)) {
      resolved = resolveN8nVariablePath(match.path, itemContext);
    } else {
      resolved = resolveVariablePath(match.path, state);
    }

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Set a variable in the execution state.
 *
 * @param state - The execution state (will be mutated)
 * @param name - Variable name
 * @param value - Variable value
 */
export function setVariable(
  state: ExecutionState,
  name: string,
  value: any
): void {
  state.variables[name] = value;
  logger.debug('Variable set', { name, valueType: typeof value });
}

/**
 * Store node output in the execution state.
 *
 * @param state - The execution state (will be mutated)
 * @param nodeId - The node ID
 * @param output - The output data
 * @param meta - Execution metadata
 */
export function storeNodeOutput(
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

  logger.debug('Node output stored', {
    nodeId,
    status: meta.status,
    durationMs: meta.completedAt - meta.startedAt,
    outputType: typeof output,
  });
}

/**
 * Create an initial execution state.
 *
 * @param userId - The user ID
 * @param triggerType - How the workflow was triggered
 * @param triggerPayload - Initial input data
 * @param options - Additional options
 * @returns A new ExecutionState object
 */
export function createInitialState(
  userId: string,
  triggerType: 'manual' | 'webhook' | 'scheduled' | 'api',
  triggerPayload: any = {},
  options: {
    userEmail?: string;
    userName?: string;
    workspaceId?: string;
    env?: Record<string, string>;
    isTest?: boolean;
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
      isTest: options.isTest ?? true,
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
 * Validate that all required variables in a template are resolvable.
 *
 * @param template - Object/string to check
 * @param state - Execution state
 * @returns Array of missing variable paths
 */
export function findMissingVariables(
  template: any,
  state: ExecutionState
): string[] {
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
  return [...new Set(missing)]; // Remove duplicates
}

// ============================================================================
// EXPORTS
// ============================================================================

export const VariableService = {
  resolveVariables,
  resolveVariablePath,
  interpolateString,
  findVariableMatches,
  getValueByPath,
  setVariable,
  storeNodeOutput,
  createInitialState,
  findMissingVariables,
  // Security functions
  isPathSafe,
  // n8n-style item-scoped resolution
  resolveVariablesWithItemContext,
  resolveN8nVariablePath,
  isN8nStylePath,
};

// Re-export security utilities for direct access
export { isForbiddenSegment, validatePath, sanitizeObject } from './security/SafePathResolver';

// Re-export item helper types for convenience
export type { WorkflowItem, ItemContext, LoopContextData } from '@/lib/studio/item-helper';
export { createItemContext } from '@/lib/studio/item-helper';

export default VariableService;
