/**
 * POST /api/auth/sudo/timeout
 * Update user's sudo session timeout preference
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { updateSudoTimeout, SUDO_TIMEOUT_OPTIONS, type SudoTimeoutValue } from '@/lib/auth/sudo';

export const runtime = 'nodejs';

// Valid timeout values
const validTimeouts = SUDO_TIMEOUT_OPTIONS.map(o => o.value) as [number, ...number[]];

const bodySchema = z.object({
  timeout: z.number().refine(
    (val): val is SudoTimeoutValue => validTimeouts.includes(val as SudoTimeoutValue),
    { message: 'Invalid timeout value' }
  ),
});

interface SudoTimeoutResponse {
  ok: boolean;
  data?: {
    timeout: number;
    message: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SudoTimeoutResponse>> {
  try {
    // User must be authenticated
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in',
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const parseResult = bodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid timeout value',
          },
        },
        { status: 400 }
      );
    }

    const { timeout } = parseResult.data;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || undefined;

    // Update timeout
    const success = await updateSudoTimeout(
      sessionData.userId,
      timeout,
      { ip, userAgent }
    );

    if (!success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update timeout setting',
          },
        },
        { status: 500 }
      );
    }

    // Find label for response
    const option = SUDO_TIMEOUT_OPTIONS.find(o => o.value === timeout);

    return NextResponse.json({
      ok: true,
      data: {
        timeout,
        message: `Timeout auf "${option?.label || timeout + ' Minuten'}" gesetzt`,
      },
    });
  } catch (error) {
    console.error('[SUDO_TIMEOUT] Update error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update timeout setting',
        },
      },
      { status: 500 }
    );
  }
}
