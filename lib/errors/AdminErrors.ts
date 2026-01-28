/**
 * ADMIN ERROR CLASSES
 *
 * Standardized error handling for admin operations.
 * Provides consistent error codes and messages.
 */

// =====================================================
// Base Admin Error
// =====================================================

export class AdminError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes from programming errors

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

// =====================================================
// Specific Error Types
// =====================================================

export class AuthenticationError extends AdminError {
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 'AUTH_REQUIRED', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AdminError {
  constructor(message = 'Insufficient permissions', details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AdminError {
  constructor(resource = 'Resource', details?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AdminError {
  public readonly validationErrors: Array<{ field: string; message: string }>;

  constructor(
    message = 'Validation failed',
    validationErrors: Array<{ field: string; message: string }> = [],
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, { ...details, validationErrors });
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

export class ConflictError extends AdminError {
  constructor(message = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AdminError {
  public readonly retryAfter: number;

  constructor(retryAfter = 60, details?: Record<string, unknown>) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, { ...details, retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class DatabaseError extends AdminError {
  constructor(message = 'Database operation failed', details?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, details);
    this.name = 'DatabaseError';
  }
}

export class ServiceUnavailableError extends AdminError {
  constructor(service = 'Service', details?: Record<string, unknown>) {
    super(`${service} is temporarily unavailable`, 'SERVICE_UNAVAILABLE', 503, details);
    this.name = 'ServiceUnavailableError';
  }
}

export class ExternalServiceError extends AdminError {
  constructor(service: string, originalError?: Error, details?: Record<string, unknown>) {
    super(
      `External service error: ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { ...details, originalError: originalError?.message }
    );
    this.name = 'ExternalServiceError';
  }
}

// =====================================================
// Error Handler Utility
// =====================================================

import { NextResponse } from 'next/server';

/**
 * Convert error to NextResponse
 */
export function errorToResponse(error: unknown): NextResponse {
  if (error instanceof AdminError) {
    const headers: Record<string, string> = {};

    if (error instanceof RateLimitError) {
      headers['Retry-After'] = error.retryAfter.toString();
    }

    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
      headers,
    });
  }

  // Log unexpected errors
  console.error('[ADMIN_ERROR] Unexpected error:', error);

  // Return generic error for non-operational errors
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Wrap async handler with error handling
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorToResponse(error);
    }
  }) as T;
}

/**
 * Assert condition or throw error
 */
export function assertAdmin(
  condition: boolean,
  ErrorClass: new (...args: unknown[]) => AdminError = AuthorizationError,
  ...args: unknown[]
): asserts condition {
  if (!condition) {
    throw new (ErrorClass as new (...args: unknown[]) => AdminError)(...args);
  }
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): void {
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({ field, message: `${field} is required` });
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Missing required fields', errors);
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

// =====================================================
// Error Logging
// =====================================================

export interface ErrorLogEntry {
  timestamp: Date;
  code: string;
  message: string;
  statusCode: number;
  stack?: string;
  details?: Record<string, unknown>;
  userId?: string;
  path?: string;
  method?: string;
}

/**
 * Log error with context
 */
export function logAdminError(
  error: unknown,
  context?: {
    userId?: string;
    path?: string;
    method?: string;
  }
): ErrorLogEntry {
  const entry: ErrorLogEntry = {
    timestamp: new Date(),
    code: error instanceof AdminError ? error.code : 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
    statusCode: error instanceof AdminError ? error.statusCode : 500,
    stack: error instanceof Error ? error.stack : undefined,
    details: error instanceof AdminError ? error.details : undefined,
    ...context,
  };

  // Log to console (in production, send to logging service)
  if (error instanceof AdminError && error.isOperational) {
    console.warn('[ADMIN_OP_ERROR]', JSON.stringify(entry));
  } else {
    console.error('[ADMIN_CRITICAL_ERROR]', JSON.stringify(entry));
  }

  return entry;
}
