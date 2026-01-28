import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { adminAuditService, AdminActionCategory, ADMIN_ACTIONS } from "@/server/services/AdminAuditService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit
 * Get audit logs with optional filters
 * Requires admin role
 */
export async function GET(request: Request) {
  try {
    // Require admin session
    const session = await requireSession({ requireRoles: ['admin'] });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as AdminActionCategory | 'all' | null;
    const timeRange = searchParams.get("timeRange") as '1h' | '24h' | '7d' | '30d' | 'all' | null;
    const user = searchParams.get("user");
    const action = searchParams.get("action");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { logs, total } = await adminAuditService.getLogs({
      category: category || 'all',
      timeRange: timeRange || '24h',
      user: user || undefined,
      action: action || undefined,
      status: status || undefined,
      limit,
      offset,
    });

    // Transform logs to match frontend format
    const transformedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      user: log.userEmail,
      action: log.action,
      target: log.targetName || log.targetId || 'N/A',
      category: log.category,
      details: log.description,
      ipAddress: log.ipAddress,
      status: log.status,
    }));

    return NextResponse.json({
      logs: transformedLogs,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[ADMIN_AUDIT_GET]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/audit
 * Create a new audit log entry
 * Requires admin role
 */
export async function POST(request: Request) {
  try {
    // Require admin session
    const session = await requireSession({ requireRoles: ['admin'] });

    const body = await request.json();
    const { action, category, targetType, targetId, targetName, description, previousValue, newValue } = body;

    if (!action || !category) {
      return NextResponse.json(
        { error: 'action and category are required' },
        { status: 400 }
      );
    }

    // Get IP and User-Agent from request
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const log = await adminAuditService.log({
      userId: session.user.id,
      userEmail: session.user.email,
      action,
      category,
      targetType,
      targetId,
      targetName,
      description,
      previousValue,
      newValue,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error: any) {
    console.error('[ADMIN_AUDIT_POST]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}
