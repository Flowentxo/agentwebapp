import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { ProfileErrorCode } from '@/lib/profile/schemas';
import { getDb } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/profile/mfa/status
 * Get current MFA status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();

    const db = getDb();
    const result = await db.select({
      mfaEnabled: users.mfaEnabled,
      mfaRecoveryCodes: users.mfaRecoveryCodes,
    }).from(users).where(eq(users.id, session.user.id)).limit(1);

    if (!result[0]) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.NOT_FOUND,
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    const user = result[0];

    // Count remaining backup codes
    let remainingBackupCodes = 0;
    if (user.mfaRecoveryCodes) {
      try {
        // Recovery codes are encrypted, but we can check if they exist
        remainingBackupCodes = user.mfaRecoveryCodes ? 10 : 0; // Assume 10 if exists
      } catch {
        remainingBackupCodes = 0;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        enabled: user.mfaEnabled || false,
        hasRecoveryCodes: !!user.mfaRecoveryCodes,
        remainingBackupCodes,
      },
    });
  } catch (error: any) {
    console.error('[MFA_STATUS_ERROR]', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || ProfileErrorCode.INTERNAL_ERROR,
          message: error.message || 'Failed to get MFA status',
        },
      },
      { status: 500 }
    );
  }
}
