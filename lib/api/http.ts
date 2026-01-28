import { NextResponse } from 'next/server';

/**
 * Problem+JSON error response format (RFC 7807)
 */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: any;
}

/**
 * Create standardized error response
 */
export function errorResponse(
  status: number,
  title: string,
  detail?: string,
  extra?: Record<string, any>
): NextResponse {
  const problem: ProblemDetail = {
    type: `https://sintra.ai/errors/${status}`,
    title,
    status,
    detail,
    ...extra,
  };

  return NextResponse.json(problem, {
    status,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  });
}

/**
 * Success response with optional data
 */
export function successResponse<T = any>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Common error responses
 */
export const errors = {
  badRequest: (detail?: string, extra?: Record<string, any>) =>
    errorResponse(400, 'Bad Request', detail, extra),

  unauthorized: (detail?: string) =>
    errorResponse(401, 'Unauthorized', detail || 'Authentication required'),

  forbidden: (detail?: string) =>
    errorResponse(403, 'Forbidden', detail || 'Insufficient permissions'),

  notFound: (resource: string = 'Resource') =>
    errorResponse(404, 'Not Found', `${resource} not found`),

  conflict: (detail?: string) =>
    errorResponse(409, 'Conflict', detail),

  unprocessableEntity: (detail?: string, errors?: any) =>
    errorResponse(422, 'Unprocessable Entity', detail, { errors }),

  tooManyRequests: (retryAfter?: number) =>
    errorResponse(429, 'Too Many Requests', 'Rate limit exceeded', {
      retryAfter: retryAfter || 60,
    }),

  internalServerError: (detail?: string) =>
    errorResponse(500, 'Internal Server Error', detail || 'An unexpected error occurred'),

  serviceUnavailable: (detail?: string) =>
    errorResponse(503, 'Service Unavailable', detail),
};

/**
 * Handle errors in API routes
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error);

  if (error instanceof Error) {
    // Map known error messages to appropriate HTTP responses
    if (error.message.includes('Authentication required')) {
      return errors.unauthorized();
    }

    if (error.message.includes('Insufficient permissions')) {
      return errors.forbidden(error.message);
    }

    if (error.message.includes('not found')) {
      return errors.notFound();
    }

    if (error.message.includes('already exists')) {
      return errors.conflict(error.message);
    }

    // Generic error
    return errors.internalServerError(error.message);
  }

  return errors.internalServerError();
}
