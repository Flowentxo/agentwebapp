import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { sessions } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { isNull } from "drizzle-orm";
import { adminAuditService } from "@/server/services/AdminAuditService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/security/force-logout
 * Force logout all users by revoking all active sessions
 * Requires admin role
 */
export async function POST(request: Request) {
  try {
    // Require admin session
    const session = await requireSession({ requireRoles: ['admin'] });

    const db = getDb();
    const now = new Date();

    // Count active sessions before revoking
    const activeSessions = await db
      .select()
      .from(sessions)
      .where(isNull(sessions.revokedAt));

    const activeCount = activeSessions.length;

    // Revoke all sessions except the current admin session
    const currentSessionId = session.sessionId;
    let revokedCount = 0;

    for (const sess of activeSessions) {
      // Skip current admin session
      if (sess.id === currentSessionId) {
        continue;
      }

      await db
        .update(sessions)
        .set({
          revokedAt: now,
          updatedAt: now,
        })
        .where(isNull(sessions.revokedAt));

      revokedCount++;
    }

    // Log the action
    await adminAuditService.logSecurityAction({
      userId: session.userId,
      userEmail: session.user.email,
      action: 'force_logout_all',
      targetType: 'sessions',
      targetId: 'all',
      targetName: 'All User Sessions',
      description: `Force logout of ${revokedCount} sessions executed`,
      metadata: {
        totalActiveBeforeLogout: activeCount,
        revokedCount,
        excludedCurrentSession: true,
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: `${revokedCount} Sessions wurden beendet`,
      revokedCount,
      totalBefore: activeCount,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[FORCE_LOGOUT]", error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to force logout users" },
      { status: 500 }
    );
  }
}
