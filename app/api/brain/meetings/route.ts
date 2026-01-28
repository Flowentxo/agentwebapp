/**
 * Brain AI v3.0 - Meetings API
 *
 * GET /api/brain/meetings - List all meetings
 * POST /api/brain/meetings - Create/join a meeting (not used, see /join)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { brainMeetingTranscripts } from '@/lib/db/schema-connected-intelligence';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      // For development, return empty list instead of 401
      return NextResponse.json({ meetings: [] });
    }

    const workspaceId = session.user.workspaceId || 'default';

    try {
      const db = getDb();

      // Get meetings from database using correct schema column names
      const meetings = await db
        .select({
          id: brainMeetingTranscripts.id,
          externalMeetingId: brainMeetingTranscripts.externalMeetingId,
          title: brainMeetingTranscripts.title,
          meetingPlatform: brainMeetingTranscripts.meetingPlatform,
          durationSeconds: brainMeetingTranscripts.durationSeconds,
          speakers: brainMeetingTranscripts.speakers,
          summary: brainMeetingTranscripts.summary,
          transcript: brainMeetingTranscripts.transcript,
          processingStatus: brainMeetingTranscripts.processingStatus,
          createdAt: brainMeetingTranscripts.createdAt,
        })
        .from(brainMeetingTranscripts)
        .where(eq(brainMeetingTranscripts.workspaceId, workspaceId))
        .orderBy(desc(brainMeetingTranscripts.createdAt))
        .limit(50);

      // Transform to frontend format
      const formattedMeetings = meetings.map(meeting => {
        const speakers = meeting.speakers as unknown[] | null;
        const transcript = meeting.transcript as string | null;

        // Map processing status to bot status
        const statusMap: Record<string, string> = {
          pending: 'joining',
          transcribing: 'recording',
          summarizing: 'processing',
          completed: 'done',
          failed: 'error',
        };

        return {
          id: meeting.externalMeetingId || meeting.id,
          title: meeting.title,
          platform: meeting.meetingPlatform || 'zoom',
          status: statusMap[meeting.processingStatus || 'pending'] || 'ready',
          duration: meeting.durationSeconds || undefined,
          participantCount: speakers?.length || 0,
          hasTranscript: Boolean(transcript && transcript.length > 0),
          hasSummary: Boolean(meeting.summary),
          createdAt: meeting.createdAt?.toISOString() || new Date().toISOString(),
        };
      });

      return NextResponse.json({ meetings: formattedMeetings });
    } catch (dbError) {
      // If table doesn't exist yet, return empty list
      console.warn('[MEETINGS_GET] Database error (table may not exist):', dbError);
      return NextResponse.json({ meetings: [] });
    }
  } catch (error) {
    console.error('[MEETINGS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}
