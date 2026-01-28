import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ProfileErrorCode } from '@/lib/profile/schemas';
import { confirmEmailChange } from '@/lib/profile/service';

const confirmEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/profile/confirm-email
 * Confirm email change with verification token
 */
export async function POST(request: NextRequest) {
  try {
    // Validate input
    const body = await request.json();
    const parseResult = confirmEmailSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: ProfileErrorCode.INVALID,
            message: 'Invalid input',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const result = await confirmEmailChange(parseResult.data.token);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: ProfileErrorCode.TOKEN_INVALID,
          message: error.message || 'Failed to confirm email change',
        },
      },
      { status: 400 }
    );
  }
}
