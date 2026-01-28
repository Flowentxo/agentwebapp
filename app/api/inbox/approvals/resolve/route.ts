import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { inboxApprovals, inboxMessages, inboxThreads } from '@/lib/db/schema-inbox';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

/**
 * POST /api/inbox/approvals/resolve
 *
 * Resolves a pending approval (approve or reject)
 */
export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getSession();
    const userId = session?.userId || 'demo-user';

    // Parse request body
    const body = await req.json();
    const { threadId, approvalId, action, comment } = body;

    if (!approvalId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: approvalId and action' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get the approval
    const [approval] = await db
      .select()
      .from(inboxApprovals)
      .where(eq(inboxApprovals.id, approvalId))
      .limit(1);

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: `Approval is already ${approval.status}` },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date();

    // Update the approval
    const [updatedApproval] = await db
      .update(inboxApprovals)
      .set({
        status: newStatus,
        resolvedBy: userId,
        resolvedAt: now,
        comment: comment || null,
        updatedAt: now,
      })
      .where(eq(inboxApprovals.id, approvalId))
      .returning();

    // Update the associated message
    if (approval.messageId) {
      const [message] = await db
        .select()
        .from(inboxMessages)
        .where(eq(inboxMessages.id, approval.messageId))
        .limit(1);

      if (message) {
        const existingApproval = message.approval || {};
        await db
          .update(inboxMessages)
          .set({
            approval: {
              ...existingApproval,
              status: newStatus,
              resolvedAt: now.toISOString(),
              resolvedBy: userId,
              comment: comment || undefined,
            },
          })
          .where(eq(inboxMessages.id, approval.messageId));
      }
    }

    // Check for more pending approvals
    const pendingApprovals = await db
      .select()
      .from(inboxApprovals)
      .where(
        and(
          eq(inboxApprovals.threadId, approval.threadId),
          eq(inboxApprovals.status, 'pending')
        )
      )
      .limit(1);

    // Update thread status
    await db
      .update(inboxThreads)
      .set({
        status: pendingApprovals.length > 0 ? 'suspended' : 'active',
        pendingApprovalId: pendingApprovals.length > 0 ? pendingApprovals[0].id : null,
        updatedAt: now,
      })
      .where(eq(inboxThreads.id, approval.threadId));

    // Add system message about the resolution
    await db.insert(inboxMessages).values({
      threadId: approval.threadId,
      role: 'system',
      type: 'system_event',
      content: action === 'approve'
        ? `Tool action approved${comment ? `: ${comment}` : ''}`
        : `Tool action rejected${comment ? `: ${comment}` : ''}`,
      metadata: {
        eventType: action === 'approve' ? 'approval_granted' : 'approval_rejected',
        approvedBy: userId,
        approvalId: approvalId,
        details: comment || undefined,
      },
      isStreaming: false,
      isOptimistic: false,
    });

    // If approved, execute the tool action (mock for now)
    let executionResult = null;
    if (action === 'approve') {
      // TODO: Integrate with actual tool execution service
      executionResult = {
        status: 'queued',
        message: 'Tool action has been queued for execution',
        queuedAt: now.toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      approval: updatedApproval,
      executionResult,
    });
  } catch (error) {
    console.error('[API] Approval resolution error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve approval' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inbox/approvals/resolve
 *
 * Get pending approvals for a thread
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json(
        { error: 'Missing threadId parameter' },
        { status: 400 }
      );
    }

    const db = getDb();

    const approvals = await db
      .select()
      .from(inboxApprovals)
      .where(eq(inboxApprovals.threadId, threadId));

    return NextResponse.json({
      approvals,
      pending: approvals.filter((a) => a.status === 'pending'),
      resolved: approvals.filter((a) => a.status !== 'pending'),
    });
  } catch (error) {
    console.error('[API] Get approvals error:', error);
    return NextResponse.json(
      { error: 'Failed to get approvals' },
      { status: 500 }
    );
  }
}
