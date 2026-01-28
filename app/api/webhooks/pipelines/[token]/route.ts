/**
 * Pipeline Webhook Trigger API
 *
 * Allows external systems to trigger pipelines via webhook
 * Part of Phase 4: Enterprise Features
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { enqueuePipelineExecution } from "@/server/lib/pipeline-queue";
import { emitWorkflowUpdate } from "@/server/socket";

// =============================================================================
// TYPES
// =============================================================================

interface WebhookConfig {
  id: string;
  pipelineId: string;
  token: string;
  userId: string;
  name: string;
  isActive: boolean;
  secretHeader?: string;
  secretValue?: string;
  allowedIps?: string[];
  rateLimit?: number; // requests per minute
  createdAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
}

// =============================================================================
// WEBHOOK EXECUTION
// =============================================================================

/**
 * POST - Trigger pipeline via webhook
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const startTime = Date.now();

  try {
    const db = getDb();
    const token = params.token;

    // Get webhook configuration
    const [webhook] = await db.execute(sql`
      SELECT
        pw.id,
        pw.pipeline_id,
        pw.token,
        pw.user_id,
        pw.name,
        pw.is_active,
        pw.secret_header,
        pw.secret_value,
        pw.allowed_ips,
        pw.rate_limit,
        pw.created_at,
        pw.last_triggered_at,
        pw.trigger_count,
        w.name as pipeline_name,
        w.status as pipeline_status
      FROM pipeline_webhooks pw
      JOIN workflows w ON w.id = pw.pipeline_id
      WHERE pw.token = ${token}
    `) as (WebhookConfig & { pipeline_name: string; pipeline_status: string })[];

    if (!webhook) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook token",
        },
        { status: 404 }
      );
    }

    // Check if webhook is active
    if (!webhook.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Webhook is disabled",
        },
        { status: 403 }
      );
    }

    // Check if pipeline is active
    if (webhook.pipeline_status !== 'active' && webhook.pipeline_status !== 'draft') {
      return NextResponse.json(
        {
          success: false,
          error: "Pipeline is not active",
        },
        { status: 403 }
      );
    }

    // Validate secret header if configured
    if (webhook.secretHeader && webhook.secretValue) {
      const providedSecret = req.headers.get(webhook.secretHeader);
      if (providedSecret !== webhook.secretValue) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid webhook secret",
          },
          { status: 401 }
        );
      }
    }

    // Validate IP if configured
    if (webhook.allowedIps && webhook.allowedIps.length > 0) {
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                       req.headers.get("x-real-ip") ||
                       "unknown";

      if (!webhook.allowedIps.includes(clientIp) && !webhook.allowedIps.includes("*")) {
        return NextResponse.json(
          {
            success: false,
            error: "IP not allowed",
          },
          { status: 403 }
        );
      }
    }

    // Rate limiting check
    if (webhook.rateLimit) {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const [recentTriggers] = await db.execute(sql`
        SELECT COUNT(*)::int as count
        FROM webhook_trigger_logs
        WHERE webhook_id = ${webhook.id}
          AND triggered_at > ${oneMinuteAgo}
      `) as { count: number }[];

      if (recentTriggers.count >= webhook.rateLimit) {
        return NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            retryAfter: 60,
          },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    // Parse webhook payload
    let payload: Record<string, unknown> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        payload = await req.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON payload" },
          { status: 400 }
        );
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    } else if (contentType.includes("text/plain")) {
      payload = { body: await req.text() };
    }

    // Add webhook metadata to payload
    const webhookMetadata = {
      _webhook: {
        id: webhook.id,
        name: webhook.name,
        triggeredAt: new Date().toISOString(),
      },
      _headers: Object.fromEntries(
        [...req.headers.entries()].filter(
          ([key]) => !key.toLowerCase().includes("secret") &&
                     !key.toLowerCase().includes("authorization")
        )
      ),
    };

    const inputs = { ...payload, ...webhookMetadata };

    // Generate execution ID
    const executionId = uuidv4();

    // Create execution record
    await db.execute(sql`
      INSERT INTO workflow_executions (
        id,
        workflow_id,
        user_id,
        status,
        input,
        logs,
        started_at,
        is_test
      )
      VALUES (
        ${executionId},
        ${webhook.pipelineId},
        ${webhook.userId},
        'pending',
        ${JSON.stringify(inputs)}::jsonb,
        '[]'::jsonb,
        NOW(),
        false
      )
    `);

    // Enqueue pipeline execution
    const jobId = await enqueuePipelineExecution({
      pipelineId: webhook.pipelineId,
      executionId,
      userId: webhook.userId,
      triggerType: "webhook",
      inputs,
      webhookPayload: payload,
    });

    // Update webhook statistics
    await db.execute(sql`
      UPDATE pipeline_webhooks
      SET
        last_triggered_at = NOW(),
        trigger_count = trigger_count + 1
      WHERE id = ${webhook.id}
    `);

    // Log trigger
    await db.execute(sql`
      INSERT INTO webhook_trigger_logs (
        webhook_id,
        execution_id,
        payload,
        source_ip,
        triggered_at
      )
      VALUES (
        ${webhook.id},
        ${executionId},
        ${JSON.stringify(payload)}::jsonb,
        ${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"},
        NOW()
      )
    `);

    // Emit event
    try {
      emitWorkflowUpdate({
        workflowId: webhook.pipelineId,
        executionId,
        status: "started",
        progress: 0,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Socket might not be available
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        executionId,
        jobId,
        pipelineId: webhook.pipelineId,
        pipelineName: webhook.pipeline_name,
        status: "pending",
        message: "Pipeline execution triggered",
        processingTime,
        statusUrl: `/api/pipelines/${webhook.pipelineId}/execute?executionId=${executionId}`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[WEBHOOK_TRIGGER_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to trigger pipeline",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Webhook info (for testing)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const db = getDb();
    const token = params.token;

    const [webhook] = await db.execute(sql`
      SELECT
        pw.name,
        pw.is_active,
        w.name as pipeline_name
      FROM pipeline_webhooks pw
      JOIN workflows w ON w.id = pw.pipeline_id
      WHERE pw.token = ${token}
    `) as { name: string; is_active: boolean; pipeline_name: string }[];

    if (!webhook) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook token" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      webhook: {
        name: webhook.name,
        isActive: webhook.is_active,
        pipelineName: webhook.pipeline_name,
        acceptsMethods: ["POST"],
        acceptsContentTypes: [
          "application/json",
          "application/x-www-form-urlencoded",
          "text/plain",
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to get webhook info" },
      { status: 500 }
    );
  }
}
