/**
 * VARIABLE RESOLVER
 *
 * Runtime resolution of {{variable}} syntax in strings
 * Replaces variable references with actual values from VariableStore
 */

import { VariableStore } from './variable-store';
import { ResolvedVariable } from './variable-types';

export interface ResolveOptions {
  throwOnMissing?: boolean;  // Throw error if variable not found (default: false)
  throwOnError?: boolean;     // Throw error if resolution fails (default: false)
  preserveUnresolved?: boolean; // Keep {{variable}} if not found (default: true)
}

export interface ResolveResult {
  resolved: string;
  variables: Record<string, ResolvedVariable>;
  errors: string[];
}

/**
 * Resolve all {{variable}} references in a string
 */
export function resolveVariables(
  text: string,
  variableStore: VariableStore,
  options: ResolveOptions = {}
): ResolveResult {
  const {
    throwOnMissing = false,
    throwOnError = false,
    preserveUnresolved = true
  } = options;

  const errors: string[] = [];
  const resolvedVariables: Record<string, ResolvedVariable> = {};

  // Find all {{variable}} patterns
  const regex = /\{\{([^}]+)\}\}/g;
  let resolved = text;
  let match;

  // Track matches to replace (we'll do it in reverse to maintain positions)
  const replacements: Array<{ start: number; end: number; value: string }> = [];

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0]; // {{variable_name}}
    const variableName = match[1].trim(); // variable_name
    const matchStart = match.index;
    const matchEnd = match.index + fullMatch.length;

    try {
      // Resolve variable from store
      const resolvedVar = variableStore.resolve(variableName);

      if (resolvedVar.error) {
        // Variable resolution failed
        errors.push(resolvedVar.error);

        if (throwOnError) {
          throw new Error(resolvedVar.error);
        }

        // Use default value or preserve original
        const replacement = resolvedVar.value !== undefined
          ? formatValue(resolvedVar.value)
          : (preserveUnresolved ? fullMatch : '');

        replacements.push({ start: matchStart, end: matchEnd, value: replacement });
      } else {
        // Successfully resolved
        resolvedVariables[variableName] = resolvedVar;

        // Format the value for string interpolation
        const formattedValue = formatValue(resolvedVar.value);
        replacements.push({ start: matchStart, end: matchEnd, value: formattedValue });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to resolve ${variableName}: ${errorMsg}`);

      if (throwOnMissing || throwOnError) {
        throw error;
      }

      // Preserve original if error
      const replacement = preserveUnresolved ? fullMatch : '';
      replacements.push({ start: matchStart, end: matchEnd, value: replacement });
    }
  }

  // Apply replacements in reverse order to maintain positions
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, value } = replacements[i];
    resolved = resolved.substring(0, start) + value + resolved.substring(end);
  }

  return {
    resolved,
    variables: resolvedVariables,
    errors
  };
}

/**
 * Format a value for string interpolation
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatValue).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/**
 * Resolve variables in an object recursively
 */
export function resolveVariablesInObject(
  obj: any,
  variableStore: VariableStore,
  options: ResolveOptions = {}
): { resolved: any; allVariables: Record<string, ResolvedVariable>; allErrors: string[] } {
  const allVariables: Record<string, ResolvedVariable> = {};
  const allErrors: string[] = [];

  function resolveRecursive(value: any): any {
    if (typeof value === 'string') {
      const result = resolveVariables(value, variableStore, options);

      // Merge variables and errors
      Object.assign(allVariables, result.variables);
      allErrors.push(...result.errors);

      return result.resolved;
    }

    if (Array.isArray(value)) {
      return value.map(resolveRecursive);
    }

    if (value !== null && typeof value === 'object') {
      const resolved: any = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = resolveRecursive(val);
      }
      return resolved;
    }

    return value;
  }

  const resolved = resolveRecursive(obj);

  return {
    resolved,
    allVariables,
    allErrors
  };
}

/**
 * Extract all variable names from a string
 */
export function extractVariableNames(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const names: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const variableName = match[1].trim();
    if (!names.includes(variableName)) {
      names.push(variableName);
    }
  }

  return names;
}

/**
 * Check if a string contains any variable references
 */
export function hasVariables(text: string): boolean {
  return /\{\{[^}]+\}\}/.test(text);
}

/**
 * Validate that all variables in a string can be resolved
 */
export function validateVariables(
  text: string,
  variableStore: VariableStore
): { valid: boolean; missing: string[]; errors: string[] } {
  const variableNames = extractVariableNames(text);
  const missing: string[] = [];
  const errors: string[] = [];

  for (const name of variableNames) {
    const variable = variableStore.get(name);

    if (!variable) {
      missing.push(name);
      errors.push(`Variable "${name}" is not defined`);
    } else {
      // Try to resolve to check for errors
      const resolved = variableStore.resolve(name);
      if (resolved.error) {
        errors.push(resolved.error);
      }
    }
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors
  };
}
