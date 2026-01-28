/**
 * GET /api/audit
 * Retrieve audit logs for the current user
 *
 * Query Parameters:
 * - limit: Max number of entries (default 50, max 100)
 * - offset: Pagination offset (default 0)
 * - action: Filter by specific action type
 * - from: Filter by start date (ISO string)
 * - to: Filter by end date (ISO string)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthErrorCode, type ApiResponse } from '@/lib/auth/types';
import { getSession } from '@/lib/auth/session';
import {
  getAuditLogs,
  countAuditLogs,
  getActionDescription,
  getActionIcon,
  type AuditLogEntry,
} from '@/lib/auth/audit';
import type { AuditAction } from '@/lib/db/schema';

export const runtime = 'nodejs';

// Query params schema
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Response type for API
export interface AuditLogResponse {
  id: string;
  action: string;
  actionLabel: string;
  actionIcon: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

export interface AuditLogsListResponse {
  logs: AuditLogResponse[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * GET /api/audit
 * Get audit logs for the current user
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AuditLogsListResponse>>> {
  try {
    // Verify user is authenticated
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.UNAUTHORIZED,
            message: 'You must be logged in to view audit logs',
          },
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const rawParams = {
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
      action: url.searchParams.get('action'),
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to'),
    };

    // Remove null values for Zod parsing
    const cleanParams = Object.fromEntries(
      Object.entries(rawParams).filter(([_, v]) => v !== null)
    );

    const parseResult = querySchema.safeParse(cleanParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: AuthErrorCode.VALIDATION_ERROR,
            message: 'Invalid query parameters',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { limit, offset, action, from, to } = parseResult.data;

    // Build filter params
    const filterParams = {
      userId: sessionData.user.id,
      action: action as AuditAction | undefined,
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
      limit,
      offset,
    };

    // Fetch logs and count in parallel
    const [logs, total] = await Promise.all([
      getAuditLogs(filterParams),
      countAuditLogs({
        userId: filterParams.userId,
        action: filterParams.action,
        fromDate: filterParams.fromDate,
        toDate: filterParams.toDate,
      }),
    ]);

    // Get user's locale preference (default to German)
    const locale = sessionData.user.locale?.startsWith('en') ? 'en' : 'de';

    // Transform for response
    const transformedLogs: AuditLogResponse[] = logs.map((log: AuditLogEntry) => ({
      id: log.id,
      action: log.action,
      actionLabel: getActionDescription(log.action as AuditAction, locale as 'de' | 'en'),
      actionIcon: getActionIcon(log.action as AuditAction),
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      ip: log.ip,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        logs: transformedLogs,
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    console.error('[Audit] Get logs error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: AuthErrorCode.INTERNAL_ERROR,
          message: 'Failed to retrieve audit logs',
        },
      },
      { status: 500 }
    );
  }
}
