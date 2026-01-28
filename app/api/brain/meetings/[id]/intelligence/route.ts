/**
 * Brain AI v3.0 - Meeting Intelligence API
 *
 * GET /api/brain/meetings/[id]/intelligence
 * Get AI-generated intelligence for a meeting (summary, action items, decisions)
 *
 * POST /api/brain/meetings/[id]/intelligence
 * Trigger reprocessing of meeting intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { brainMeetingTranscripts } from '@/lib/db/schema-connected-intelligence';
import { meetingIntelligenceService } from '@/lib/brain/MeetingIntelligenceService';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: meetingId } = await params;
    const workspaceId = session.user.workspaceId || 'default';

    // Verify access to meeting
    const db = getDb();
    const meetings = await db
      .select()
      .from(brainMeetingTranscripts)
      .where(
        and(
          eq(brainMeetingTranscripts.workspaceId, workspaceId),
          eq(brainMeetingTranscripts.meetingId, meetingId)
        )
      )
      .limit(1);

    if (meetings.length === 0) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const meeting = meetings[0];
    const metadata = meeting.metadata as Record<string, unknown> | null;

    // Build intelligence response
    const intelligence = {
      meetingId,
      summary: {
        title: meeting.title,
        overview: meeting.summary || '',
        keyPoints: (metadata?.keyPoints as string[]) || [],
        duration: meeting.duration || 0,
        participantCount: meeting.participants?.length || 0,
      },
      transcript: meeting.transcript || [],
      actionItems: meeting.actionItems || [],
      decisions: meeting.decisions || [],
      participantInsights: (metadata?.participantInsights as unknown[]) || [],
    };

    return NextResponse.json({ intelligence });
  } catch (error) {
    console.error('[MEETING_INTELLIGENCE_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting intelligence' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: meetingId } = await params;
    const workspaceId = session.user.workspaceId || 'default';

    // Verify access to meeting
    const db = getDb();
    const meetings = await db
      .select()
      .from(brainMeetingTranscripts)
      .where(
        and(
          eq(brainMeetingTranscripts.workspaceId, workspaceId),
          eq(brainMeetingTranscripts.meetingId, meetingId)
        )
      )
      .limit(1);

    if (meetings.length === 0) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Trigger reprocessing
    const intelligence = await meetingIntelligenceService.reprocessMeeting(meetingId);

    if (!intelligence) {
      return NextResponse.json(
        { error: 'No transcript available for processing' },
        { status: 400 }
      );
    }

    return NextResponse.json({ intelligence, reprocessed: true });
  } catch (error) {
    console.error('[MEETING_INTELLIGENCE_POST]', error);
    return NextResponse.json(
      { error: 'Failed to reprocess meeting' },
      { status: 500 }
    );
  }
}
