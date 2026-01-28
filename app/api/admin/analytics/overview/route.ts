/**
 * Admin Analytics - System Overview
 * GET - Get system-wide overview statistics
 *
 * Protected by admin middleware with rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAnalyticsService } from '@/server/services/AdminAnalyticsService';
import { validateAdminRequest, AdminErrors } from '@/lib/middleware/adminMiddleware';
import { cachedQuery, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/analyticsCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/overview
 * Get system-wide overview statistics
 *
 * Requires admin authentication
 * Rate limited: 30 requests/minute
 * Cached: 5 minutes
 */
export async function GET(req: NextRequest) {
  // Validate admin access with rate limiting
  const validation = await validateAdminRequest(req, {
    rateLimit: 'ADMIN_ANALYTICS',
    requireAuth: true,
    requiredRoles: ['admin'],
  });

  if (!validation.success) {
    return validation.response || AdminErrors.unauthorized();
  }

  try {
    // Check for force refresh
    const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';

    // Use cached query for expensive analytics
    const overview = await cachedQuery(
      CACHE_KEYS.systemOverview(),
      () => adminAnalyticsService.getSystemOverview(),
      {
        ttl: CACHE_TTL.METRICS,
        forceRefresh,
      }
    );

    return NextResponse.json({
      success: true,
      data: overview,
      meta: {
        cached: !forceRefresh,
        requestedBy: validation.context?.userId,
      },
    });
  } catch (error) {
    console.error('[ADMIN_ANALYTICS_OVERVIEW]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch system overview',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
