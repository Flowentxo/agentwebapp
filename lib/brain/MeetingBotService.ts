/**
 * Brain AI v3.0 - Meeting Bot Service
 *
 * Phase 4: Meeting Intelligence & Voice Processing
 *
 * Integration with Recall.ai for:
 * - Unified meeting bot (Zoom, Teams, Google Meet)
 * - Real-time transcription
 * - Speaker diarization
 * - Recording management
 */

import { getDb } from '@/lib/db/connection';
import { brainMeetingTranscripts } from '@/lib/db/schema-connected-intelligence';
import { eq, and, desc } from 'drizzle-orm';

// ============================================
// TYPES
// ============================================

export type MeetingPlatform = 'zoom' | 'google_meet' | 'microsoft_teams' | 'webex';

export type BotStatus =
  | 'ready'
  | 'joining'
  | 'in_waiting_room'
  | 'in_meeting'
  | 'recording'
  | 'processing'
  | 'done'
  | 'error'
  | 'fatal';

export interface MeetingBot {
  id: string;
  meetingUrl: string;
  platform: MeetingPlatform;
  status: BotStatus;
  statusMessage?: string;
  joinedAt?: Date;
  leftAt?: Date;
  recordingId?: string;
  transcriptId?: string;
  metadata: Record<string, unknown>;
}

export interface CreateBotOptions {
  meetingUrl: string;
  botName?: string;
  joinAt?: Date;
  recordAudio?: boolean;
  recordVideo?: boolean;
  transcribe?: boolean;
  realTimeTranscription?: boolean;
  automaticLeave?: {
    waitingRoomTimeout?: number;
    nooneJoinedTimeout?: number;
    everyoneLeftTimeout?: number;
  };
}

export interface TranscriptSegment {
  speakerId: string;
  speakerName?: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  words?: {
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }[];
}

export interface MeetingTranscript {
  id: string;
  botId: string;
  meetingId: string;
  segments: TranscriptSegment[];
  speakers: {
    id: string;
    name?: string;
    userId?: string;
  }[];
  duration: number;
  language: string;
  createdAt: Date;
}

export interface RecallApiConfig {
  apiKey: string;
  baseUrl: string;
  webhookSecret?: string;
}

// ============================================
// RECALL.AI API CLIENT
// ============================================

class RecallApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: RecallApiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://us-west-2.recall.ai/api/v1';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Recall API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // ========== BOT MANAGEMENT ==========

  async createBot(options: CreateBotOptions): Promise<{
    id: string;
    video_url: string;
    status_changes: { code: string; created_at: string }[];
  }> {
    // Build the request body according to Recall.ai v1 API format
    // See: https://docs.recall.ai/reference/bot_create
    // Using minimal required fields for maximum compatibility
    const requestBody: Record<string, unknown> = {
      meeting_url: options.meetingUrl,
      bot_name: options.botName || 'Brain AI Assistant',
    };

    // Add scheduled join time if specified
    if (options.joinAt) {
      requestBody.join_at = options.joinAt.toISOString();
    }

    // Configure recording with transcript using meeting captions
    // This is the recommended approach for transcript generation
    if (options.transcribe !== false) {
      requestBody.recording_config = {
        transcript: {
          provider: {
            meeting_captions: {}
          }
        }
      };
    }

    // Configure automatic leave behavior
    if (options.automaticLeave) {
      requestBody.automatic_leave = {
        waiting_room_timeout: options.automaticLeave.waitingRoomTimeout || 600,
        noone_joined_timeout: options.automaticLeave.nooneJoinedTimeout || 600,
        everyone_left_timeout: options.automaticLeave.everyoneLeftTimeout || 60,
      };
    }

    // Note: Real-time transcription requires additional Recall.ai plan features
    // Transcripts are available after the meeting via getTranscript() method

    return this.request('/bot', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async getBot(botId: string): Promise<{
    id: string;
    video_url: string;
    status_changes: { code: string; created_at: string; message?: string }[];
    meeting_metadata?: {
      title?: string;
      start_time?: string;
    };
    media?: {
      recordings?: { id: string; download_url: string }[];
    };
  }> {
    return this.request(`/bot/${botId}`);
  }

  async listBots(params?: {
    status?: BotStatus;
    limit?: number;
    offset?: number;
  }): Promise<{
    results: Array<{
      id: string;
      video_url: string;
      status_changes: { code: string; created_at: string }[];
    }>;
    count: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request(`/bot${query ? `?${query}` : ''}`);
  }

  async stopBot(botId: string): Promise<void> {
    await this.request(`/bot/${botId}/leave_call`, {
      method: 'POST',
    });
  }

  async deleteBot(botId: string): Promise<void> {
    await this.request(`/bot/${botId}`, {
      method: 'DELETE',
    });
  }

  // ========== TRANSCRIPT MANAGEMENT ==========

  async getTranscript(botId: string): Promise<{
    id: string;
    words: Array<{
      text: string;
      start_time: number;
      end_time: number;
      confidence: number;
      speaker: string;
      speaker_id: number;
    }>;
  }> {
    return this.request(`/bot/${botId}/transcript`);
  }

  async getSpeakers(botId: string): Promise<{
    results: Array<{
      id: number;
      name?: string;
    }>;
  }> {
    return this.request(`/bot/${botId}/speaker_timeline`);
  }

  // ========== RECORDING MANAGEMENT ==========

  async getRecording(botId: string): Promise<{
    id: string;
    download_url: string;
    duration: number;
  } | null> {
    const bot = await this.getBot(botId);
    const recording = bot.media?.recordings?.[0];

    if (!recording) return null;

    return {
      id: recording.id,
      download_url: recording.download_url,
      duration: 0, // Would need separate API call
    };
  }
}

// ============================================
// MEETING BOT SERVICE
// ============================================

export class MeetingBotService {
  private recallClient: RecallApiClient | null = null;
  private activeBots: Map<string, MeetingBot> = new Map();

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.RECALL_API_KEY;

    if (!apiKey) {
      console.warn('[MEETING_BOT] Recall.ai API key not configured');
      return;
    }

    this.recallClient = new RecallApiClient({
      apiKey,
      baseUrl: process.env.RECALL_API_URL || 'https://us-west-2.recall.ai/api/v1',
      webhookSecret: process.env.RECALL_WEBHOOK_SECRET,
    });

    console.log('[MEETING_BOT] Recall.ai client initialized');
  }

  // ========== PLATFORM DETECTION ==========

  detectPlatform(meetingUrl: string): MeetingPlatform | null {
    const url = meetingUrl.toLowerCase();

    if (url.includes('zoom.us') || url.includes('zoomgov.com')) {
      return 'zoom';
    }
    if (url.includes('meet.google.com')) {
      return 'google_meet';
    }
    if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) {
      return 'microsoft_teams';
    }
    if (url.includes('webex.com')) {
      return 'webex';
    }

    return null;
  }

  // ========== BOT LIFECYCLE ==========

  async joinMeeting(
    workspaceId: string,
    userId: string,
    meetingUrl: string,
    options?: Partial<CreateBotOptions>
  ): Promise<MeetingBot> {
    if (!this.recallClient) {
      throw new Error('Recall.ai client not initialized. Check API key configuration.');
    }

    const platform = this.detectPlatform(meetingUrl);
    if (!platform) {
      throw new Error(`Unsupported meeting platform for URL: ${meetingUrl}`);
    }

    console.log(`[MEETING_BOT] Joining ${platform} meeting: ${meetingUrl}`);

    try {
      // Create bot via Recall.ai
      const recallBot = await this.recallClient.createBot({
        meetingUrl,
        botName: options?.botName || 'Brain AI Assistant',
        recordAudio: true,
        recordVideo: options?.recordVideo ?? false,
        transcribe: true,
        realTimeTranscription: options?.realTimeTranscription ?? true,
        automaticLeave: {
          waitingRoomTimeout: 600, // 10 minutes
          nooneJoinedTimeout: 600,
          everyoneLeftTimeout: 60, // 1 minute after everyone leaves
        },
        ...options,
      });

      // Create local bot record
      const bot: MeetingBot = {
        id: recallBot.id,
        meetingUrl,
        platform,
        status: 'joining',
        metadata: {
          workspaceId,
          userId,
          createdAt: new Date().toISOString(),
        },
      };

      // Store in active bots
      this.activeBots.set(bot.id, bot);

      // Create database record using correct schema column names
      try {
        const db = getDb();
        await db.insert(brainMeetingTranscripts).values({
          workspaceId,
          userId,
          externalMeetingId: bot.id,
          title: `Meeting - ${new Date().toLocaleDateString()}`,
          meetingPlatform: platform,
          meetingUrl,
          transcript: '',
          speakers: [],
          summary: null,
          actionItems: [],
          keyDecisions: [],
          processingStatus: 'pending',
        });
      } catch (dbError) {
        // Log but don't fail - table might not exist yet
        console.warn('[MEETING_BOT] Database insert failed (table may not exist):', dbError);
      }

      console.log(`[MEETING_BOT] Bot ${bot.id} created, joining meeting...`);

      return bot;
    } catch (error) {
      console.error('[MEETING_BOT] Failed to join meeting:', error);
      throw error;
    }
  }

  async leaveMeeting(botId: string): Promise<void> {
    if (!this.recallClient) {
      throw new Error('Recall.ai client not initialized');
    }

    console.log(`[MEETING_BOT] Leaving meeting: ${botId}`);

    try {
      await this.recallClient.stopBot(botId);

      // Update local state
      const bot = this.activeBots.get(botId);
      if (bot) {
        bot.status = 'processing';
        bot.leftAt = new Date();
      }

      console.log(`[MEETING_BOT] Bot ${botId} left meeting`);
    } catch (error) {
      console.error('[MEETING_BOT] Failed to leave meeting:', error);
      throw error;
    }
  }

  async getBotStatus(botId: string): Promise<MeetingBot | null> {
    // Check local cache first
    const cachedBot = this.activeBots.get(botId);

    if (!this.recallClient) {
      return cachedBot || null;
    }

    try {
      const recallBot = await this.recallClient.getBot(botId);
      const latestStatus = recallBot.status_changes[recallBot.status_changes.length - 1];

      const bot: MeetingBot = {
        id: recallBot.id,
        meetingUrl: recallBot.video_url,
        platform: cachedBot?.platform || 'zoom',
        status: this.mapRecallStatus(latestStatus.code),
        statusMessage: latestStatus.message,
        joinedAt: cachedBot?.joinedAt,
        leftAt: cachedBot?.leftAt,
        metadata: cachedBot?.metadata || {},
      };

      // Update cache
      this.activeBots.set(botId, bot);

      return bot;
    } catch (error) {
      console.error('[MEETING_BOT] Failed to get bot status:', error);
      return cachedBot || null;
    }
  }

  async listActiveBots(workspaceId: string): Promise<MeetingBot[]> {
    const db = getDb();

    // Get recent meetings from database
    const recentMeetings = await db
      .select()
      .from(brainMeetingTranscripts)
      .where(eq(brainMeetingTranscripts.workspaceId, workspaceId))
      .orderBy(desc(brainMeetingTranscripts.createdAt))
      .limit(20);

    // Get live status for active bots
    const bots: MeetingBot[] = [];

    for (const meeting of recentMeetings) {
      const metadata = meeting.metadata as Record<string, unknown> | null;
      const botId = metadata?.botId as string | undefined;
      const status = metadata?.status as string | undefined;

      if (botId && status && !['done', 'error', 'fatal'].includes(status)) {
        const liveBot = await this.getBotStatus(botId);
        if (liveBot) {
          bots.push(liveBot);
        }
      }
    }

    return bots;
  }

  // ========== TRANSCRIPT RETRIEVAL ==========

  async getTranscript(botId: string): Promise<MeetingTranscript | null> {
    if (!this.recallClient) {
      throw new Error('Recall.ai client not initialized');
    }

    try {
      const [transcript, speakers] = await Promise.all([
        this.recallClient.getTranscript(botId),
        this.recallClient.getSpeakers(botId),
      ]);

      // Group words into segments by speaker
      const segments: TranscriptSegment[] = [];
      let currentSegment: TranscriptSegment | null = null;

      for (const word of transcript.words) {
        if (!currentSegment || currentSegment.speakerId !== word.speaker_id.toString()) {
          // Start new segment
          if (currentSegment) {
            segments.push(currentSegment);
          }

          const speaker = speakers.results.find(s => s.id === word.speaker_id);
          currentSegment = {
            speakerId: word.speaker_id.toString(),
            speakerName: speaker?.name,
            text: word.text,
            startTime: word.start_time,
            endTime: word.end_time,
            confidence: word.confidence,
            words: [word],
          };
        } else {
          // Continue current segment
          currentSegment.text += ` ${word.text}`;
          currentSegment.endTime = word.end_time;
          currentSegment.words?.push(word);
        }
      }

      if (currentSegment) {
        segments.push(currentSegment);
      }

      const lastSegment = segments[segments.length - 1];

      return {
        id: transcript.id,
        botId,
        meetingId: botId,
        segments,
        speakers: speakers.results.map(s => ({
          id: s.id.toString(),
          name: s.name,
        })),
        duration: lastSegment?.endTime || 0,
        language: 'en',
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('[MEETING_BOT] Failed to get transcript:', error);
      return null;
    }
  }

  async saveTranscript(
    workspaceId: string,
    botId: string,
    transcript: MeetingTranscript
  ): Promise<void> {
    try {
      const db = getDb();

      // Convert segments to plain text for storage
      const transcriptText = transcript.segments.map(s =>
        `[${s.speakerName || `Speaker ${s.speakerId}`}]: ${s.text}`
      ).join('\n');

      await db
        .update(brainMeetingTranscripts)
        .set({
          transcript: transcriptText,
          speakers: transcript.speakers.map(s => s.name || `Speaker ${s.id}`),
          durationSeconds: Math.round(transcript.duration),
          processingStatus: 'completed',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(brainMeetingTranscripts.workspaceId, workspaceId),
            eq(brainMeetingTranscripts.externalMeetingId, botId)
          )
        );

      console.log(`[MEETING_BOT] Transcript saved for bot ${botId}`);
    } catch (error) {
      console.error('[MEETING_BOT] Failed to save transcript:', error);
    }
  }

  // ========== STATUS MAPPING ==========

  private mapRecallStatus(recallStatus: string): BotStatus {
    const statusMap: Record<string, BotStatus> = {
      ready: 'ready',
      joining_call: 'joining',
      in_waiting_room: 'in_waiting_room',
      in_call_not_recording: 'in_meeting',
      in_call_recording: 'recording',
      call_ended: 'processing',
      done: 'done',
      analysis_done: 'done',
      fatal: 'fatal',
    };

    return statusMap[recallStatus] || 'error';
  }

  // ========== WEBHOOK HANDLING ==========

  async handleWebhookEvent(event: {
    event: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    console.log(`[MEETING_BOT] Webhook event: ${event.event}`);

    switch (event.event) {
      case 'bot.status_change':
        await this.handleBotStatusChange(event.data);
        break;
      case 'bot.transcription':
        await this.handleTranscriptionUpdate(event.data);
        break;
      case 'bot.done':
        await this.handleBotDone(event.data);
        break;
      default:
        console.log(`[MEETING_BOT] Unhandled event: ${event.event}`);
    }
  }

  private async handleBotStatusChange(data: Record<string, unknown>): Promise<void> {
    const botId = data.bot_id as string;
    const status = data.status as { code: string; message?: string };

    const bot = this.activeBots.get(botId);
    if (bot) {
      bot.status = this.mapRecallStatus(status.code);
      bot.statusMessage = status.message;

      if (status.code === 'in_call_recording') {
        bot.joinedAt = new Date();
      }
    }

    // Map Recall status to our processing status
    const processingStatusMap: Record<string, string> = {
      joining_call: 'pending',
      in_waiting_room: 'pending',
      in_call_not_recording: 'pending',
      in_call_recording: 'transcribing',
      call_ended: 'summarizing',
      done: 'completed',
      analysis_done: 'completed',
      fatal: 'failed',
    };

    // Update database
    try {
      const db = getDb();
      await db
        .update(brainMeetingTranscripts)
        .set({
          processingStatus: processingStatusMap[status.code] || 'pending',
          updatedAt: new Date(),
        })
        .where(eq(brainMeetingTranscripts.externalMeetingId, botId));
    } catch (error) {
      console.error('[MEETING_BOT] Failed to update status in database:', error);
    }
  }

  private async handleTranscriptionUpdate(data: Record<string, unknown>): Promise<void> {
    // Real-time transcription updates
    const botId = data.bot_id as string;
    const words = data.words as Array<{
      text: string;
      start_time: number;
      end_time: number;
      speaker_id: number;
    }>;

    // Could emit to WebSocket for real-time UI updates
    console.log(`[MEETING_BOT] Real-time transcription: ${words.length} words for bot ${botId}`);
  }

  private async handleBotDone(data: Record<string, unknown>): Promise<void> {
    const botId = data.bot_id as string;

    // Get full transcript
    const transcript = await this.getTranscript(botId);
    if (transcript) {
      const bot = this.activeBots.get(botId);
      const workspaceId = (bot?.metadata as Record<string, unknown>)?.workspaceId as string;

      if (workspaceId) {
        await this.saveTranscript(workspaceId, botId, transcript);
      }
    }

    // Clean up
    this.activeBots.delete(botId);
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const meetingBotService = new MeetingBotService();
