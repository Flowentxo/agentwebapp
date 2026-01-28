import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { ProfileErrorCode } from '@/lib/profile/schemas';
import { processLocalUpload, deleteOldAvatars } from '@/lib/profile/uploads';
import { getDb } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit, incrementRateLimit } from '@/lib/auth/rateLimit';
import { validateCsrfToken } from '@/lib/auth/csrf';

/**
 * POST /api/profile/avatar
 * Upload avatar image
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    // CSRF validation
    const csrfToken = request.headers.get('x-csrf-token');
    const csrfValid = await validateCsrfToken(csrfToken);

    if (!csrfValid) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'CSRF_INVALID',
            message: 'Invalid CSRF token',
          },
        },
        { status: 403 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimitKey = `profile:avatar:${session.user.id}:${ip}`;

    const rateLimit = await checkRateLimit(rateLimitKey, { maxAttempts: 3, windowMs: 60000 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.RATE_LIMITED,
            message: 'Too many avatar uploads',
          },
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    await incrementRateLimit(rateLimitKey, { maxAttempts: 3, windowMs: 60000 });

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.INVALID,
            message: 'No file provided',
          },
        },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process and upload
    const avatarUrl = await processLocalUpload(session.user.id, buffer, file.type);

    // Update user avatar in database
    const db = getDb();
    await db
      .update(users)
      .set({ avatarUrl: avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    // Cleanup old avatars
    await deleteOldAvatars(session.user.id, avatarUrl);

    return NextResponse.json({
      ok: true,
      data: { avatarUrl },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: ProfileErrorCode.UPLOAD_DENIED,
          message: error.message || 'Failed to upload avatar',
        },
      },
      { status: 500 }
    );
  }
}
