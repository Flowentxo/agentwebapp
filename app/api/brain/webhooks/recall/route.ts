/**
 * Brain AI v3.0 - Recall.ai Webhook Handler
 *
 * POST /api/brain/webhooks/recall
 * Handles webhook events from Recall.ai:
 * - bot.status_change: Bot status updates
 * - bot.transcription: Real-time transcription
 * - bot.done: Meeting completed, transcript ready
 * - bot.analysis_done: Analysis completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { meetingBotService } from '@/lib/brain/MeetingBotService';
import { meetingIntelligenceService } from '@/lib/brain/MeetingIntelligenceService';
import { headers } from 'next/headers';
import crypto from 'crypto';

// Webhook event types
type RecallWebhookEvent =
  | 'bot.status_change'
  | 'bot.transcription'
  | 'bot.done'
  | 'bot.analysis_done'
  | 'bot.media_done';

interface RecallWebhookPayload {
  event: RecallWebhookEvent;
  data: {
    bot_id: string;
    status?: {
      code: string;
      message?: string;
      sub_code?: string;
    };
    words?: Array<{
      text: string;
      start_time: number;
      end_time: number;
      speaker_id: number;
      confidence: number;
    }>;
    transcript?: {
      id: string;
      status: string;
    };
    recording?: {
      id: string;
      download_url: string;
    };
    [key: string]: unknown;
  };
}

// ============================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.warn('[RECALL_WEBHOOK] No webhook secret configured, skipping verification');
    return true;
  }

  if (!signature) {
    console.warn('[RECALL_WEBHOOK] No signature provided in request');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Ensure both signatures have the same length for timing-safe comparison
  if (signature.length !== expectedSignature.length) {
    console.warn('[RECALL_WEBHOOK] Signature length mismatch');
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const headersList = await headers();
    const signature = headersList.get('x-recall-signature') || '';

    // Verify signature
    const webhookSecret = process.env.RECALL_WEBHOOK_SECRET;
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('[RECALL_WEBHOOK] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse payload
    const payload: RecallWebhookPayload = JSON.parse(rawBody);
    const { event, data } = payload;

    console.log(`[RECALL_WEBHOOK] Received event: ${event} for bot ${data.bot_id}`);

    // Route to appropriate handler
    switch (event) {
      case 'bot.status_change':
        await handleStatusChange(data);
        break;

      case 'bot.transcription':
        await handleRealTimeTranscription(data);
        break;

      case 'bot.done':
        await handleBotDone(data);
        break;

      case 'bot.analysis_done':
        await handleAnalysisDone(data);
        break;

      case 'bot.media_done':
        await handleMediaDone(data);
        break;

      default:
        console.log(`[RECALL_WEBHOOK] Unhandled event type: ${event}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[RECALL_WEBHOOK] Processed ${event} in ${duration}ms`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RECALL_WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleStatusChange(data: RecallWebhookPayload['data']): Promise<void> {
  const { bot_id, status } = data;

  if (!status) {
    console.warn('[RECALL_WEBHOOK] Status change without status data');
    return;
  }

  console.log(`[RECALL_WEBHOOK] Bot ${bot_id} status: ${status.code}`);

  // Forward to meeting bot service
  await meetingBotService.handleWebhookEvent({
    event: 'bot.status_change',
    data: {
      bot_id,
      status,
    },
  });

  // Handle specific status codes
  switch (status.code) {
    case 'fatal':
      console.error(`[RECALL_WEBHOOK] Bot ${bot_id} fatal error: ${status.message}`);
      // Could trigger error notification to user
      break;

    case 'in_call_recording':
      console.log(`[RECALL_WEBHOOK] Bot ${bot_id} started recording`);
      break;

    case 'call_ended':
      console.log(`[RECALL_WEBHOOK] Bot ${bot_id} call ended, processing...`);
      break;
  }
}

async function handleRealTimeTranscription(data: RecallWebhookPayload['data']): Promise<void> {
  const { bot_id, words } = data;

  if (!words || words.length === 0) {
    return;
  }

  // Forward to meeting bot service for real-time processing
  await meetingBotService.handleWebhookEvent({
    event: 'bot.transcription',
    data: {
      bot_id,
      words,
    },
  });

  // TODO: Emit to WebSocket for real-time UI updates
  // websocketServer.emit(`meeting:${bot_id}:transcription`, { words });
}

async function handleBotDone(data: RecallWebhookPayload['data']): Promise<void> {
  const { bot_id } = data;

  console.log(`[RECALL_WEBHOOK] Bot ${bot_id} completed, fetching transcript...`);

  // Forward to meeting bot service
  await meetingBotService.handleWebhookEvent({
    event: 'bot.done',
    data: { bot_id },
  });

  // Trigger intelligence processing (summarization, action items)
  try {
    const transcript = await meetingBotService.getTranscript(bot_id);

    if (transcript) {
      console.log(`[RECALL_WEBHOOK] Processing transcript for bot ${bot_id}`);

      // Run intelligence processing in background
      meetingIntelligenceService
        .processTranscript(bot_id, transcript)
        .then(() => {
          console.log(`[RECALL_WEBHOOK] Intelligence processing completed for ${bot_id}`);
        })
        .catch(err => {
          console.error(`[RECALL_WEBHOOK] Intelligence processing failed for ${bot_id}:`, err);
        });
    }
  } catch (error) {
    console.error(`[RECALL_WEBHOOK] Failed to fetch transcript for ${bot_id}:`, error);
  }
}

async function handleAnalysisDone(data: RecallWebhookPayload['data']): Promise<void> {
  const { bot_id } = data;

  console.log(`[RECALL_WEBHOOK] Analysis completed for bot ${bot_id}`);

  // Recall.ai has finished its own analysis
  // We might want to fetch and store additional metadata
}

async function handleMediaDone(data: RecallWebhookPayload['data']): Promise<void> {
  const { bot_id, recording } = data;

  if (!recording) {
    return;
  }

  console.log(`[RECALL_WEBHOOK] Recording available for bot ${bot_id}: ${recording.id}`);

  // Store recording URL in database
  // Could be used for video playback or audio processing
}

// ============================================
// REAL-TIME TRANSCRIPTION ENDPOINT
// ============================================

// Separate endpoint for real-time transcription updates
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { bot_id, words } = data;

    if (!bot_id || !words) {
      return NextResponse.json(
        { error: 'Missing bot_id or words' },
        { status: 400 }
      );
    }

    // Forward to handler
    await handleRealTimeTranscription({ bot_id, words });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RECALL_WEBHOOK] Real-time transcription error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}
