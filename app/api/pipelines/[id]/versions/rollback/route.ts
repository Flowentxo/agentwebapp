/**
 * Pipeline Version Rollback API
 *
 * Phase 8: Versioning & Deployment Lifecycle
 *
 * POST /api/pipelines/[id]/versions/rollback
 * Rolls back the live/published version to a previous version
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { workflows } from '@/lib/db/schema-workflows';
import { eq } from 'drizzle-orm';
import { WorkflowVersionService } from '@/server/services/WorkflowVersionService';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:pipelines:versions:rollback');

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
// POST - Rollback to Version
// ============================================================================

export async function POST(
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
    const { versionId, reason } = body;

    if (!versionId) {
      return NextResponse.json(
        { success: false, error: 'versionId is required' },
        { status: 400 }
      );
    }

    // Verify workflow exists
    const db = getDb();
    const [workflow] = await db
      .select({ id: workflows.id, userId: workflows.userId })
      .from(workflows)
      .where(eq(workflows.id, workflowId))
      .limit(1);

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get version info
    const version = await WorkflowVersionService.getVersion(versionId);
    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    // Rollback
    await WorkflowVersionService.rollbackToVersion(
      workflowId,
      versionId,
      user.id,
      reason
    );

    logger.info('Version rolled back', {
      workflowId,
      versionId,
      versionNumber: version.versionNumber,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Rolled back to version ${version.versionNumber}`,
        rolledBackVersion: {
          id: version.id,
          versionNumber: version.versionNumber,
        },
      },
    });
  } catch (error) {
    logger.error('Error rolling back version', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rollback version',
      },
      { status: 500 }
    );
  }
}
