/**
 * Pipeline Live Status API
 *
 * Phase 8: Versioning & Deployment Lifecycle
 *
 * PATCH /api/pipelines/[id]/versions/status
 * Updates the live status of a workflow (active, inactive, archived)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { workflows } from '@/lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import { WorkflowVersionService } from '@/server/services/WorkflowVersionService';
import { LiveStatus } from '@/lib/db/schema-versions';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:pipelines:versions:status');

// ============================================================================
// AUTH HELPER
// ============================================================================

async function getAuthenticatedUser(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;

  try {
    const db = getDb();
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || { id: userId, email: 'demo@example.com' };
  } catch {
    return { id: userId, email: 'demo@example.com' };
  }
}

// ============================================================================
// PATCH - Update Live Status
// ============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: workflowId } = await params;
    const body = await req.json();
    const { status } = body;

    // Validate status
    const validStatuses: LiveStatus[] = ['active', 'inactive', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Verify workflow exists
    const db = getDb();
    const [workflow] = await db
      .select({
        id: workflows.id,
        userId: workflows.userId,
        publishedVersionId: workflows.publishedVersionId,
      })
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check if workflow has a published version before activating
    if (status === 'active' && !workflow.publishedVersionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot activate workflow without a published version. Please publish first.',
        },
        { status: 400 }
      );
    }

    // Update status
    await WorkflowVersionService.updateLiveStatus(workflowId, status, user.id);

    logger.info('Live status updated', {
      workflowId,
      status,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        workflowId,
        liveStatus: status,
      },
    });
  } catch (error) {
    logger.error('Error updating live status', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
      },
      { status: 500 }
    );
  }
}
