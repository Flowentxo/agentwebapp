/**
 * HUBSPOT WEBHOOK ENDPOINT
 *
 * POST /api/webhooks/hubspot
 *
 * Receives webhook events from HubSpot and processes them
 * - Validates webhook signature
 * - Processes events (contact.propertyChange, deal.propertyChange, etc.)
 * - Triggers agent executions based on configured rules
 * - Logs all webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateHubSpotSignature,
  processHubSpotEvent,
  HubSpotWebhookEvent,
} from '@/lib/services/hubspot-webhook-service';
import { getDb } from '@/lib/db';
import { hubspotSyncLogs } from '@/lib/db/schema-revolution';

export const dynamic = 'force-dynamic';

const HUBSPOT_WEBHOOK_SECRET = process.env.HUBSPOT_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Get raw body as text for signature validation
    const body = await req.text();
    const signature = req.headers.get('x-hubspot-signature');

    console.log('[HUBSPOT_WEBHOOK] Received webhook request');

    // Validate signature
    if (!signature) {
      console.error('[HUBSPOT_WEBHOOK] Missing signature header');
      return NextResponse.json(
        {
          error: 'Missing signature',
          message: 'X-HubSpot-Signature header is required',
        },
        { status: 401 }
      );
    }

    if (!HUBSPOT_WEBHOOK_SECRET) {
      console.error('[HUBSPOT_WEBHOOK] Webhook secret not configured');
      return NextResponse.json(
        {
          error: 'Webhook not configured',
          message: 'HubSpot webhook secret is not configured',
        },
        { status: 500 }
      );
    }

    // Validate signature
    const isValid = validateHubSpotSignature(body, signature, HUBSPOT_WEBHOOK_SECRET);

    if (!isValid) {
      console.error('[HUBSPOT_WEBHOOK] Invalid signature');

      // Log failed validation
      const db = getDb();
      await db.insert(hubspotSyncLogs).values({
        userId: 'system',
        operation: 'webhook_signature_validation_failed',
        objectType: 'webhook',
        status: 'failed',
        requestPayload: { body: body.substring(0, 500) },
        errorMessage: 'Invalid webhook signature',
      });

      return NextResponse.json(
        {
          error: 'Invalid signature',
          message: 'Webhook signature validation failed',
        },
        { status: 401 }
      );
    }

    console.log('[HUBSPOT_WEBHOOK] ✅ Signature validated');

    // Parse webhook payload
    let events: HubSpotWebhookEvent[];

    try {
      events = JSON.parse(body);
    } catch (parseError) {
      console.error('[HUBSPOT_WEBHOOK] JSON parse error:', parseError);
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Failed to parse webhook payload',
        },
        { status: 400 }
      );
    }

    // HubSpot sends events as an array
    if (!Array.isArray(events)) {
      events = [events];
    }

    console.log(`[HUBSPOT_WEBHOOK] Processing ${events.length} event(s)`);

    // Process each event
    const results = await Promise.allSettled(
      events.map((event) => processHubSpotEvent(event))
    );

    // Count successes and failures
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `[HUBSPOT_WEBHOOK] ✅ Processed ${successCount} events successfully, ${failureCount} failed`
    );

    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[HUBSPOT_WEBHOOK] Event ${index} failed:`, result.reason);
      }
    });

    // Always return 200 to HubSpot to prevent retries on our errors
    return NextResponse.json({
      success: true,
      processed: events.length,
      successCount,
      failureCount,
    });
  } catch (error: any) {
    console.error('[HUBSPOT_WEBHOOK] Webhook processing error:', error);

    // Log the error but still return 200 to HubSpot
    const db = getDb();
    try {
      await db.insert(hubspotSyncLogs).values({
        userId: 'system',
        operation: 'webhook_processing_error',
        objectType: 'webhook',
        status: 'failed',
        errorMessage: error.message,
      });
    } catch (logError) {
      console.error('[HUBSPOT_WEBHOOK] Failed to log error:', logError);
    }

    // Return 200 to prevent HubSpot retries
    return NextResponse.json(
      {
        success: false,
        error: 'Webhook processing failed',
        message: error.message,
      },
      { status: 200 }
    );
  }
}

/**
 * GET endpoint for webhook verification
 * HubSpot may send a verification request when setting up the webhook
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge');

  // HubSpot verification challenge
  if (challenge) {
    console.log('[HUBSPOT_WEBHOOK] Responding to verification challenge');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({
    message: 'HubSpot Webhook Endpoint',
    status: 'active',
    endpoints: {
      webhook: '/api/webhooks/hubspot',
    },
  });
}
