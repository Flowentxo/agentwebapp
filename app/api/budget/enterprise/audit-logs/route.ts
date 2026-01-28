/**
 * Enterprise Audit Logs API
 * GET /api/budget/enterprise/audit-logs
 *
 * Provides access to audit logs for compliance and monitoring
 * Supports filtering by date range, action, resource type, severity
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/server/services/BudgetService';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/budget/enterprise/audit-logs
 * List audit logs with filtering options
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role (optional - depends on your auth setup)
    // For now, users can only see their own audit logs
    const isAdmin = session.user.role === 'admin';

    const { searchParams } = new URL(req.url);

    // Parse filter parameters
    const filters = {
      userId: isAdmin ? searchParams.get('userId') || undefined : session.user.id,
      action: searchParams.get('action') || undefined,
      actionCategory: searchParams.get('actionCategory') || undefined,
      resourceType: searchParams.get('resourceType') || undefined,
      resourceId: searchParams.get('resourceId') || undefined,
      severity: searchParams.get('severity') || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    // Validate date range (max 90 days for non-admins)
    if (!isAdmin && filters.startDate && filters.endDate) {
      const daysDiff = Math.ceil(
        (filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > 90) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Date range cannot exceed 90 days' },
          { status: 400 }
        );
      }
    }

    // Fetch audit logs
    const logs = await budgetService.getAuditLogs(filters);

    // Group by action category for summary
    const summary = logs.reduce((acc, log) => {
      const category = log.actionCategory;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by severity
    const severityCounts = logs.reduce((acc, log) => {
      const severity = log.severity;
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log.id,
          userId: log.userId,
          userEmail: log.userEmail,
          userRole: log.userRole,
          action: log.action,
          actionCategory: log.actionCategory,
          severity: log.severity,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          resourceName: log.resourceName,
          previousValue: log.previousValue,
          newValue: log.newValue,
          changeDescription: log.changeDescription,
          ipAddress: isAdmin ? log.ipAddress : undefined, // Only admins see IP
          createdAt: log.createdAt,
          metadata: log.metadata,
        })),
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: logs.length, // Note: Would need a separate count query for accurate total
          hasMore: logs.length === filters.limit,
        },
        summary: {
          byCategory: summary,
          bySeverity: severityCounts,
          totalInRange: logs.length,
        },
      },
    });
  } catch (error: any) {
    console.error('[API] Audit logs GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/budget/enterprise/audit-logs
 * Manually create an audit log entry (for custom events)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      action,
      actionCategory,
      resourceType,
      resourceId,
      resourceName,
      previousValue,
      newValue,
      changeDescription,
      severity = 'info',
      metadata,
    } = body;

    // Validate required fields
    if (!action || !actionCategory || !resourceType || !resourceId) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'action, actionCategory, resourceType, and resourceId are required',
        },
        { status: 400 }
      );
    }

    // Validate actionCategory
    const validCategories = [
      'budget_change',
      'limit_update',
      'top_up',
      'allocation',
      'project_change',
      'cost_center_change',
      'user_action',
      'system_action',
      'security',
    ];
    if (!validCategories.includes(actionCategory)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `actionCategory must be one of: ${validCategories.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Create audit log
    await budgetService.logAuditAction(
      action,
      actionCategory,
      resourceType,
      resourceId,
      {
        userId: session.user.id,
        userEmail: session.user.email,
        userRole: session.user.role || 'user',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      },
      {
        severity,
        resourceName,
        previousValue,
        newValue,
        changeDescription,
        metadata,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Audit log created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Audit logs POST error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
