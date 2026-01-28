import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { sessions, users, userRoles, adminAuditLogs } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { eq, and, gt, isNull, sql, desc, gte, lt, count } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/security/overview
 * Real security metrics from database
 * Requires admin role
 */
export async function GET(request: Request) {
  try {
    // Require admin session
    await requireSession({ requireRoles: ['admin'] });

    const db = getDb();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get active sessions count
    const [activeSessionsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(
        and(
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now)
        )
      );
    const activeSessions = Number(activeSessionsResult.count);

    // Get total users count
    const [totalUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true));
    const totalUsers = Number(totalUsersResult.count);

    // Get admin users count
    const [adminUsersResult] = await db
      .select({ count: sql<number>`count(DISTINCT user_id)` })
      .from(userRoles)
      .where(eq(userRoles.role, 'admin'));
    const adminUsers = Number(adminUsersResult.count);

    // Get sessions expiring soon (within 48h)
    const expiringWithin48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const [expiringSessionsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(
        and(
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
          lt(sessions.expiresAt, expiringWithin48h)
        )
      );
    const expiringSessions = Number(expiringSessionsResult.count);

    // Get users without MFA
    const [noMfaResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          eq(users.mfaEnabled, false)
        )
      );
    const usersWithoutMfa = Number(noMfaResult.count);

    // Get recent security events from audit logs (if table exists)
    let securityEvents: Array<{ action: string; count: number }> = [];
    let failedLogins = 0;
    let suspiciousActivity = { count: 0, lastDetected: null as string | null };

    try {
      // Try to get audit data if the table exists
      const securityAuditLogs = await db
        .select({
          action: adminAuditLogs.action,
          count: sql<number>`count(*)`,
        })
        .from(adminAuditLogs)
        .where(
          and(
            eq(adminAuditLogs.category, 'security'),
            gte(adminAuditLogs.createdAt, sevenDaysAgo)
          )
        )
        .groupBy(adminAuditLogs.action)
        .limit(10);

      securityEvents = securityAuditLogs.map(e => ({
        action: e.action,
        count: Number(e.count),
      }));

      // Get failed login count
      const failedEvent = securityEvents.find(e =>
        e.action.toLowerCase().includes('failed') ||
        e.action.toLowerCase().includes('login')
      );
      failedLogins = failedEvent?.count || 0;

      // Get suspicious activity
      const [suspiciousResult] = await db
        .select({
          count: sql<number>`count(*)`,
          lastDetected: sql<string>`MAX(created_at)`,
        })
        .from(adminAuditLogs)
        .where(
          and(
            eq(adminAuditLogs.category, 'security'),
            eq(adminAuditLogs.status, 'failed'),
            gte(adminAuditLogs.createdAt, sevenDaysAgo)
          )
        );

      suspiciousActivity = {
        count: Number(suspiciousResult.count),
        lastDetected: suspiciousResult.lastDetected || null,
      };
    } catch (e) {
      // Audit table might not exist yet, use defaults
      console.log('[SECURITY_OVERVIEW] Audit table not available');
    }

    // Build policy check issues
    const issues: string[] = [];
    if (expiringSessions > 0) {
      issues.push(`${expiringSessions} Sessions laufen in 48h ab`);
    }
    if (usersWithoutMfa > 0 && adminUsers > 0) {
      issues.push(`${usersWithoutMfa} Benutzer ohne MFA aktiviert`);
    }
    if (adminUsers > 3) {
      issues.push(`${adminUsers} Admin-Accounts vorhanden (Empfehlung: max. 3)`);
    }

    return NextResponse.json({
      activeSessions,
      totalUsers,
      adminUsers,
      activeTokens: activeSessions, // Sessions are tokens in this context
      failedLogins,
      lastPolicyCheck: {
        timestamp: now.toISOString(),
        status: issues.length === 0 ? "passed" : issues.length < 3 ? "warning" : "critical",
        issues,
      },
      suspiciousActivity,
      securityEvents,
      mfaStats: {
        enabled: totalUsers - usersWithoutMfa,
        disabled: usersWithoutMfa,
        percentage: totalUsers > 0 ? Math.round(((totalUsers - usersWithoutMfa) / totalUsers) * 100) : 0,
      },
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[SECURITY_OVERVIEW]", error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch security overview" },
      { status: 500 }
    );
  }
}
