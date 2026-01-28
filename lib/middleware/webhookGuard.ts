/**
 * Webhook Guard Middleware
 *
 * Protects webhook endpoints using API key authentication via the `x-api-key` header.
 *
 * Usage in API routes:
 * ```typescript
 * import { withWebhookGuard, requireScopes } from '@/lib/middleware/webhookGuard';
 *
 * // Option 1: Basic protection (any valid key)
 * export const POST = withWebhookGuard(async (req, context) => {
 *   const { userId, workspaceId } = context;
 *   // ... handle webhook
 * });
 *
 * // Option 2: Require specific scopes
 * export const POST = withWebhookGuard(
 *   async (req, context) => {
 *     // ... handle webhook
 *   },
 *   { requiredScopes: ['workflows:execute'] }
 * );
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiKeyService } from '@/lib/services/ApiKeyService';

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookContext {
  /** The validated API key ID */
  keyId: string;
  /** The key prefix for logging */
  keyPrefix: string;
  /** The user ID associated with the key */
  userId: string;
  /** The workspace ID (currently same as userId) */
  workspaceId: string;
  /** The scopes granted to this key */
  scopes: string[];
}

export type WebhookHandler = (
  request: NextRequest,
  context: WebhookContext
) => Promise<Response>;

export interface WebhookGuardOptions {
  /** Required scopes - key must have ALL of these */
  requiredScopes?: string[];
  /** Alternative scopes - key must have ANY of these */
  anyScopes?: string[];
  /** Custom error handler */
  onError?: (error: string, code: string) => Response;
  /** Log usage (default: true) */
  logUsage?: boolean;
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

function createErrorResponse(
  error: string,
  code: string,
  status: number
): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Wraps an API route handler with API key authentication.
 *
 * Expects the API key in the `x-api-key` header.
 *
 * @param handler - The route handler to protect
 * @param options - Guard options (scopes, logging, etc.)
 * @returns Protected route handler
 */
export function withWebhookGuard(
  handler: WebhookHandler,
  options: WebhookGuardOptions = {}
): (request: NextRequest) => Promise<Response> {
  const { requiredScopes, anyScopes, onError, logUsage = true } = options;

  return async (request: NextRequest): Promise<Response> => {
    const startTime = Date.now();

    // Extract API key from header
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return (
        onError?.('Missing API key', 'MISSING_API_KEY') ||
        createErrorResponse(
          'Missing API key. Provide it in the x-api-key header.',
          'MISSING_API_KEY',
          401
        )
      );
    }

    // Validate the key
    const validation = await apiKeyService.validateKey(apiKey);

    if (!validation.valid || !validation.key) {
      return (
        onError?.(validation.error || 'Invalid API key', validation.errorCode || 'INVALID_KEY') ||
        createErrorResponse(
          validation.error || 'Invalid API key',
          validation.errorCode || 'INVALID_KEY',
          401
        )
      );
    }

    const { key, userId, workspaceId, scopes } = validation;

    // Check required scopes (must have ALL)
    if (requiredScopes && requiredScopes.length > 0) {
      const hasAll = apiKeyService.hasAllScopes(key, requiredScopes as any);
      if (!hasAll) {
        return (
          onError?.('Insufficient permissions', 'INSUFFICIENT_SCOPES') ||
          createErrorResponse(
            `API key missing required scopes: ${requiredScopes.join(', ')}`,
            'INSUFFICIENT_SCOPES',
            403
          )
        );
      }
    }

    // Check alternative scopes (must have ANY)
    if (anyScopes && anyScopes.length > 0) {
      const hasAny = apiKeyService.hasAnyScope(key, anyScopes as any);
      if (!hasAny) {
        return (
          onError?.('Insufficient permissions', 'INSUFFICIENT_SCOPES') ||
          createErrorResponse(
            `API key requires at least one of: ${anyScopes.join(', ')}`,
            'INSUFFICIENT_SCOPES',
            403
          )
        );
      }
    }

    // Build context
    const context: WebhookContext = {
      keyId: key.id,
      keyPrefix: key.keyPrefix,
      userId: userId!,
      workspaceId: workspaceId!,
      scopes: scopes || [],
    };

    // Execute handler
    let response: Response;
    let errorMessage: string | undefined;

    try {
      response = await handler(request, context);
    } catch (error: any) {
      errorMessage = error.message || 'Internal server error';
      response = createErrorResponse(errorMessage, 'INTERNAL_ERROR', 500);
    }

    // Log usage
    if (logUsage) {
      const responseTime = Date.now() - startTime;
      await apiKeyService.logUsage(key.id, key.keyPrefix, {
        method: request.method,
        endpoint: new URL(request.url).pathname,
        statusCode: response.status,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        responseTime,
        errorMessage,
      });
    }

    return response;
  };
}

// ============================================================================
// HELPER: SCOPE CHECKER
// ============================================================================

/**
 * Convenience function to check if a context has specific scopes.
 * Use within a handler protected by withWebhookGuard.
 */
export function requireScopes(
  context: WebhookContext,
  requiredScopes: string[]
): boolean {
  const hasWildcard = context.scopes.includes('*');
  if (hasWildcard) return true;
  return requiredScopes.every((scope) => context.scopes.includes(scope));
}

// ============================================================================
// HELPER: EXTRACT KEY FOR LOGGING
// ============================================================================

/**
 * Extract and validate API key without blocking - useful for optional auth.
 * Returns null if no key or invalid key.
 */
export async function extractApiKey(
  request: NextRequest
): Promise<WebhookContext | null> {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return null;

  const validation = await apiKeyService.validateKey(apiKey);
  if (!validation.valid || !validation.key) return null;

  return {
    keyId: validation.key.id,
    keyPrefix: validation.key.keyPrefix,
    userId: validation.userId!,
    workspaceId: validation.workspaceId!,
    scopes: validation.scopes || [],
  };
}
