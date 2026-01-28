'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Node } from 'reactflow';
import { debounce } from 'lodash';

/**
 * Workflow context for expression evaluation
 */
export interface WorkflowContext {
  /** All nodes in the workflow */
  nodes: Node[];
  /** Node outputs from previous executions (nodeId -> output) */
  nodeOutputs: Record<string, any>;
  /** Trigger/input data */
  triggerData: any;
  /** Global variables */
  globalVariables: Record<string, any>;
  /** Current item index (for multi-item processing) */
  currentItemIndex?: number;
  /** Total item count */
  itemCount?: number;
}

/**
 * Result of expression evaluation
 */
export interface ExpressionPreviewResult {
  /** Evaluated value */
  value: any;
  /** Whether evaluation succeeded */
  success: boolean;
  /** Error message if evaluation failed */
  error?: string;
  /** Type of the evaluated value */
  valueType: string;
  /** Whether the expression is valid syntax */
  isValidSyntax: boolean;
}

/**
 * Pattern for variable references: {{path.to.value}}
 */
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * n8n-style variable patterns
 */
const N8N_JSON_PATTERN = /^\$json(?:\.|\[|$)/;
const N8N_NODE_PATTERN = /^\$node\["([^"]+)"\]\.json/;
const N8N_INPUT_PATTERN = /^\$input\.(first|last|all|item)/;
const N8N_ITEMS_PATTERN = /^\$items\[(\d+)\]/;

/**
 * Safely get value by path from an object
 */
function getValueByPath(obj: any, path: string): any {
  if (!path || obj === null || obj === undefined) {
    return obj;
  }

  // Handle bracket notation: convert items[0].name to items.0.name
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const segments = normalizedPath.split('.');

  let current = obj;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

/**
 * Resolve n8n-style variables
 */
function resolveN8nVariable(
  path: string,
  context: WorkflowContext,
  currentItemData?: any
): { value: any; found: boolean; error?: string } {
  const trimmed = path.trim();

  try {
    // Handle $itemIndex
    if (trimmed === '$itemIndex') {
      return { value: context.currentItemIndex ?? 0, found: true };
    }

    // Handle $itemCount
    if (trimmed === '$itemCount') {
      return { value: context.itemCount ?? 1, found: true };
    }

    // Handle $json.field
    if (N8N_JSON_PATTERN.test(trimmed)) {
      const jsonData = currentItemData ?? context.triggerData ?? {};
      if (trimmed === '$json') {
        return { value: jsonData, found: true };
      }
      const remainingPath = trimmed.startsWith('$json.')
        ? trimmed.substring(6)
        : trimmed.substring(5);
      const value = getValueByPath(jsonData, remainingPath);
      return { value, found: value !== undefined };
    }

    // Handle $node["nodeName"].json
    const nodeMatch = trimmed.match(N8N_NODE_PATTERN);
    if (nodeMatch) {
      const nodeName = nodeMatch[1];
      // Find node by label or id
      const node = context.nodes.find(
        n => n.data?.label === nodeName || n.id === nodeName
      );
      if (!node) {
        return { value: undefined, found: false, error: `Node "${nodeName}" not found` };
      }
      const nodeOutput = context.nodeOutputs[node.id];
      if (nodeOutput === undefined) {
        return { value: undefined, found: false, error: `Node "${nodeName}" has no output yet` };
      }

      // Extract remaining path after $node["nodeName"].json
      const afterJson = trimmed.substring(trimmed.indexOf('].json') + 6);
      if (!afterJson) {
        return { value: nodeOutput, found: true };
      }

      const remainingPath = afterJson.startsWith('.') ? afterJson.substring(1) : afterJson;
      const value = getValueByPath(nodeOutput, remainingPath);
      return { value, found: value !== undefined };
    }

    // Handle $input.first(), $input.last(), etc.
    const inputMatch = trimmed.match(N8N_INPUT_PATTERN);
    if (inputMatch) {
      const method = inputMatch[1];
      const triggerData = context.triggerData;

      if (!triggerData) {
        return { value: undefined, found: false, error: 'No input data available' };
      }

      const items = Array.isArray(triggerData) ? triggerData : [triggerData];
      let baseValue: any;

      switch (method) {
        case 'first':
          baseValue = items[0] ?? null;
          break;
        case 'last':
          baseValue = items[items.length - 1] ?? null;
          break;
        case 'all':
          baseValue = items;
          break;
        case 'item':
          baseValue = currentItemData ?? items[0] ?? null;
          break;
        default:
          baseValue = undefined;
      }

      // Get remaining path
      const afterMethod = trimmed.substring(trimmed.indexOf(method) + method.length);
      const cleanAfter = afterMethod.replace(/^\(\)/, '');
      const remainingPath = cleanAfter.startsWith('.') ? cleanAfter.substring(1) : '';

      if (remainingPath) {
        baseValue = getValueByPath(baseValue, remainingPath);
      }

      return { value: baseValue, found: baseValue !== undefined };
    }

    // Handle $items[index]
    const itemsMatch = trimmed.match(N8N_ITEMS_PATTERN);
    if (itemsMatch) {
      const index = parseInt(itemsMatch[1], 10);
      const items = Array.isArray(context.triggerData)
        ? context.triggerData
        : [context.triggerData];

      if (index >= items.length) {
        return { value: undefined, found: false, error: `Item index ${index} out of bounds` };
      }

      const item = items[index];
      const afterIndex = trimmed.substring(trimmed.indexOf(']') + 1);
      const remainingPath = afterIndex.replace(/^\.json/, '').replace(/^\./, '');

      if (remainingPath) {
        const value = getValueByPath(item, remainingPath);
        return { value, found: value !== undefined };
      }

      return { value: item, found: true };
    }

    // Not an n8n-style variable
    return { value: undefined, found: false, error: 'Unknown variable syntax' };
  } catch (error: any) {
    return { value: undefined, found: false, error: error.message };
  }
}

/**
 * Resolve a standard variable path (nodeId.output.field)
 */
function resolveStandardVariable(
  path: string,
  context: WorkflowContext
): { value: any; found: boolean; error?: string } {
  const segments = path.split('.');
  const root = segments[0];

  try {
    // Handle global.* paths
    if (root === 'global') {
      const remainingPath = segments.slice(1).join('.');
      const value = getValueByPath(context.globalVariables, remainingPath);
      return { value, found: value !== undefined };
    }

    // Handle trigger.* paths
    if (root === 'trigger') {
      const remainingPath = segments.slice(1).join('.');
      const value = getValueByPath(context.triggerData, remainingPath);
      return { value, found: value !== undefined };
    }

    // Handle variables.* paths
    if (root === 'variables') {
      const remainingPath = segments.slice(1).join('.');
      const value = getValueByPath(context.globalVariables, remainingPath);
      return { value, found: value !== undefined };
    }

    // Assume it's a nodeId reference
    const nodeOutput = context.nodeOutputs[root];
    if (nodeOutput === undefined) {
      // Try to find node by label
      const node = context.nodes.find(n => n.data?.label === root);
      if (node) {
        const output = context.nodeOutputs[node.id];
        if (output !== undefined) {
          const remainingPath = segments.slice(1).join('.');
          if (remainingPath.startsWith('output.')) {
            const outputPath = remainingPath.substring(7);
            const value = outputPath ? getValueByPath(output, outputPath) : output;
            return { value, found: value !== undefined };
          }
          const value = getValueByPath(output, remainingPath);
          return { value, found: value !== undefined };
        }
      }
      return { value: undefined, found: false, error: `Node "${root}" not found or has no output` };
    }

    // Handle nodeId.output.field
    const remainingPath = segments.slice(1).join('.');
    if (remainingPath.startsWith('output.')) {
      const outputPath = remainingPath.substring(7);
      const value = outputPath ? getValueByPath(nodeOutput, outputPath) : nodeOutput;
      return { value, found: value !== undefined };
    } else if (remainingPath === 'output') {
      return { value: nodeOutput, found: true };
    }

    const value = getValueByPath(nodeOutput, remainingPath);
    return { value, found: value !== undefined };
  } catch (error: any) {
    return { value: undefined, found: false, error: error.message };
  }
}

/**
 * Check if a path is n8n-style
 */
function isN8nStylePath(path: string): boolean {
  const trimmed = path.trim();
  return (
    trimmed.startsWith('$json') ||
    trimmed.startsWith('$node') ||
    trimmed.startsWith('$input') ||
    trimmed.startsWith('$items') ||
    trimmed === '$itemIndex' ||
    trimmed === '$itemCount'
  );
}

/**
 * Evaluate an expression with variable substitution
 */
function evaluateExpression(
  expression: string,
  context: WorkflowContext,
  currentItemData?: any
): ExpressionPreviewResult {
  if (!expression || expression.trim() === '') {
    return {
      value: '',
      success: true,
      valueType: 'string',
      isValidSyntax: true,
    };
  }

  // Check for unclosed braces
  const openBraces = (expression.match(/\{\{/g) || []).length;
  const closeBraces = (expression.match(/\}\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return {
      value: undefined,
      success: false,
      error: 'Unclosed expression brackets. Each {{ must have a matching }}',
      valueType: 'undefined',
      isValidSyntax: false,
    };
  }

  // Check if expression is a pure variable reference (no other text)
  const trimmed = expression.trim();
  const pureMatch = trimmed.match(/^\{\{([^}]+)\}\}$/);

  if (pureMatch) {
    const path = pureMatch[1].trim();
    let result: { value: any; found: boolean; error?: string };

    if (isN8nStylePath(path)) {
      result = resolveN8nVariable(path, context, currentItemData);
    } else {
      result = resolveStandardVariable(path, context);
    }

    if (!result.found) {
      return {
        value: undefined,
        success: false,
        error: result.error || `Variable "${path}" not found`,
        valueType: 'undefined',
        isValidSyntax: true,
      };
    }

    return {
      value: result.value,
      success: true,
      valueType: typeof result.value,
      isValidSyntax: true,
    };
  }

  // Handle string interpolation (multiple variables or mixed text)
  let resultString = expression;
  const matches = [...expression.matchAll(VARIABLE_PATTERN)];

  for (const match of matches) {
    const fullMatch = match[0];
    const path = match[1].trim();
    let result: { value: any; found: boolean; error?: string };

    if (isN8nStylePath(path)) {
      result = resolveN8nVariable(path, context, currentItemData);
    } else {
      result = resolveStandardVariable(path, context);
    }

    let replacement: string;
    if (!result.found) {
      replacement = fullMatch; // Keep original if not found
    } else if (result.value === null) {
      replacement = 'null';
    } else if (result.value === undefined) {
      replacement = '';
    } else if (typeof result.value === 'object') {
      replacement = JSON.stringify(result.value);
    } else {
      replacement = String(result.value);
    }

    resultString = resultString.replace(fullMatch, replacement);
  }

  return {
    value: resultString,
    success: true,
    valueType: 'string',
    isValidSyntax: true,
  };
}

/**
 * Hook for real-time expression preview with debouncing
 */
export function useExpressionPreview(
  expression: string,
  context: WorkflowContext,
  debounceMs: number = 300
): {
  result: ExpressionPreviewResult;
  isEvaluating: boolean;
} {
  const [result, setResult] = useState<ExpressionPreviewResult>({
    value: '',
    success: true,
    valueType: 'string',
    isValidSyntax: true,
  });
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Create debounced evaluation function
  const debouncedEvaluate = useRef(
    debounce((expr: string, ctx: WorkflowContext) => {
      const evalResult = evaluateExpression(expr, ctx);
      setResult(evalResult);
      setIsEvaluating(false);
    }, debounceMs)
  ).current;

  useEffect(() => {
    if (!expression) {
      setResult({
        value: '',
        success: true,
        valueType: 'string',
        isValidSyntax: true,
      });
      setIsEvaluating(false);
      return;
    }

    setIsEvaluating(true);
    debouncedEvaluate(expression, context);

    return () => {
      debouncedEvaluate.cancel();
    };
  }, [expression, context, debouncedEvaluate]);

  return { result, isEvaluating };
}

/**
 * Extract available variables from workflow context for autocomplete
 */
export function extractAvailableVariables(context: WorkflowContext): {
  path: string;
  label: string;
  type: string;
  description: string;
  value?: any;
}[] {
  const variables: {
    path: string;
    label: string;
    type: string;
    description: string;
    value?: any;
  }[] = [];

  // Add n8n-style built-in variables
  variables.push(
    { path: '$json', label: '$json', type: 'object', description: 'Current item data' },
    { path: '$itemIndex', label: '$itemIndex', type: 'number', description: 'Current item index' },
    { path: '$itemCount', label: '$itemCount', type: 'number', description: 'Total item count' },
    { path: '$input.first()', label: '$input.first()', type: 'object', description: 'First input item' },
    { path: '$input.last()', label: '$input.last()', type: 'object', description: 'Last input item' },
    { path: '$input.all()', label: '$input.all()', type: 'array', description: 'All input items' },
    { path: '$input.item', label: '$input.item', type: 'object', description: 'Current input item' }
  );

  // Add node outputs
  for (const node of context.nodes) {
    const nodeName = node.data?.label || node.id;
    const nodeOutput = context.nodeOutputs[node.id];

    variables.push({
      path: `$node["${nodeName}"].json`,
      label: `$node["${nodeName}"].json`,
      type: nodeOutput ? typeof nodeOutput : 'unknown',
      description: `Output from ${nodeName}`,
      value: nodeOutput,
    });

    // Also add standard path format
    variables.push({
      path: `${node.id}.output`,
      label: `${nodeName} Output`,
      type: nodeOutput ? typeof nodeOutput : 'unknown',
      description: `Output from ${nodeName} (standard format)`,
      value: nodeOutput,
    });
  }

  // Add trigger data fields
  if (context.triggerData && typeof context.triggerData === 'object') {
    const addObjectFields = (obj: any, prefix: string, labelPrefix: string) => {
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        const path = `${prefix}.${key}`;
        const label = `${labelPrefix}.${key}`;

        variables.push({
          path,
          label,
          type: Array.isArray(value) ? 'array' : typeof value,
          description: `Trigger data field`,
          value,
        });

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          addObjectFields(value, path, label);
        }
      }
    };

    addObjectFields(context.triggerData, 'trigger.payload', 'trigger.payload');
  }

  // Add global variables
  if (context.globalVariables) {
    for (const [key, value] of Object.entries(context.globalVariables)) {
      variables.push({
        path: `global.${key}`,
        label: `global.${key}`,
        type: typeof value,
        description: 'Global variable',
        value,
      });
    }
  }

  return variables;
}

export default useExpressionPreview;
