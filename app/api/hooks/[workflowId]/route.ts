/**
 * PRODUCTION WEBHOOK HANDLER V2
 *
 * Receives external webhook calls and triggers workflow execution via BullMQ.
 * This is the production endpoint for deployed workflows.
 *
 * V2 Features:
 * - Async execution via BullMQ queue (WorkflowExecutionEngineV2)
 * - Proper ExecutionState construction for V2 engine
 * - HITL (Human-in-the-Loop) support
 * - Socket.IO real-time updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflows, workflowExecutions } from '@/lib/db/schema-workflows';
import { eq, sql } from 'drizzle-orm';
import { enqueuePipelineExecution, PIPELINE_JOB_TYPES } from '@/server/lib/pipeline-queue';
import { emitWorkflowUpdate } from '@/server/socket';
import { createLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('webhook-handler-v2');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate webhook secret from request headers
 */
function validateWebhookSecret(req: NextRequest, expectedSecret: string | null): boolean {
  const providedSecret = req.headers.get('x-webhook-secret') ||
                         req.headers.get('authorization')?.replace('Bearer ', '');

  if (!expectedSecret) return true; // No secret required
  if (!providedSecret) return false;

  // Constant-time comparison to prevent timing attacks
  if (providedSecret.length !== expectedSecret.length) return false;

  let result = 0;
  for (let i = 0; i < providedSecret.length; i++) {
    result |= providedSecret.charCodeAt(i) ^ expectedSecret.charCodeAt(i);
  }
  return result === 0;
}

/**
 * POST /api/hooks/{workflowId}
 *
 * Production webhook endpoint for triggering deployed workflows.
 *
 * Headers:
 *   - X-Webhook-Secret: The workflow's webhook secret (if requireAuth is true)
 *   - Content-Type: application/json
 *
 * Body:
 *   - Any JSON payload that will be passed as triggerData to the workflow
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const startTime = Date.now();
  const { workflowId } = params;

  try {
    logger.info('Webhook received', {
      workflowId,
      contentType: req.headers.get('content-type'),
      userAgent: req.headers.get('user-agent'),
    });

    const db = getDb();

    // Fetch workflow with deployment info
    const [workflow] = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        isPublished: workflows.isPublished,
        webhookSecret: workflows.webhookSecret,
        requireAuth: workflows.requireAuth,
        publishedNodes: workflows.publishedNodes,
        publishedEdges: workflows.publishedEdges,
        nodes: workflows.nodes,
        edges: workflows.edges,
        userId: workflows.userId,
      })
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    // Check if workflow exists
    if (!workflow) {
      logger.warn('Webhook received for non-existent workflow', { workflowId });
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check if workflow is published
    if (!workflow.isPublished) {
      logger.warn('Webhook received for unpublished workflow', { workflowId });
      return NextResponse.json(
        { error: 'Workflow is not published' },
        { status: 403 }
      );
    }

    // Validate authentication if required
    if (workflow.requireAuth) {
      if (!validateWebhookSecret(req, workflow.webhookSecret)) {
        logger.warn('Invalid webhook secret', { workflowId });
        return NextResponse.json(
          { error: 'Invalid or missing webhook secret' },
          { status: 401 }
        );
      }
    }

    // Parse request body
    let triggerData: Record<string, unknown> = {};
    try {
      const contentType = req.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        triggerData = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        formData.forEach((value, key) => {
          triggerData[key] = value;
        });
      } else {
        // Try to parse as JSON anyway
        const text = await req.text();
        if (text) {
          try {
            triggerData = JSON.parse(text);
          } catch {
            triggerData = { rawBody: text };
          }
        }
      }
    } catch (parseError: any) {
      logger.error('Failed to parse webhook body', { error: parseError.message });
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Generate execution ID
    const executionId = uuidv4();

    // Build webhook metadata
    const webhookMetadata = {
      receivedAt: new Date().toISOString(),
      workflowId,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
      contentType: req.headers.get('content-type'),
    };

    // Construct trigger data for V2 engine
    // This matches the ExecutionState.trigger structure expected by V2
    const triggerInput = {
      type: 'webhook' as const,
      payload: triggerData,
      metadata: webhookMetadata,
      // Include raw headers (sanitized) for advanced use cases
      headers: Object.fromEntries(
        [...req.headers.entries()].filter(
          ([key]) => !key.toLowerCase().includes('secret') &&
                     !key.toLowerCase().includes('authorization') &&
                     !key.toLowerCase().includes('cookie')
        )
      ),
    };

    // Use published snapshot if available, otherwise current version
    const nodesToExecute = (workflow.publishedNodes as any[]) || (workflow.nodes as any[]);
    const edgesToExecute = (workflow.publishedEdges as any[]) || (workflow.edges as any[]);

    if (!nodesToExecute || nodesToExecute.length === 0) {
      return NextResponse.json(
        { error: 'Workflow has no nodes' },
        { status: 400 }
      );
    }

    logger.info('Queuing production workflow for V2 execution', {
      workflowId,
      executionId,
      workflowName: workflow.name,
      nodeCount: nodesToExecute.length,
      edgeCount: edgesToExecute.length,
    });

    // Create execution record in database
    await db.insert(workflowExecutions).values({
      id: executionId,
      workflowId,
      userId: workflow.userId,
      status: 'pending',
      input: {
        triggerData,
        triggerType: 'webhook',
        webhookMetadata,
      },
      logs: [],
      startedAt: new Date(),
      isTest: false, // Production execution
    });

    // Enqueue workflow execution via BullMQ (V2 Engine)
    const jobId = await enqueuePipelineExecution({
      pipelineId: workflowId,
      executionId,
      userId: workflow.userId,
      triggerType: 'webhook',
      inputs: triggerInput,
      webhookPayload: triggerData,
      // V2-specific: Variables to inject into ExecutionState
      variables: {
        _trigger: triggerInput,
        _webhook: webhookMetadata,
      },
    });

    // Update production execution count
    await db
      .update(workflows)
      .set({
        productionExecutionCount: sql`COALESCE(${workflows.productionExecutionCount}, 0) + 1`,
        lastExecutedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId));

    // Emit webhook received event for real-time tracking
    try {
      emitWorkflowUpdate({
        workflowId,
        executionId,
        status: 'started',
        progress: 0,
        timestamp: new Date().toISOString(),
        metadata: {
          triggerType: 'webhook',
          jobId,
        },
      });
    } catch (socketError) {
      // Socket might not be available in serverless
      logger.debug('Socket emit skipped', { error: socketError });
    }

    const processingTime = Date.now() - startTime;

    logger.info('Webhook queued for V2 execution', {
      workflowId,
      executionId,
      jobId,
      processingTime,
    });

    // Return immediately with execution ID (async execution)
    // Client can poll /api/pipelines/{id}/execute?executionId={executionId} for status
    return NextResponse.json({
      success: true,
      executionId,
      jobId,
      workflowId,
      workflowName: workflow.name,
      status: 'pending',
      message: 'Workflow execution queued',
      processingTime,
      // URLs for tracking execution status
      statusUrl: `/api/pipelines/${workflowId}/execute?executionId=${executionId}`,
      logsUrl: `/api/pipelines/${workflowId}/executions/${executionId}/logs`,
    }, {
      status: 202, // Accepted - processing async
    });

  } catch (error: any) {
    logger.error('Webhook handler error', {
      workflowId,
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Webhook processing failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/hooks/{workflowId}
 *
 * Health check / verification endpoint for the webhook.
 * Some services (like Slack, Stripe) send a GET request to verify the endpoint.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  const { workflowId } = params;

  try {
    const db = getDb();

    const [workflow] = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        isPublished: workflows.isPublished,
      })
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (!workflow.isPublished) {
      return NextResponse.json(
        { error: 'Workflow is not published' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      workflowId: workflow.id,
      workflowName: workflow.name,
      message: 'Webhook endpoint is active. Send a POST request to trigger the workflow.',
    });

  } catch (error: any) {
    logger.error('Webhook health check error', { error: error.message });

    return NextResponse.json(
      { error: 'Health check failed', message: error.message },
      { status: 500 }
    );
  }
}
