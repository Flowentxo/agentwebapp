/**
 * WORKFLOW APPROVALS LIST API
 *
 * Get pending approval requests for the current user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { workflowApprovalRequests, workflows, workflowExecutions } from '@/lib/db/schema-workflows';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('approvals-api');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/approvals
 *
 * Get all pending approval requests for the current user
 *
 * Query params:
 *   - status: 'pending' | 'approved' | 'rejected' | 'expired' | 'all'
 *   - limit: number (default 20)
 *   - offset: number (default 0)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const url = new URL(req.url);

    const status = url.searchParams.get('status') || 'pending';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const db = getDb();

    // Build query conditions
    let conditions: any[] = [
      // User is assigned OR user owns the workflow
      or(
        eq(workflowApprovalRequests.assignedUserId, userId),
        sql`${workflowApprovalRequests.assignedUserId} IS NULL`
      ),
    ];

    if (status !== 'all') {
      conditions.push(eq(workflowApprovalRequests.status, status as any));
    }

    // Get approval requests with workflow info
    const approvals = await db
      .select({
        approval: {
          id: workflowApprovalRequests.id,
          executionId: workflowApprovalRequests.executionId,
          workflowId: workflowApprovalRequests.workflowId,
          nodeId: workflowApprovalRequests.nodeId,
          status: workflowApprovalRequests.status,
          title: workflowApprovalRequests.title,
          message: workflowApprovalRequests.message,
          previewData: workflowApprovalRequests.previewData,
          assignedUserId: workflowApprovalRequests.assignedUserId,
          expiresAt: workflowApprovalRequests.expiresAt,
          resolvedBy: workflowApprovalRequests.resolvedBy,
          resolvedAt: workflowApprovalRequests.resolvedAt,
          createdAt: workflowApprovalRequests.createdAt,
        },
        workflow: {
          id: workflows.id,
          name: workflows.name,
        },
        execution: {
          id: workflowExecutions.id,
          status: workflowExecutions.status,
          isTest: workflowExecutions.isTest,
        },
      })
      .from(workflowApprovalRequests)
      .leftJoin(workflows, eq(workflowApprovalRequests.workflowId, workflows.id))
      .leftJoin(workflowExecutions, eq(workflowApprovalRequests.executionId, workflowExecutions.id))
      .where(and(...conditions))
      .orderBy(desc(workflowApprovalRequests.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowApprovalRequests)
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);

    // Get pending count specifically
    const pendingCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowApprovalRequests)
      .where(and(
        or(
          eq(workflowApprovalRequests.assignedUserId, userId),
          sql`${workflowApprovalRequests.assignedUserId} IS NULL`
        ),
        eq(workflowApprovalRequests.status, 'pending')
      ));

    const pendingCount = Number(pendingCountResult[0]?.count || 0);

    return NextResponse.json({
      approvals: approvals.map(a => ({
        ...a.approval,
        workflow: a.workflow,
        execution: a.execution,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + approvals.length < total,
      },
      stats: {
        pending: pendingCount,
      },
    });

  } catch (error: any) {
    logger.error('Failed to get approvals', { error: error.message });

    return NextResponse.json(
      { error: 'Failed to get approvals', message: error.message },
      { status: 500 }
    );
  }
}
