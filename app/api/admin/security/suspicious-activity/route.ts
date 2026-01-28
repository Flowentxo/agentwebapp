/**
 * API Route: Suspicious Activity
 * GET /api/admin/security/suspicious-activity
 * Returns filtered suspicious activity events from audit logs
 * Requires admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { adminAuditLogs } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth/session';
import { eq, and, gte, desc, or, ilike, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require admin session
    await requireSession({ requireRoles: ['admin'] });

    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';
    const severity = searchParams.get('severity') || 'all';
    const status = searchParams.get('status') || 'all';
    const searchQuery = searchParams.get('search') || '';

    const db = getDb();
    const now = new Date();

    // Calculate time range
    const timeRangeMs: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const cutoffTime = timeRange !== 'all'
      ? new Date(now.getTime() - (timeRangeMs[timeRange] || timeRangeMs['24h']))
      : new Date(0);

    // Build query conditions
    const conditions = [
      eq(adminAuditLogs.category, 'security'),
      gte(adminAuditLogs.createdAt, cutoffTime),
    ];

    // Filter by status
    if (status !== 'all') {
      conditions.push(eq(adminAuditLogs.status, status));
    }

    // Execute query
    let events = await db
      .select({
        id: adminAuditLogs.id,
        userId: adminAuditLogs.userId,
        userEmail: adminAuditLogs.userEmail,
        action: adminAuditLogs.action,
        description: adminAuditLogs.description,
        ipAddress: adminAuditLogs.ipAddress,
        userAgent: adminAuditLogs.userAgent,
        status: adminAuditLogs.status,
        metadata: adminAuditLogs.metadata,
        createdAt: adminAuditLogs.createdAt,
      })
      .from(adminAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(100);

    // Filter by search query in-memory (for flexibility)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      events = events.filter(
        (event) =>
          event.userEmail?.toLowerCase().includes(query) ||
          event.ipAddress?.toLowerCase().includes(query) ||
          event.id.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.action.toLowerCase().includes(query)
      );
    }

    // Transform events for frontend compatibility
    const transformedEvents = events.map(event => ({
      id: event.id,
      timestamp: event.createdAt?.toISOString() || new Date().toISOString(),
      userEmail: event.userEmail || event.userId,
      ipAddress: event.ipAddress || 'unknown',
      eventType: event.action,
      description: event.description || event.action,
      status: event.status || 'pending',
      severity: determineSeverity(event.action, event.status || 'pending'),
      metadata: event.metadata,
      userAgent: event.userAgent,
    }));

    return NextResponse.json({
      success: true,
      events: transformedEvents,
      total: transformedEvents.length,
      filters: {
        timeRange,
        severity,
        status,
        searchQuery,
      },
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[SUSPICIOUS_ACTIVITY]', error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch suspicious activities' },
      { status: 500 }
    );
  }
}

/**
 * Determine severity based on action type and status
 */
function determineSeverity(action: string, status: string): 'critical' | 'high' | 'medium' | 'low' {
  const actionLower = action.toLowerCase();

  if (status === 'failed') {
    if (actionLower.includes('login') || actionLower.includes('auth')) {
      return 'high';
    }
    return 'medium';
  }

  if (actionLower.includes('force_logout') || actionLower.includes('delete') || actionLower.includes('remove')) {
    return 'critical';
  }

  if (actionLower.includes('login') || actionLower.includes('password') || actionLower.includes('role')) {
    return 'high';
  }

  if (actionLower.includes('update') || actionLower.includes('create')) {
    return 'medium';
  }

  return 'low';
}
