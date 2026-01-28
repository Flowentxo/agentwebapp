/**
 * Budget Alerts API
 * GET /api/budget/alerts - Get all alerts
 * PUT /api/budget/alerts/[id] - Mark alert as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { budgetService } from '@/server/services/BudgetService';
import { getSessionToken } from '@/lib/auth/cookies';
import { getSessionByToken } from '@/lib/auth/session';

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const token = await getSessionToken();
    if (token) {
      const session = await getSessionByToken(token);
      if (session?.userId) {
        return session.userId;
      }
    }
  } catch (error) {
    console.log('[AUTH] No valid session');
  }

  return 'default-user';
}

/**
 * GET /api/budget/alerts - Get alerts
 * Query params:
 *   - unreadOnly: boolean (default: true)
 *   - limit: number (default: 50)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ success: true, data: [], count: 0, unreadCount: 0 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') !== 'false'; // Default true
    const limit = parseInt(searchParams.get('limit') || '50');

    let alerts: any[] = [];
    try {
      if (unreadOnly) {
        alerts = await budgetService.getUnreadAlerts(userId);
      } else {
        alerts = await budgetService.getAllAlerts(userId, limit);
      }
    } catch (dbError) {
      console.warn('[ALERTS_GET] Database error, returning empty array:', dbError);
      // Return empty array if DB fails
    }

    return NextResponse.json({
      success: true,
      data: alerts.map((alert) => ({
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        currentUsage: alert.currentUsage,
        limit: alert.limit,
        isRead: alert.isRead,
        createdAt: alert.createdAt,
      })),
      count: alerts.length,
      unreadCount: alerts.filter(a => !a.isRead).length,
    });
  } catch (error) {
    console.error('[ALERTS_GET]', error);
    return NextResponse.json(
      { success: true, data: [], count: 0, unreadCount: 0 },
      { status: 200 }
    );
  }
}

/**
 * PUT /api/budget/alerts - Mark alert(s) as read
 * Body:
 *   - alertId: string (optional, marks single alert)
 *   - markAll: boolean (optional, marks all alerts as read)
 */
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId, markAll } = await req.json();

    if (markAll) {
      await budgetService.markAllAlertsAsRead(userId);
      return NextResponse.json({
        success: true,
        message: 'All alerts marked as read',
      });
    }

    if (alertId) {
      await budgetService.markAlertAsRead(alertId);
      return NextResponse.json({
        success: true,
        message: 'Alert marked as read',
      });
    }

    return NextResponse.json(
      { error: 'Either alertId or markAll must be provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[ALERT_PUT]', error);
    return NextResponse.json(
      { error: 'Failed to mark alert as read' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/budget/alerts - Clean up old alerts (30+ days)
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await budgetService.cleanupOldAlerts();

    return NextResponse.json({
      success: true,
      message: 'Old alerts cleaned up successfully',
    });
  } catch (error) {
    console.error('[ALERTS_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to clean up alerts' },
      { status: 500 }
    );
  }
}
