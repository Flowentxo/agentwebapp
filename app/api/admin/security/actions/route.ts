/**
 * API Route: Security Actions
 * POST /api/admin/security/actions - Execute security actions (block, review, dismiss)
 * Requires admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { adminAuditLogs } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';
import { adminAuditService } from '@/server/services/AdminAuditService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Require admin session
    const session = await requireSession({ requireRoles: ['admin'] });

    const body = await request.json();
    const { action, eventId, reason, duration, comment } = body;

    if (!eventId || !action) {
      return NextResponse.json(
        { success: false, error: 'Event ID and action are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Find the event in audit logs
    const [event] = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.id, eventId))
      .limit(1);

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const now = new Date();

    switch (action) {
      case 'block':
        // Update the event
        await db
          .update(adminAuditLogs)
          .set({
            status: 'blocked',
            metadata: {
              ...((event.metadata as Record<string, any>) || {}),
              reviewedBy: session.user.email,
              reviewedAt: now.toISOString(),
              blockReason: reason,
              blockDuration: duration,
            },
            updatedAt: now,
          })
          .where(eq(adminAuditLogs.id, eventId));

        // Log the action
        await adminAuditService.logSecurityAction({
          userId: session.userId,
          userEmail: session.user.email,
          action: 'security_event_blocked',
          targetType: 'audit_log',
          targetId: eventId,
          description: `Blocked security event: ${event.action}${reason ? ` - Reason: ${reason}` : ''}`,
          metadata: { originalEvent: event, blockReason: reason, blockDuration: duration },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
          success: true,
          message: 'Event wurde blockiert',
          event: { ...event, status: 'blocked' },
        });

      case 'review':
        await db
          .update(adminAuditLogs)
          .set({
            status: 'reviewed',
            metadata: {
              ...((event.metadata as Record<string, any>) || {}),
              reviewedBy: session.user.email,
              reviewedAt: now.toISOString(),
              reviewComment: comment,
            },
            updatedAt: now,
          })
          .where(eq(adminAuditLogs.id, eventId));

        await adminAuditService.logSecurityAction({
          userId: session.userId,
          userEmail: session.user.email,
          action: 'security_event_reviewed',
          targetType: 'audit_log',
          targetId: eventId,
          description: `Reviewed security event: ${event.action}${comment ? ` - Comment: ${comment}` : ''}`,
          metadata: { originalEvent: event, reviewComment: comment },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
          success: true,
          message: 'Event wurde als überprüft markiert',
          event: { ...event, status: 'reviewed' },
        });

      case 'dismiss':
        await db
          .update(adminAuditLogs)
          .set({
            status: 'dismissed',
            metadata: {
              ...((event.metadata as Record<string, any>) || {}),
              reviewedBy: session.user.email,
              reviewedAt: now.toISOString(),
              dismissReason: reason,
            },
            updatedAt: now,
          })
          .where(eq(adminAuditLogs.id, eventId));

        await adminAuditService.logSecurityAction({
          userId: session.userId,
          userEmail: session.user.email,
          action: 'security_event_dismissed',
          targetType: 'audit_log',
          targetId: eventId,
          description: `Dismissed security event: ${event.action}`,
          metadata: { originalEvent: event },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        });

        return NextResponse.json({
          success: true,
          message: 'Event wurde verworfen',
          event: { ...event, status: 'dismissed' },
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: block, review, or dismiss' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[SECURITY_ACTIONS]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}
