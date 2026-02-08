/**
 * Application Error Hierarchy
 * Clean, typed error handling for better debugging and user feedback
 */

export abstract class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date();
    this.context = context;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context
    };
  }
}

// 400 - Bad Request
export class ValidationError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', context);
  }
}

export class BadRequestError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'BAD_REQUEST', context);
  }
}

// 401 - Unauthorized
export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Unauthorized', context?: Record<string, any>) {
    super(message, 401, 'UNAUTHORIZED', context);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_FAILED', context);
  }
}

// 403 - Forbidden
export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Forbidden', context?: Record<string, any>) {
    super(message, 403, 'FORBIDDEN', context);
  }
}

export class PermissionDeniedError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 403, 'PERMISSION_DENIED', context);
  }
}

// 404 - Not Found
export class NotFoundError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND', context);
  }
}

// 409 - Conflict
export class ConflictError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, 'CONFLICT', context);
  }
}

// 422 - Unprocessable Entity
export class UnprocessableEntityError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', context);
  }
}

// 429 - Too Many Requests
export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Too many requests', context?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', context);
  }
}

// 500 - Internal Server Error
export class InternalServerError extends ApplicationError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', context);
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', context);
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(`External service error (${service}): ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      ...context
    });
  }
}

// Utility functions
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

export function createErrorResponse(error: unknown): {
  statusCode: number;
  body: any;
} {
  if (isApplicationError(error)) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON()
    };
  }

  // Handle unknown errors
  const unknownError = new InternalServerError(
    'An unexpected error occurred',
    error instanceof Error ? { message: error.message, stack: error.stack } : { raw: error }
  );

  return {
    statusCode: unknownError.statusCode,
    body: unknownError.toJSON()
  };
}

export function throwIfNull<T>(
  value: T | null | undefined,
  error: ApplicationError
): T {
  if (value === null || value === undefined) {
    throw error;
  }
  return value;
}

export function throwIfFalse(
  condition: boolean,
  error: ApplicationError
): asserts condition {
  if (!condition) {
    throw error;
  }
}

// Error factory for consistent error creation
export class ErrorFactory {
  static validation(message: string, context?: Record<string, any>): ValidationError {
    return new ValidationError(message, context);
  }

  static notFound(resource: string, id?: string): NotFoundError {
    const message = id 
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    return new NotFoundError(message, { resource, id });
  }

  static conflict(message: string, context?: Record<string, any>): ConflictError {
    return new ConflictError(message, context);
  }

  static unauthorized(message?: string): UnauthorizedError {
    return new UnauthorizedError(message);
  }

  static forbidden(message?: string): ForbiddenError {
    return new ForbiddenError(message);
  }

  static internal(message?: string): InternalServerError {
    return new InternalServerError(message);
  }
}