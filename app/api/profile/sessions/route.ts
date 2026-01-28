import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { ProfileErrorCode } from '@/lib/profile/schemas';
import { listSessions } from '@/lib/profile/service';

/**
 * GET /api/profile/sessions
 * List all active sessions for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();

    const sessions = await listSessions(session.user.id);

    return NextResponse.json({
      ok: true,
      data: sessions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || ProfileErrorCode.INTERNAL_ERROR,
          message: error.message || 'Failed to list sessions',
        },
      },
      { status: error.code === 'AUTH_UNAUTHORIZED' ? 401 : 500 }
    );
  }
}
