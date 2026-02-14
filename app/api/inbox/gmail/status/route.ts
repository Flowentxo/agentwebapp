/**
 * Gmail Connection Status API
 * GET /api/inbox/gmail/status
 *
 * Returns Gmail connection status and token health for the current user.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ connected: false, error: 'No user ID' }, { status: 401 });
    }

    // Try to import and use GmailUnifiedService
    try {
      const { GmailUnifiedService } = await import('@/server/services/GmailUnifiedService');
      const gmail = GmailUnifiedService.getInstance();
      const health = await gmail.getTokenHealth(userId);

      return NextResponse.json({
        connected: health.isConnected,
        email: health.isConnected ? undefined : undefined,
        health: {
          isConnected: health.isConnected,
          isValid: health.isValid,
          expiresAt: health.expiresAt?.toISOString(),
          expiresIn: health.expiresIn,
          needsRefresh: health.needsRefresh,
          lastRefreshed: health.lastRefreshed?.toISOString(),
          refreshAttempts: health.refreshAttempts,
          lastError: health.lastError,
        },
      });
    } catch {
      // GmailUnifiedService not available or no tokens
      return NextResponse.json({
        connected: false,
        health: null,
      });
    }
  } catch (error: any) {
    console.error('[GMAIL_STATUS] Error:', error);
    return NextResponse.json(
      { connected: false, error: error.message },
      { status: 500 }
    );
  }
}
