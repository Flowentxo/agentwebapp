/**
 * Brain AI v3.0 - Meeting Intelligence Service
 *
 * Phase 4: Meeting Intelligence & Voice Processing
 *
 * AI-powered analysis of meeting transcripts:
 * - Summarization (Gemini 2.5 Flash for speed)
 * - Action Item Extraction (GPT-4o for accuracy)
 * - Decision Tracking
 * - Topic Segmentation
 * - Participant Insights
 */

import { getDb } from '@/lib/db/connection';
import { brainMeetingTranscripts } from '@/lib/db/schema-connected-intelligence';
import { modelRouter } from './ModelRouter';
import { aiUsageTracker } from './AIUsageTracker';
import { eq } from 'drizzle-orm';
import type { MeetingTranscript, TranscriptSegment } from './MeetingBotService';

// ============================================
// TYPES
// ============================================

export interface MeetingSummary {
  title: string;
  overview: string;
  keyPoints: string[];
  duration: number;
  participantCount: number;
  topicBreakdown: TopicSegment[];
}

export interface TopicSegment {
  topic: string;
  startTime: number;
  endTime: number;
  summary: string;
  speakers: string[];
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  context: string;
  timestamp: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Decision {
  id: string;
  description: string;
  madeBy: string;
  rationale?: string;
  timestamp: number;
  relatedActionItems: string[];
}

export interface ParticipantInsight {
  speakerId: string;
  speakerName?: string;
  speakingTime: number;
  speakingPercentage: number;
  topicsDiscussed: string[];
  actionItemsAssigned: number;
}

export interface MeetingIntelligence {
  meetingId: string;
  summary: MeetingSummary;
  actionItems: ActionItem[];
  decisions: Decision[];
  participantInsights: ParticipantInsight[];
  processedAt: Date;
  modelUsed: string;
}

// ============================================
// PROMPTS
// ============================================

const SUMMARIZATION_PROMPT = `You are an expert meeting analyst. Analyze the following meeting transcript and provide a comprehensive summary.

TRANSCRIPT:
{transcript}

TASK: Generate a structured summary with the following sections:

1. **Title**: A concise, descriptive title for this meeting (max 10 words)
2. **Overview**: A 2-3 sentence executive summary of the entire meeting
3. **Key Points**: 3-7 bullet points capturing the most important discussions and outcomes
4. **Topic Breakdown**: Identify 2-5 main topics discussed, with start/end timestamps and brief summaries

FORMAT YOUR RESPONSE AS JSON:
{
  "title": "Meeting title here",
  "overview": "Executive summary here...",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "topicBreakdown": [
    {
      "topic": "Topic name",
      "startTime": 0,
      "endTime": 300,
      "summary": "What was discussed",
      "speakers": ["Speaker 1", "Speaker 2"]
    }
  ]
}`;

const ACTION_ITEMS_PROMPT = `You are an expert at identifying action items from meeting transcripts. Extract all tasks, commitments, and follow-ups mentioned.

TRANSCRIPT:
{transcript}

TASK: Identify all action items with the following details:
- WHO is responsible (assignee)
- WHAT needs to be done (description)
- WHEN it's due (if mentioned)
- Priority (high/medium/low based on context)
- The exact quote or context where this was mentioned

FORMAT YOUR RESPONSE AS JSON:
{
  "actionItems": [
    {
      "description": "Clear description of the task",
      "assignee": "Person's name or null if unassigned",
      "dueDate": "YYYY-MM-DD or null if not specified",
      "priority": "high|medium|low",
      "context": "The relevant quote from the transcript",
      "timestamp": 123.45
    }
  ]
}

Look for phrases like:
- "I'll...", "I will...", "I'm going to..."
- "Can you...", "Could you...", "Would you..."
- "Let's...", "We should...", "We need to..."
- "Action item:", "TODO:", "Follow up on..."
- "By [date]...", "Before [event]..."`;

const DECISIONS_PROMPT = `You are an expert at identifying decisions made during meetings. Extract all decisions, agreements, and conclusions.

TRANSCRIPT:
{transcript}

TASK: Identify all decisions made with the following details:
- What was decided
- Who made or announced the decision
- The rationale (if given)
- Any related action items

FORMAT YOUR RESPONSE AS JSON:
{
  "decisions": [
    {
      "description": "The decision that was made",
      "madeBy": "Person who made/announced the decision",
      "rationale": "Why this decision was made, or null",
      "timestamp": 123.45,
      "relatedActionItems": ["Brief description of related tasks"]
    }
  ]
}

Look for phrases like:
- "We've decided to...", "The decision is..."
- "Let's go with...", "We'll proceed with..."
- "It's been agreed that..."
- "The conclusion is..."
- "We're going to [do X] instead of [Y]..."`;

// ============================================
// MEETING INTELLIGENCE SERVICE
// ============================================

export class MeetingIntelligenceService {
  // ========== MAIN PROCESSING ==========

  async processTranscript(
    meetingId: string,
    transcript: MeetingTranscript
  ): Promise<MeetingIntelligence> {
    console.log(`[MEETING_INTEL] Processing transcript for meeting ${meetingId}`);

    const startTime = Date.now();

    // Convert transcript to text format
    const transcriptText = this.formatTranscriptForAnalysis(transcript);

    // Run all intelligence extractions in parallel
    const [summary, actionItems, decisions] = await Promise.all([
      this.generateSummary(meetingId, transcriptText),
      this.extractActionItems(meetingId, transcriptText),
      this.extractDecisions(meetingId, transcriptText),
    ]);

    // Calculate participant insights
    const participantInsights = this.calculateParticipantInsights(
      transcript,
      actionItems
    );

    const intelligence: MeetingIntelligence = {
      meetingId,
      summary: {
        ...summary,
        duration: transcript.duration,
        participantCount: transcript.speakers.length,
      },
      actionItems,
      decisions,
      participantInsights,
      processedAt: new Date(),
      modelUsed: 'gemini-2.5-flash + gpt-4o',
    };

    // Save to database
    await this.saveIntelligence(meetingId, intelligence);

    const processingTime = Date.now() - startTime;
    console.log(`[MEETING_INTEL] Processed meeting ${meetingId} in ${processingTime}ms`);

    return intelligence;
  }

  // ========== SUMMARIZATION ==========

  private async generateSummary(
    meetingId: string,
    transcriptText: string
  ): Promise<Omit<MeetingSummary, 'duration' | 'participantCount'>> {
    console.log(`[MEETING_INTEL] Generating summary for ${meetingId}`);

    try {
      // Use Gemini Flash for fast summarization
      const prompt = SUMMARIZATION_PROMPT.replace('{transcript}', transcriptText);

      const result = await modelRouter.generate({
        task: prompt,
        preferredModel: 'gemini-2.5-flash',
        workspaceId: 'system',
        userId: 'meeting-intelligence',
        options: {
          maxTokens: 2000,
          temperature: 0.3,
        },
      });

      // Track usage
      await aiUsageTracker.track({
        workspaceId: 'system',
        userId: 'meeting-intelligence',
        operation: 'meeting_summarization',
        model: result.model,
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        latencyMs: result.latencyMs || 0,
        success: true,
        metadata: { meetingId },
      });

      // Parse JSON response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse summary JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        title: parsed.title || 'Untitled Meeting',
        overview: parsed.overview || '',
        keyPoints: parsed.keyPoints || [],
        topicBreakdown: parsed.topicBreakdown || [],
      };
    } catch (error) {
      console.error(`[MEETING_INTEL] Summarization failed:`, error);
      return {
        title: 'Meeting Summary',
        overview: 'Summary generation failed. Please review the transcript manually.',
        keyPoints: [],
        topicBreakdown: [],
      };
    }
  }

  // ========== ACTION ITEM EXTRACTION ==========

  private async extractActionItems(
    meetingId: string,
    transcriptText: string
  ): Promise<ActionItem[]> {
    console.log(`[MEETING_INTEL] Extracting action items for ${meetingId}`);

    try {
      // Use GPT-4o for accurate action item extraction
      const prompt = ACTION_ITEMS_PROMPT.replace('{transcript}', transcriptText);

      const result = await modelRouter.generate({
        task: prompt,
        preferredModel: 'gpt-4o',
        workspaceId: 'system',
        userId: 'meeting-intelligence',
        options: {
          maxTokens: 2000,
          temperature: 0.2,
        },
      });

      // Track usage
      await aiUsageTracker.track({
        workspaceId: 'system',
        userId: 'meeting-intelligence',
        operation: 'action_item_extraction',
        model: result.model,
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        latencyMs: result.latencyMs || 0,
        success: true,
        metadata: { meetingId },
      });

      // Parse JSON response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse action items JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return (parsed.actionItems || []).map((item: Record<string, unknown>, index: number) => ({
        id: `action-${meetingId}-${index}`,
        description: item.description as string,
        assignee: item.assignee as string | undefined,
        dueDate: item.dueDate as string | undefined,
        priority: (item.priority as 'high' | 'medium' | 'low') || 'medium',
        context: item.context as string,
        timestamp: item.timestamp as number || 0,
        status: 'pending' as const,
      }));
    } catch (error) {
      console.error(`[MEETING_INTEL] Action item extraction failed:`, error);
      return [];
    }
  }

  // ========== DECISION EXTRACTION ==========

  private async extractDecisions(
    meetingId: string,
    transcriptText: string
  ): Promise<Decision[]> {
    console.log(`[MEETING_INTEL] Extracting decisions for ${meetingId}`);

    try {
      // Use GPT-4o for accurate decision extraction
      const prompt = DECISIONS_PROMPT.replace('{transcript}', transcriptText);

      const result = await modelRouter.generate({
        task: prompt,
        preferredModel: 'gpt-4o',
        workspaceId: 'system',
        userId: 'meeting-intelligence',
        options: {
          maxTokens: 1500,
          temperature: 0.2,
        },
      });

      // Track usage
      await aiUsageTracker.track({
        workspaceId: 'system',
        userId: 'meeting-intelligence',
        operation: 'decision_extraction',
        model: result.model,
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        latencyMs: result.latencyMs || 0,
        success: true,
        metadata: { meetingId },
      });

      // Parse JSON response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse decisions JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return (parsed.decisions || []).map((decision: Record<string, unknown>, index: number) => ({
        id: `decision-${meetingId}-${index}`,
        description: decision.description as string,
        madeBy: decision.madeBy as string,
        rationale: decision.rationale as string | undefined,
        timestamp: decision.timestamp as number || 0,
        relatedActionItems: decision.relatedActionItems as string[] || [],
      }));
    } catch (error) {
      console.error(`[MEETING_INTEL] Decision extraction failed:`, error);
      return [];
    }
  }

  // ========== PARTICIPANT INSIGHTS ==========

  private calculateParticipantInsights(
    transcript: MeetingTranscript,
    actionItems: ActionItem[]
  ): ParticipantInsight[] {
    const speakerStats = new Map<string, {
      speakingTime: number;
      topics: Set<string>;
      segments: TranscriptSegment[];
    }>();

    // Calculate speaking time for each speaker
    for (const segment of transcript.segments) {
      const existing = speakerStats.get(segment.speakerId) || {
        speakingTime: 0,
        topics: new Set(),
        segments: [],
      };

      existing.speakingTime += segment.endTime - segment.startTime;
      existing.segments.push(segment);

      speakerStats.set(segment.speakerId, existing);
    }

    const totalTime = transcript.duration;

    // Build insights
    const insights: ParticipantInsight[] = [];

    for (const [speakerId, stats] of speakerStats) {
      const speaker = transcript.speakers.find(s => s.id === speakerId);
      const speakerName = speaker?.name || `Speaker ${speakerId}`;

      // Count action items assigned to this speaker
      const assignedItems = actionItems.filter(
        item => item.assignee?.toLowerCase().includes(speakerName.toLowerCase())
      ).length;

      insights.push({
        speakerId,
        speakerName,
        speakingTime: Math.round(stats.speakingTime),
        speakingPercentage: Math.round((stats.speakingTime / totalTime) * 100),
        topicsDiscussed: Array.from(stats.topics),
        actionItemsAssigned: assignedItems,
      });
    }

    // Sort by speaking time descending
    return insights.sort((a, b) => b.speakingTime - a.speakingTime);
  }

  // ========== UTILITY METHODS ==========

  private formatTranscriptForAnalysis(transcript: MeetingTranscript): string {
    return transcript.segments
      .map(segment => {
        const timestamp = this.formatTimestamp(segment.startTime);
        const speaker = segment.speakerName || `Speaker ${segment.speakerId}`;
        return `[${timestamp}] ${speaker}: ${segment.text}`;
      })
      .join('\n');
  }

  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // ========== DATABASE OPERATIONS ==========

  private async saveIntelligence(
    meetingId: string,
    intelligence: MeetingIntelligence
  ): Promise<void> {
    const db = getDb();

    await db
      .update(brainMeetingTranscripts)
      .set({
        title: intelligence.summary.title,
        summary: intelligence.summary.overview,
        actionItems: intelligence.actionItems,
        decisions: intelligence.decisions,
        metadata: {
          keyPoints: intelligence.summary.keyPoints,
          topicBreakdown: intelligence.summary.topicBreakdown,
          participantInsights: intelligence.participantInsights,
          processedAt: intelligence.processedAt.toISOString(),
          modelUsed: intelligence.modelUsed,
        },
        updatedAt: new Date(),
      })
      .where(eq(brainMeetingTranscripts.meetingId, meetingId));

    console.log(`[MEETING_INTEL] Intelligence saved for meeting ${meetingId}`);
  }

  // ========== PUBLIC API ==========

  async getMeetingIntelligence(meetingId: string): Promise<MeetingIntelligence | null> {
    const db = getDb();

    const results = await db
      .select()
      .from(brainMeetingTranscripts)
      .where(eq(brainMeetingTranscripts.meetingId, meetingId))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const meeting = results[0];
    const metadata = meeting.metadata as Record<string, unknown> | null;

    return {
      meetingId,
      summary: {
        title: meeting.title,
        overview: meeting.summary || '',
        keyPoints: (metadata?.keyPoints as string[]) || [],
        duration: meeting.duration || 0,
        participantCount: meeting.participants?.length || 0,
        topicBreakdown: (metadata?.topicBreakdown as TopicSegment[]) || [],
      },
      actionItems: (meeting.actionItems as ActionItem[]) || [],
      decisions: (meeting.decisions as Decision[]) || [],
      participantInsights: (metadata?.participantInsights as ParticipantInsight[]) || [],
      processedAt: new Date((metadata?.processedAt as string) || meeting.updatedAt || meeting.createdAt),
      modelUsed: (metadata?.modelUsed as string) || 'unknown',
    };
  }

  async reprocessMeeting(meetingId: string): Promise<MeetingIntelligence | null> {
    const db = getDb();

    const results = await db
      .select()
      .from(brainMeetingTranscripts)
      .where(eq(brainMeetingTranscripts.meetingId, meetingId))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const meeting = results[0];
    const segments = meeting.transcript as TranscriptSegment[] | null;

    if (!segments || segments.length === 0) {
      throw new Error('No transcript available for reprocessing');
    }

    // Reconstruct transcript object
    const transcript: MeetingTranscript = {
      id: meetingId,
      botId: meetingId,
      meetingId,
      segments,
      speakers: meeting.participants?.map((name, i) => ({
        id: i.toString(),
        name,
      })) || [],
      duration: meeting.duration || 0,
      language: 'en',
      createdAt: meeting.createdAt,
    };

    return this.processTranscript(meetingId, transcript);
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const meetingIntelligenceService = new MeetingIntelligenceService();
