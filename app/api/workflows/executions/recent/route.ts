/**
 * RECENT EXECUTIONS API
 *
 * Get recent workflow executions for dashboard widget
 *
 * GET /api/workflows/executions/recent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflowExecutions, workflows } from '@/lib/db/schema-workflows';
import { eq, desc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/executions/recent
 *
 * Get recent workflow executions
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    const db = getDb();

    // Get recent executions with workflow names
    const result = await db.execute(sql`
      SELECT
        we.id,
        we.workflow_id as "workflowId",
        w.name as "pipelineName",
        we.status,
        we.started_at as "startedAt",
        we.completed_at as "completedAt",
        we.duration_ms as "durationMs",
        we.error,
        we.is_test as "isTest"
      FROM workflow_executions we
      LEFT JOIN workflows w ON we.workflow_id = w.id
      WHERE we.user_id = ${userId}
      ORDER BY we.created_at DESC
      LIMIT ${limit}
    `);

    const executions = (result.rows || result || []).map((row: any) => ({
      id: row.id,
      workflowId: row.workflowId,
      pipelineName: row.pipelineName || 'Unknown Pipeline',
      status: row.status || 'pending',
      startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : new Date().toISOString(),
      completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
      durationMs: row.durationMs ? parseInt(row.durationMs, 10) : null,
      error: row.error,
      isTest: row.isTest ?? true,
    }));

    return NextResponse.json(executions);

  } catch (error: any) {
    console.error('[RECENT_EXECUTIONS] Error:', error);

    // Return empty array on error to not break the dashboard
    return NextResponse.json([]);
  }
}
