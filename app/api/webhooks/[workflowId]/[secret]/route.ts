/**
 * WEBHOOK TRIGGER ENDPOINT
 *
 * POST /api/webhooks/:workflowId/:secret
 *
 * Accepts webhook requests, validates secret, checks rate limits,
 * and enqueues workflow execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookService } from '@/server/services/WebhookService';
import { webhookQueueService } from '@/server/services/WebhookQueueService';
import Redis from 'ioredis';

// Redis connection for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
});

// Constants
const MAX_PAYLOAD_SIZE = 1 * 1024 * 1024; // 1 MB
const DEFAULT_RATE_LIMIT = 100; // requests per minute

/**
 * POST handler for webhook triggers
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { workflowId: string; secret: string } }
) {
  const startTime = Date.now();

  try {
    const { workflowId, secret } = params;

    // Validate parameters
    if (!workflowId || !secret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing workflow ID or secret',
        },
        { status: 400 }
      );
    }

    // Get IP address
    const ipAddress = getClientIp(req);

    // Get User-Agent
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 1. VALIDATE SECRET & GET CONFIG
    const validation = await webhookService.validateWebhook(workflowId, secret, ipAddress);

    if (!validation.valid) {
      // Log unauthorized attempt
      await webhookService.logWebhookRequest({
        workflowId,
        ipAddress,
        userAgent,
        payload: {},
        headers: Object.fromEntries(req.headers.entries()),
        payloadSize: 0,
        status: 'unauthorized',
        errorMessage: validation.error,
        responseTimeMs: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Unauthorized',
          errorCode: validation.errorCode,
        },
        { status: 401 }
      );
    }

    // 2. CHECK RATE LIMIT
    const rateLimitResult = await checkRateLimit(
      workflowId,
      validation.config?.rateLimitPerMinute || DEFAULT_RATE_LIMIT
    );

    if (!rateLimitResult.allowed) {
      // Log rate limited request
      await webhookService.logWebhookRequest({
        workflowId,
        ipAddress,
        userAgent,
        payload: {},
        headers: Object.fromEntries(req.headers.entries()),
        payloadSize: 0,
        status: 'rate_limited',
        errorMessage: 'Rate limit exceeded',
        responseTimeMs: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          rateLimit: {
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetAt: rateLimitResult.resetAt,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          },
        }
      );
    }

    // 3. VALIDATE CONTENT-TYPE
    const contentType = req.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content-Type must be application/json',
        },
        { status: 400 }
      );
    }

    // 4. PARSE & VALIDATE JSON PAYLOAD
    let payload: any;

    try {
      const rawBody = await req.text();

      // Check payload size
      if (rawBody.length > MAX_PAYLOAD_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `Payload too large (max ${MAX_PAYLOAD_SIZE / 1024 / 1024}MB)`,
          },
          { status: 413 }
        );
      }

      payload = JSON.parse(rawBody);

      // Validate JSON depth (prevent deeply nested objects)
      const maxDepth = 10;
      if (getObjectDepth(payload) > maxDepth) {
        return NextResponse.json(
          {
            success: false,
            error: `Payload too deeply nested (max depth: ${maxDepth})`,
          },
          { status: 400 }
        );
      }
    } catch (error) {
      // Log invalid payload
      await webhookService.logWebhookRequest({
        workflowId,
        ipAddress,
        userAgent,
        payload: {},
        headers: Object.fromEntries(req.headers.entries()),
        payloadSize: 0,
        status: 'invalid_payload',
        errorMessage: 'Invalid JSON payload',
        responseTimeMs: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload',
        },
        { status: 400 }
      );
    }

    // 5. ENQUEUE WORKFLOW EXECUTION
    const { executionId, jobId } = await webhookQueueService.enqueueWebhookExecution(
      workflowId,
      validation.config?.userId || 'system',
      payload,
      {
        ipAddress,
        userAgent,
      }
    );

    const responseTime = Date.now() - startTime;

    // 6. RETURN SUCCESS RESPONSE
    return NextResponse.json(
      {
        success: true,
        executionId,
        jobId,
        message: 'Workflow queued for execution',
        estimatedTime: '< 10 seconds',
        rateLimit: {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        },
      },
      {
        status: 202, // 202 Accepted
        headers: {
          'X-Execution-ID': executionId,
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.resetAt),
        },
      }
    );
  } catch (error: any) {
    console.error('[WEBHOOK_ENDPOINT] Error processing webhook:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Rate limiting using Redis
 */
async function checkRateLimit(
  workflowId: string,
  limit: number
): Promise<{ allowed: boolean; limit: number; remaining: number; resetAt: number }> {
  const key = `webhook:ratelimit:${workflowId}`;
  const now = Date.now();
  const windowStart = now - 60 * 1000; // 1 minute window

  try {
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const count = await redis.zcard(key);

    if (count >= limit) {
      // Rate limit exceeded
      const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldestEntry.length > 0 ? parseInt(oldestEntry[1]) + 60 * 1000 : now + 60 * 1000;

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
      };
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration on key
    await redis.expire(key, 60); // Expire after 60 seconds

    return {
      allowed: true,
      limit,
      remaining: limit - count - 1,
      resetAt: now + 60 * 1000,
    };
  } catch (error) {
    console.error('[RATE_LIMIT] Redis error:', error);

    // On Redis error, allow request (fail-open)
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt: now + 60 * 1000,
    };
  }
}

/**
 * Get client IP address from request
 */
function getClientIp(req: NextRequest): string {
  // Check common headers for IP address
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare

  if (xForwardedFor) {
    // X-Forwarded-For can be a comma-separated list
    return xForwardedFor.split(',')[0].trim();
  }

  if (xRealIp) {
    return xRealIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return 'unknown';
}

/**
 * Calculate JSON object depth
 */
function getObjectDepth(obj: any, depth: number = 0): number {
  if (typeof obj !== 'object' || obj === null) {
    return depth;
  }

  if (Array.isArray(obj)) {
    return Math.max(depth, ...obj.map((item) => getObjectDepth(item, depth + 1)));
  }

  const values = Object.values(obj);
  if (values.length === 0) {
    return depth;
  }

  return Math.max(...values.map((value) => getObjectDepth(value, depth + 1)));
}
