/**
 * Brain AI v3.0 - Join Meeting API
 *
 * POST /api/brain/meetings/join
 * Sends a bot to join a meeting for recording and transcription
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { meetingBotService } from '@/lib/brain/MeetingBotService';

export async function POST(req: NextRequest) {
  try {
    // Try to get session, but allow development mode without auth
    let workspaceId = 'default';
    let userId = 'demo-user';

    try {
      const session = await getSession();
      if (session?.user) {
        workspaceId = session.user.workspaceId || 'default';
        userId = session.user.id || 'demo-user';
      }
    } catch {
      // Session not available, use defaults for development
      console.log('[MEETINGS_JOIN] Using development defaults');
    }
    const { meetingUrl, botName } = await req.json();

    if (!meetingUrl) {
      return NextResponse.json(
        { error: 'Meeting URL is required' },
        { status: 400 }
      );
    }

    // Validate meeting URL
    const platform = meetingBotService.detectPlatform(meetingUrl);
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported meeting platform. Supported: Zoom, Google Meet, Microsoft Teams, Webex' },
        { status: 400 }
      );
    }

    // Join the meeting
    const bot = await meetingBotService.joinMeeting(
      workspaceId,
      userId,
      meetingUrl,
      { botName }
    );

    // Return meeting info
    return NextResponse.json({
      meeting: {
        id: bot.id,
        title: `Meeting - ${new Date().toLocaleDateString()}`,
        platform: bot.platform,
        status: bot.status,
        hasTranscript: false,
        hasSummary: false,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[MEETINGS_JOIN]', error);
    const message = error instanceof Error ? error.message : 'Failed to join meeting';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
