/**
 * Webhook Wait Callback Handler
 *
 * Dynamic webhook endpoint for triggering workflow resumption.
 * Handles callbacks from external systems to resume suspended workflows.
 *
 * URL Format: /api/webhook/wait/[correlationId]
 * or: /api/webhook/wait/custom/[customPath]
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { webhookWaitEndpoints, executionSuspensions } from '@/lib/db/schema-flow-control';
import { getWaitExecutor } from '@/server/services/executors/WaitExecutorV2';
import { getResumptionWorker } from '@/server/workers/resumption-worker';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface WebhookContext {
  correlationId: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  ip: string;
}

// ============================================================================
// HANDLER
// ============================================================================

async function handleWebhookCallback(
  req: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const db = getDb();
  const waitExecutor = getWaitExecutor();

  // Build context from request
  const context = await buildContext(req, pathSegments);

  logger.info('[WEBHOOK_WAIT] Received callback', {
    correlationId: context.correlationId,
    method: context.method,
    path: context.path,
  });

  try {
    // Find the webhook endpoint
    const [endpoint] = await db
      .select()
      .from(webhookWaitEndpoints)
      .where(eq(webhookWaitEndpoints.correlationId, context.correlationId))
      .limit(1);

    if (!endpoint) {
      logger.warn('[WEBHOOK_WAIT] Endpoint not found', {
        correlationId: context.correlationId,
      });
      return NextResponse.json(
        { error: 'Webhook endpoint not found' },
        { status: 404 }
      );
    }

    // Check if endpoint is active
    if (!endpoint.isActive) {
      logger.warn('[WEBHOOK_WAIT] Endpoint is inactive', {
        correlationId: context.correlationId,
      });
      return NextResponse.json(
        { error: 'Webhook endpoint is no longer active' },
        { status: 410 } // Gone
      );
    }

    // Check if endpoint has expired
    if (endpoint.expiresAt && new Date() > new Date(endpoint.expiresAt)) {
      logger.warn('[WEBHOOK_WAIT] Endpoint has expired', {
        correlationId: context.correlationId,
        expiresAt: endpoint.expiresAt,
      });
      return NextResponse.json(
        { error: 'Webhook endpoint has expired' },
        { status: 410 }
      );
    }

    // Validate method
    if (context.method !== endpoint.method && endpoint.method !== 'ANY') {
      return NextResponse.json(
        { error: `Method not allowed. Expected: ${endpoint.method}` },
        { status: 405 }
      );
    }

    // Validate IP if restrictions are set
    if (endpoint.allowedIps && (endpoint.allowedIps as string[]).length > 0) {
      const allowedIps = endpoint.allowedIps as string[];
      if (!allowedIps.includes(context.ip) && !allowedIps.includes('*')) {
        logger.warn('[WEBHOOK_WAIT] IP not allowed', {
          correlationId: context.correlationId,
          ip: context.ip,
          allowedIps,
        });
        return NextResponse.json(
          { error: 'IP address not allowed' },
          { status: 403 }
        );
      }
    }

    // Validate secret token if required
    if (endpoint.secretToken) {
      const providedToken = context.headers['x-webhook-secret'] ||
                           context.headers['authorization']?.replace('Bearer ', '') ||
                           context.query['token'];

      if (!providedToken || !validateToken(endpoint.secretToken, providedToken)) {
        logger.warn('[WEBHOOK_WAIT] Invalid secret token', {
          correlationId: context.correlationId,
        });
        return NextResponse.json(
          { error: 'Invalid or missing secret token' },
          { status: 401 }
        );
      }
    }

    // Update hit count
    await db
      .update(webhookWaitEndpoints)
      .set({
        hitCount: endpoint.hitCount + 1,
        lastHitAt: new Date(),
      })
      .where(eq(webhookWaitEndpoints.id, endpoint.id));

    // Build resume payload from webhook data
    const resumePayload = buildResumePayload(context);

    // Resume the execution
    const result = await waitExecutor.resumeByWebhook(
      context.correlationId,
      resumePayload,
      {
        triggeredAt: new Date().toISOString(),
        triggeredBy: 'webhook',
        webhookRequest: {
          headers: context.headers,
          body: context.body,
          query: context.query,
        },
      }
    );

    if (!result.success) {
      logger.error('[WEBHOOK_WAIT] Resume failed', {
        correlationId: context.correlationId,
        error: result.error,
      });
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Queue continuation with ResumptionWorker
    try {
      const worker = getResumptionWorker();
      if (result.suspension) {
        await worker.queueResume(result.suspension.id, resumePayload);
      }
    } catch (workerError) {
      logger.warn('[WEBHOOK_WAIT] Failed to queue with worker', { workerError });
      // Continue anyway - the execution was marked as resumed
    }

    logger.info('[WEBHOOK_WAIT] Successfully triggered resume', {
      correlationId: context.correlationId,
      suspensionId: result.suspension?.id,
    });

    // Build response
    const responseBody = endpoint.responseBody as Record<string, unknown> ||
      {
        success: true,
        message: 'Workflow resumed successfully',
        executionId: endpoint.executionId,
      };

    const responseHeaders = endpoint.responseHeaders as Record<string, string> || {};

    return NextResponse.json(responseBody, {
      status: endpoint.responseStatusCode || 200,
      headers: responseHeaders,
    });

  } catch (error) {
    logger.error('[WEBHOOK_WAIT] Error processing callback', {
      correlationId: context.correlationId,
      error,
    });
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}

/**
 * Build context from request
 */
async function buildContext(
  req: NextRequest,
  pathSegments: string[]
): Promise<WebhookContext> {
  // Extract correlation ID from path
  // Format: /api/webhook/wait/[correlationId] or /api/webhook/wait/custom/[...path]
  const correlationId = pathSegments[0] || '';
  const path = '/' + pathSegments.join('/');

  // Build headers object
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Build query object
  const query: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  // Parse body for POST/PUT/PATCH
  let body: unknown = null;
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    try {
      const contentType = headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        body = Object.fromEntries(formData.entries());
      } else if (contentType.includes('text/')) {
        body = await req.text();
      } else {
        // Try JSON as fallback
        try {
          body = await req.json();
        } catch {
          body = await req.text();
        }
      }
    } catch (e) {
      body = null;
    }
  }

  // Get client IP
  const ip = headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             headers['x-real-ip'] ||
             '127.0.0.1';

  return {
    correlationId,
    path,
    method: req.method,
    headers,
    query,
    body,
    ip,
  };
}

/**
 * Validate secret token (timing-safe comparison)
 */
function validateToken(expected: string, provided: string): boolean {
  if (expected.length !== provided.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(provided)
    );
  } catch {
    return false;
  }
}

/**
 * Build resume payload from webhook context
 */
function buildResumePayload(context: WebhookContext): Record<string, unknown> {
  return {
    webhook: {
      method: context.method,
      path: context.path,
      headers: context.headers,
      query: context.query,
      body: context.body,
      receivedAt: new Date().toISOString(),
    },
    // Also expose body directly for easier access in expressions
    ...(typeof context.body === 'object' && context.body !== null
      ? { data: context.body }
      : {}),
  };
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleWebhookCallback(req, params.path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleWebhookCallback(req, params.path);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleWebhookCallback(req, params.path);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleWebhookCallback(req, params.path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleWebhookCallback(req, params.path);
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
