/**
 * API Route: Get user context
 * GET /api/command-center/context
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserContext } from '@/lib/command-center/context-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'default-user';

    // Get session data from headers
    const sessionStartTime = req.headers.get('x-session-start');
    const commandCount = req.headers.get('x-command-count');
    const deviceType = req.headers.get('x-device-type');
    const currentPage = req.headers.get('x-current-page');

    const sessionData = {
      startTime: sessionStartTime ? new Date(sessionStartTime) : undefined,
      commandCount: commandCount ? parseInt(commandCount) : undefined,
      deviceType: deviceType || undefined,
      currentPage: currentPage || undefined,
    };

    // Get user context
    const context = await getUserContext(userId, sessionData);

    return NextResponse.json({
      context,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Context error:', error);
    return NextResponse.json(
      { error: 'Failed to get user context' },
      { status: 500 }
    );
  }
}
