/**
 * SafePathResolver
 *
 * Secure path resolution utility that prevents prototype pollution attacks.
 * Replaces unsafe direct property access with validated path traversal.
 *
 * Security features:
 * - Blocklist of dangerous property names (__proto__, prototype, constructor)
 * - Validates each path segment before access
 * - Handles null/undefined gracefully
 * - Supports both dot notation and bracket notation
 *
 * @security CRITICAL - Used for variable resolution in user-controlled data
 */

import { FORBIDDEN_PATH_SEGMENTS } from './types';

/**
 * Result of safe path resolution
 */
export interface SafePathResult {
  value: any;
  found: boolean;
  blocked: boolean;
  blockedSegment?: string;
  error?: string;
}

/**
 * Check if a path segment is forbidden (prototype pollution attempt)
 */
export function isForbiddenSegment(segment: string): boolean {
  const normalizedSegment = segment.toLowerCase().trim();
  return FORBIDDEN_PATH_SEGMENTS.some(
    forbidden => normalizedSegment === forbidden.toLowerCase()
  );
}

/**
 * Validate a complete path for dangerous segments
 */
export function validatePath(path: string): {
  valid: boolean;
  dangerousSegments: string[];
} {
  if (!path || typeof path !== 'string') {
    return { valid: true, dangerousSegments: [] };
  }

  // Normalize path
  const normalizedPath = path
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\[["']([^"']+)["']\]/g, '.$1');

  const segments = normalizedPath.split('.');
  const dangerousSegments: string[] = [];

  for (const segment of segments) {
    if (isForbiddenSegment(segment)) {
      dangerousSegments.push(segment);
    }
  }

  return {
    valid: dangerousSegments.length === 0,
    dangerousSegments,
  };
}

/**
 * Safely get a nested value from an object using a dot-notation path.
 * Prevents prototype pollution by blocking access to dangerous properties.
 *
 * @param obj - The object to traverse
 * @param path - Dot-notation path (e.g., "user.profile.name" or "items[0].id")
 * @returns SafePathResult with value and security metadata
 */
export function safeGetValueByPath(obj: any, path: string): SafePathResult {
  // Handle null/undefined object
  if (obj === null || obj === undefined) {
    return {
      value: undefined,
      found: false,
      blocked: false,
    };
  }

  // Handle empty path - return the object itself
  if (!path || path.trim() === '') {
    return {
      value: obj,
      found: true,
      blocked: false,
    };
  }

  // Validate path for dangerous segments
  const validation = validatePath(path);
  if (!validation.valid) {
    console.warn(
      `[SafePathResolver] Blocked prototype pollution attempt: "${path}"`,
      { dangerousSegments: validation.dangerousSegments }
    );
    return {
      value: undefined,
      found: false,
      blocked: true,
      blockedSegment: validation.dangerousSegments[0],
      error: `Blocked access to forbidden property: ${validation.dangerousSegments.join(', ')}`,
    };
  }

  // Normalize path: convert bracket notation to dot notation
  const normalizedPath = path
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\[["']([^"']+)["']\]/g, '.$1');

  const segments = normalizedPath.split('.');
  let current: any = obj;

  for (const segment of segments) {
    // Check for null/undefined during traversal
    if (current === null || current === undefined) {
      return {
        value: undefined,
        found: false,
        blocked: false,
      };
    }

    // Double-check segment (redundant but safe)
    if (isForbiddenSegment(segment)) {
      return {
        value: undefined,
        found: false,
        blocked: true,
        blockedSegment: segment,
        error: `Blocked access to forbidden property: ${segment}`,
      };
    }

    // Only access own properties, not inherited ones
    if (typeof current === 'object' && !Object.prototype.hasOwnProperty.call(current, segment)) {
      // For arrays, allow numeric index access
      if (Array.isArray(current)) {
        const index = parseInt(segment, 10);
        if (!isNaN(index) && index >= 0 && index < current.length) {
          current = current[index];
          continue;
        }
      }
      return {
        value: undefined,
        found: false,
        blocked: false,
      };
    }

    current = current[segment];
  }

  return {
    value: current,
    found: current !== undefined,
    blocked: false,
  };
}

/**
 * Safely set a nested value in an object using a dot-notation path.
 * Prevents prototype pollution by blocking access to dangerous properties.
 *
 * @param obj - The object to modify
 * @param path - Dot-notation path
 * @param value - The value to set
 * @returns Success status and any security issues
 */
export function safeSetValueByPath(
  obj: any,
  path: string,
  value: any
): { success: boolean; blocked: boolean; error?: string } {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return {
      success: false,
      blocked: false,
      error: 'Target must be an object',
    };
  }

  if (!path || path.trim() === '') {
    return {
      success: false,
      blocked: false,
      error: 'Path cannot be empty',
    };
  }

  // Validate path
  const validation = validatePath(path);
  if (!validation.valid) {
    console.warn(
      `[SafePathResolver] Blocked prototype pollution in set: "${path}"`,
      { dangerousSegments: validation.dangerousSegments }
    );
    return {
      success: false,
      blocked: true,
      error: `Blocked access to forbidden property: ${validation.dangerousSegments.join(', ')}`,
    };
  }

  // Normalize path
  const normalizedPath = path
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\[["']([^"']+)["']\]/g, '.$1');

  const segments = normalizedPath.split('.');
  let current: any = obj;

  // Traverse to the parent of the target property
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];

    if (isForbiddenSegment(segment)) {
      return {
        success: false,
        blocked: true,
        error: `Blocked access to forbidden property: ${segment}`,
      };
    }

    if (current[segment] === undefined || current[segment] === null) {
      // Create intermediate objects if needed
      const nextSegment = segments[i + 1];
      current[segment] = /^\d+$/.test(nextSegment) ? [] : {};
    }

    current = current[segment];
  }

  // Set the final value
  const lastSegment = segments[segments.length - 1];

  if (isForbiddenSegment(lastSegment)) {
    return {
      success: false,
      blocked: true,
      error: `Blocked access to forbidden property: ${lastSegment}`,
    };
  }

  current[lastSegment] = value;

  return {
    success: true,
    blocked: false,
  };
}

/**
 * Create a frozen deep clone of an object to prevent modification
 */
export function createImmutableCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  try {
    // Use JSON serialization to deep clone and strip functions
    const cloned = JSON.parse(
      JSON.stringify(obj, (key, value) => {
        // Skip dangerous keys
        if (isForbiddenSegment(key)) {
          return undefined;
        }
        // Skip functions
        if (typeof value === 'function') {
          return undefined;
        }
        return value;
      })
    );

    // Deep freeze the result
    return deepFreeze(cloned);
  } catch {
    return obj;
  }
}

/**
 * Deep freeze an object to prevent modification
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  Object.freeze(obj);

  if (Array.isArray(obj)) {
    obj.forEach(deepFreeze);
  } else {
    Object.keys(obj).forEach(key => {
      const value = (obj as any)[key];
      if (typeof value === 'object' && value !== null) {
        deepFreeze(value);
      }
    });
  }

  return obj;
}

/**
 * Sanitize an object by removing dangerous properties
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  try {
    return JSON.parse(
      JSON.stringify(obj, (key, value) => {
        if (isForbiddenSegment(key)) {
          return undefined;
        }
        if (typeof value === 'function' || typeof value === 'symbol') {
          return undefined;
        }
        return value;
      })
    );
  } catch {
    return obj;
  }
}

export const SafePathResolver = {
  safeGetValueByPath,
  safeSetValueByPath,
  isForbiddenSegment,
  validatePath,
  createImmutableCopy,
  sanitizeObject,
};

export default SafePathResolver;
