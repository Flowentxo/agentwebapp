/**
 * WORKFLOW DEPLOYMENT API
 *
 * Deploy/undeploy workflows for production use.
 * Manages webhook secrets, versioning, and publication status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflows, workflowVersions } from '@/lib/db/schema-workflows';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { createLogger } from '@/lib/logger';

const logger = createLogger('workflow-deploy-api');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Build the webhook URL for a workflow
 */
function buildWebhookUrl(workflowId: string, req: NextRequest): string {
  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${protocol}://${host}/api/hooks/${workflowId}`;
}

/**
 * POST /api/workflows/{workflowId}/deploy
 *
 * Deploy a workflow for production use.
 *
 * Body:
 *   - action: 'deploy' | 'undeploy' | 'regenerate-secret'
 *   - requireAuth: boolean (optional) - require auth header for webhook calls
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { workflowId } = params;
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const body = await req.json();
    const { action = 'deploy', requireAuth = true } = body;

    const db = getDb();

    // Fetch workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (workflow.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - workflow does not belong to user' },
        { status: 403 }
      );
    }

    // Validate workflow has nodes
    if (!workflow.nodes || (workflow.nodes as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Cannot deploy workflow without nodes' },
        { status: 400 }
      );
    }

    const webhookUrl = buildWebhookUrl(workflowId, req);

    // Handle different actions
    switch (action) {
      case 'deploy': {
        // Generate secret if not exists
        const webhookSecret = workflow.webhookSecret || generateWebhookSecret();
        const newVersion = (workflow.publishedVersion || 0) + 1;

        // Create version snapshot
        await db.insert(workflowVersions).values({
          workflowId,
          version: `v${newVersion}`,
          name: workflow.name,
          description: workflow.description,
          nodes: workflow.nodes as any[],
          edges: workflow.edges as any[],
          changeDescription: `Published version ${newVersion}`,
          createdBy: userId,
        });

        // Update workflow
        await db
          .update(workflows)
          .set({
            isPublished: true,
            webhookSecret,
            publishedVersion: newVersion,
            publishedNodes: workflow.nodes,
            publishedEdges: workflow.edges,
            requireAuth,
            webhookUrl,
            status: 'active',
            publishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workflows.id, workflowId));

        logger.info('Workflow deployed', {
          workflowId,
          version: newVersion,
          userId,
        });

        return NextResponse.json({
          success: true,
          message: 'Workflow deployed successfully',
          deployment: {
            workflowId,
            isPublished: true,
            publishedVersion: newVersion,
            webhookUrl,
            webhookSecret,
            requireAuth,
            publishedAt: new Date().toISOString(),
          },
        });
      }

      case 'undeploy': {
        await db
          .update(workflows)
          .set({
            isPublished: false,
            status: 'draft',
            updatedAt: new Date(),
          })
          .where(eq(workflows.id, workflowId));

        logger.info('Workflow undeployed', { workflowId, userId });

        return NextResponse.json({
          success: true,
          message: 'Workflow undeployed successfully',
          deployment: {
            workflowId,
            isPublished: false,
          },
        });
      }

      case 'regenerate-secret': {
        const newSecret = generateWebhookSecret();

        await db
          .update(workflows)
          .set({
            webhookSecret: newSecret,
            updatedAt: new Date(),
          })
          .where(eq(workflows.id, workflowId));

        logger.info('Webhook secret regenerated', { workflowId, userId });

        return NextResponse.json({
          success: true,
          message: 'Webhook secret regenerated',
          deployment: {
            workflowId,
            webhookSecret: newSecret,
          },
        });
      }

      case 'update-settings': {
        const { requireAuth: newRequireAuth } = body;

        await db
          .update(workflows)
          .set({
            requireAuth: newRequireAuth ?? workflow.requireAuth,
            updatedAt: new Date(),
          })
          .where(eq(workflows.id, workflowId));

        logger.info('Deployment settings updated', { workflowId, userId, requireAuth: newRequireAuth });

        return NextResponse.json({
          success: true,
          message: 'Deployment settings updated',
          deployment: {
            workflowId,
            requireAuth: newRequireAuth ?? workflow.requireAuth,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    logger.error('Workflow deployment error', { error: error.message, stack: error.stack });

    return NextResponse.json(
      {
        success: false,
        error: 'Deployment failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/{workflowId}/deploy
 *
 * Get deployment status and configuration for a workflow.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { workflowId } = params;
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const db = getDb();

    // Fetch workflow
    const [workflow] = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        isPublished: workflows.isPublished,
        webhookSecret: workflows.webhookSecret,
        publishedVersion: workflows.publishedVersion,
        requireAuth: workflows.requireAuth,
        webhookUrl: workflows.webhookUrl,
        publishedAt: workflows.publishedAt,
        productionExecutionCount: workflows.productionExecutionCount,
        userId: workflows.userId,
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

    // Check ownership
    if (workflow.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - workflow does not belong to user' },
        { status: 403 }
      );
    }

    // Build webhook URL if not cached
    const webhookUrl = workflow.webhookUrl || buildWebhookUrl(workflowId, req);

    return NextResponse.json({
      deployment: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        isPublished: workflow.isPublished,
        webhookSecret: workflow.webhookSecret,
        publishedVersion: workflow.publishedVersion,
        requireAuth: workflow.requireAuth,
        webhookUrl,
        publishedAt: workflow.publishedAt,
        productionExecutionCount: workflow.productionExecutionCount,
        // Generate example cURL command
        curlExample: workflow.isPublished && workflow.webhookSecret
          ? `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Secret: ${workflow.webhookSecret}" \\
  -d '{"event": "test", "data": {"key": "value"}}'`
          : null,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get deployment status', { error: error.message });

    return NextResponse.json(
      { error: 'Failed to get deployment status', message: error.message },
      { status: 500 }
    );
  }
}
