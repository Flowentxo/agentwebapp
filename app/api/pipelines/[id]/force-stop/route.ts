/**
 * Pipeline Force-Stop API
 *
 * Emergency kill switch to immediately stop ALL running executions
 * for a specific pipeline. Part of Phase 2: Enterprise Features.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { cancelPipelineExecution } from "@/server/lib/pipeline-queue";
import { emitWorkflowUpdate } from "@/server/socket";
import { createLogger } from "@/lib/logger";

const logger = createLogger('pipeline-force-stop');

async function getAuthenticatedUser(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  try {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}

/**
 * POST - Force stop ALL running executions for this pipeline
 * This is an emergency action that immediately cancels all executions.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      logger.warn('Unauthorized force-stop attempt', { pipelineId: params.id });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const pipelineId = params.id;

    logger.warn('Force-stop initiated', {
      pipelineId,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Verify pipeline belongs to user
    const [pipeline] = await db.execute(sql`
      SELECT id, name FROM workflows
      WHERE id = ${pipelineId} AND user_id = ${user.id}
    `) as { id: string; name: string }[];

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Get all running/pending executions for this pipeline
    const runningExecutions = await db.execute(sql`
      SELECT id, status
      FROM workflow_executions
      WHERE workflow_id = ${pipelineId}
        AND status IN ('pending', 'running', 'waiting_approval')
    `) as { id: string; status: string }[];

    if (!runningExecutions || runningExecutions.length === 0) {
      return NextResponse.json({
        success: true,
        stoppedCount: 0,
        message: 'No running executions to stop',
      });
    }

    const stoppedExecutions: string[] = [];
    const failedToStop: string[] = [];

    // Cancel each execution
    for (const execution of runningExecutions) {
      try {
        // Try to cancel via BullMQ queue
        try {
          await cancelPipelineExecution(execution.id);
        } catch (queueError) {
          logger.debug('Queue cancellation skipped (might not be in queue)', {
            executionId: execution.id,
          });
        }

        // Force update status in database
        await db.execute(sql`
          UPDATE workflow_executions
          SET
            status = 'error',
            error = 'Force-stopped by user (Emergency Kill Switch)',
            completed_at = NOW()
          WHERE id = ${execution.id}
        `);

        // Emit cancellation event via Socket.IO
        try {
          emitWorkflowUpdate({
            workflowId: pipelineId,
            executionId: execution.id,
            status: 'failed',
            error: 'Force-stopped by user',
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Socket might not be available
        }

        stoppedExecutions.push(execution.id);
      } catch (error) {
        logger.error('Failed to stop execution', {
          executionId: execution.id,
          error: (error as Error).message,
        });
        failedToStop.push(execution.id);
      }
    }

    // Log audit trail
    try {
      await db.execute(sql`
        INSERT INTO activity_logs (
          id,
          user_id,
          type,
          action,
          resource_type,
          resource_id,
          metadata,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          ${user.id},
          'security',
          'force_stop',
          'pipeline',
          ${pipelineId},
          ${JSON.stringify({
            stoppedCount: stoppedExecutions.length,
            failedCount: failedToStop.length,
            executionIds: stoppedExecutions,
            timestamp: new Date().toISOString(),
          })}::jsonb,
          NOW()
        )
      `);
    } catch (auditError) {
      // Audit logging is non-critical
      logger.debug('Audit log skipped', { error: (auditError as Error).message });
    }

    logger.info('Force-stop completed', {
      pipelineId,
      stoppedCount: stoppedExecutions.length,
      failedCount: failedToStop.length,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      stoppedCount: stoppedExecutions.length,
      failedCount: failedToStop.length,
      stoppedExecutions,
      failedToStop,
      message: `${stoppedExecutions.length} execution(s) stopped`,
    });
  } catch (error: any) {
    logger.error('Force-stop failed', {
      pipelineId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to force-stop pipeline", details: error.message },
      { status: 500 }
    );
  }
}
