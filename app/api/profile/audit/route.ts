import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { ProfileErrorCode } from '@/lib/profile/schemas';
import { getAudit } from '@/lib/profile/service';

/**
 * GET /api/profile/audit
 * Get user audit log
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();

    // Get limit from query params (default 50, max 100)
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

    const auditLog = await getAudit(session.user.id, limit);

    return NextResponse.json({
      ok: true,
      data: auditLog,
    });
  } catch (error: any) {
    // Log detailed error for debugging
    console.error('[AUDIT_API] Error loading audit log:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    // Check if it's an authentication error
    if (error?.code === 'AUTH_UNAUTHORIZED' || error?.message?.includes('Unauthorized')) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'AUTH_UNAUTHORIZED',
            message: 'Please sign in to access this resource',
          },
        },
        { status: 401 }
      );
    }

    // Check if it's a database error (table doesn't exist)
    if (error?.message?.includes('relation') && error?.message?.includes('does not exist')) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.INTERNAL_ERROR,
            message: 'Audit system is being set up. Please try again later.',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || ProfileErrorCode.INTERNAL_ERROR,
          message: error.message || 'Failed to load audit log',
          // Include details in development
          ...(process.env.NODE_ENV === 'development' && { details: error?.message }),
        },
      },
      { status: 500 }
    );
  }
}
