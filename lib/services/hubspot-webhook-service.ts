/**
 * HUBSPOT WEBHOOK SERVICE
 *
 * Manages HubSpot webhook subscriptions and event processing
 * - Register webhooks on OAuth connection
 * - Validate webhook signatures
 * - Process webhook events
 * - Trigger agent executions based on events
 */

import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { hubspotWebhooks, hubspotSyncLogs, oauthConnections, agentExecutions } from '@/lib/db/schema-revolution';
import { eq, and } from 'drizzle-orm';
import { getRedisClient } from '@/lib/redis';

const HUBSPOT_WEBHOOK_SECRET = process.env.HUBSPOT_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// =====================================================
// WEBHOOK REGISTRATION
// =====================================================

export interface WebhookSubscription {
  eventType: string;
  objectType: string;
  propertyName?: string;
}

/**
 * Register webhook with HubSpot API
 */
export async function registerHubSpotWebhook(
  accessToken: string,
  portalId: string,
  subscription: WebhookSubscription
): Promise<string | null> {
  try {
    console.log(`[HUBSPOT_WEBHOOK] Registering webhook for portal ${portalId}:`, subscription);

    const webhookUrl = `${APP_URL}/api/webhooks/hubspot`;

    // Create subscription via HubSpot API
    const response = await fetch('https://api.hubapi.com/webhooks/v3/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: subscription.eventType,
        propertyName: subscription.propertyName,
        active: true,
        webhookUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HUBSPOT_WEBHOOK] Registration failed:', errorData);
      return null;
    }

    const data = await response.json();
    console.log(`[HUBSPOT_WEBHOOK] ✅ Webhook registered: ${data.id}`);

    return data.id;
  } catch (error: any) {
    console.error('[HUBSPOT_WEBHOOK] Registration error:', error);
    return null;
  }
}

/**
 * Register default webhooks on OAuth connection
 */
export async function registerDefaultWebhooks(
  userId: string,
  portalId: string,
  accessToken: string
): Promise<void> {
  const db = getDb();

  // Default webhook subscriptions
  const defaultSubscriptions: WebhookSubscription[] = [
    {
      eventType: 'contact.propertyChange',
      objectType: 'contact',
      propertyName: 'lifecyclestage',
    },
    {
      eventType: 'contact.creation',
      objectType: 'contact',
    },
    {
      eventType: 'deal.propertyChange',
      objectType: 'deal',
      propertyName: 'dealstage',
    },
  ];

  console.log(`[HUBSPOT_WEBHOOK] Registering ${defaultSubscriptions.length} default webhooks for user ${userId}`);

  for (const subscription of defaultSubscriptions) {
    const subscriptionId = await registerHubSpotWebhook(accessToken, portalId, subscription);

    if (subscriptionId) {
      // Store in database
      await db.insert(hubspotWebhooks).values({
        userId,
        hubspotPortalId: portalId,
        subscriptionId,
        eventType: subscription.eventType,
        objectType: subscription.objectType,
        propertyName: subscription.propertyName || null,
        status: 'active',
      });

      console.log(`[HUBSPOT_WEBHOOK] ✅ Webhook stored: ${subscription.eventType}`);
    }
  }
}

// =====================================================
// SIGNATURE VALIDATION
// =====================================================

/**
 * Validate HubSpot webhook signature
 * HubSpot sends X-HubSpot-Signature header with HMAC-SHA256 signature
 */
export function validateHubSpotSignature(
  requestBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    // HubSpot uses SHA-256 HMAC
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(requestBody)
      .digest('hex');

    // HubSpot signature format: sha256=<hash>
    const signatureHash = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatureHash)
    );
  } catch (error) {
    console.error('[HUBSPOT_WEBHOOK] Signature validation error:', error);
    return false;
  }
}

// =====================================================
// EVENT PROCESSING
// =====================================================

export interface HubSpotWebhookEvent {
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
  eventId: number;
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  subscriptionType: string;
  attemptNumber: number;
}

/**
 * Process HubSpot webhook event
 */
export async function processHubSpotEvent(event: HubSpotWebhookEvent): Promise<void> {
  const db = getDb();

  console.log(`[HUBSPOT_WEBHOOK] Processing event:`, {
    type: event.subscriptionType,
    objectId: event.objectId,
    propertyName: event.propertyName,
    portalId: event.portalId,
  });

  try {
    // Find webhook subscription in database
    const [webhook] = await db
      .select()
      .from(hubspotWebhooks)
      .where(
        and(
          eq(hubspotWebhooks.hubspotPortalId, event.portalId.toString()),
          eq(hubspotWebhooks.subscriptionId, event.subscriptionId.toString()),
          eq(hubspotWebhooks.status, 'active')
        )
      )
      .limit(1);

    if (!webhook) {
      console.warn(`[HUBSPOT_WEBHOOK] No active webhook found for subscription: ${event.subscriptionId}`);
      return;
    }

    // Update webhook trigger stats
    await db
      .update(hubspotWebhooks)
      .set({
        lastTriggeredAt: new Date(),
        triggerCount: (webhook.triggerCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(hubspotWebhooks.id, webhook.id));

    // Log the sync event
    await db.insert(hubspotSyncLogs).values({
      userId: webhook.userId,
      agentId: webhook.agentId || null,
      operation: 'webhook_received',
      objectType: webhook.objectType,
      objectId: event.objectId.toString(),
      status: 'success',
      requestPayload: event,
      responsePayload: { processed: true },
    });

    // Check if this event should trigger an agent execution
    const shouldTriggerAgent = shouldTriggerAgentExecution(event, webhook);

    if (shouldTriggerAgent && webhook.agentId) {
      console.log(`[HUBSPOT_WEBHOOK] Triggering agent execution for agentId: ${webhook.agentId}`);
      await triggerAgentFromWebhook(webhook.userId, webhook.agentId, event);
    }

  } catch (error: any) {
    console.error('[HUBSPOT_WEBHOOK] Event processing error:', error);

    // Log error in sync logs
    await db.insert(hubspotSyncLogs).values({
      userId: 'system',
      operation: 'webhook_error',
      objectType: 'webhook',
      objectId: event.subscriptionId.toString(),
      status: 'failed',
      requestPayload: event,
      errorMessage: error.message,
    });

    throw error;
  }
}

/**
 * Determine if event should trigger agent execution
 */
function shouldTriggerAgentExecution(
  event: HubSpotWebhookEvent,
  webhook: any
): boolean {
  // Example: Trigger on lifecycle stage change to 'customer'
  if (
    event.subscriptionType === 'contact.propertyChange' &&
    event.propertyName === 'lifecyclestage' &&
    event.propertyValue === 'customer'
  ) {
    return true;
  }

  // Example: Trigger on deal stage change to 'closedwon'
  if (
    event.subscriptionType === 'deal.propertyChange' &&
    event.propertyName === 'dealstage' &&
    event.propertyValue === 'closedwon'
  ) {
    return true;
  }

  // Example: Trigger on new contact creation
  if (event.subscriptionType === 'contact.creation') {
    return true;
  }

  return false;
}

/**
 * Trigger agent execution from webhook event
 */
async function triggerAgentFromWebhook(
  userId: string,
  agentId: string,
  event: HubSpotWebhookEvent
): Promise<void> {
  try {
    // Get HubSpot access token
    const db = getDb();
    const [connection] = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, 'hubspot'),
          eq(oauthConnections.isActive, true)
        )
      )
      .limit(1);

    if (!connection) {
      throw new Error('No active HubSpot connection found');
    }

    // Fetch contact/deal details from HubSpot
    const objectType = event.subscriptionType.includes('contact') ? 'contacts' : 'deals';
    const objectUrl = `https://api.hubapi.com/crm/v3/objects/${objectType}/${event.objectId}`;

    const objectResponse = await fetch(objectUrl, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
      },
    });

    if (!objectResponse.ok) {
      throw new Error(`Failed to fetch ${objectType} details`);
    }

    const objectData = await objectResponse.json();

    // Prepare input for agent
    const agentInput = {
      trigger: 'hubspot_webhook',
      eventType: event.subscriptionType,
      objectType,
      objectId: event.objectId,
      propertyName: event.propertyName,
      propertyValue: event.propertyValue,
      objectData: objectData.properties,
      timestamp: new Date(event.occurredAt).toISOString(),
    };

    // Queue agent execution via API
    const response = await fetch(`${APP_URL}/api/revolution/agents/${agentId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        input: agentInput,
        priority: 7, // Higher priority for webhook-triggered executions
        metadata: {
          triggeredBy: 'hubspot_webhook',
          eventId: event.eventId,
          portalId: event.portalId,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to queue agent execution');
    }

    const result = await response.json();
    console.log(`[HUBSPOT_WEBHOOK] ✅ Agent execution queued: ${result.execution?.id}`);

  } catch (error: any) {
    console.error('[HUBSPOT_WEBHOOK] Failed to trigger agent:', error);
    throw error;
  }
}

// =====================================================
// WEBHOOK MANAGEMENT
// =====================================================

/**
 * Get active webhooks for user
 */
export async function getUserWebhooks(userId: string) {
  const db = getDb();

  return await db
    .select()
    .from(hubspotWebhooks)
    .where(eq(hubspotWebhooks.userId, userId));
}

/**
 * Deactivate webhook
 */
export async function deactivateWebhook(webhookId: string, userId: string): Promise<void> {
  const db = getDb();

  const [webhook] = await db
    .select()
    .from(hubspotWebhooks)
    .where(
      and(
        eq(hubspotWebhooks.id, webhookId),
        eq(hubspotWebhooks.userId, userId)
      )
    )
    .limit(1);

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  // Get access token
  const [connection] = await db
    .select()
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, 'hubspot'),
        eq(oauthConnections.isActive, true)
      )
    )
    .limit(1);

  if (connection && webhook.subscriptionId) {
    // Delete from HubSpot
    try {
      await fetch(`https://api.hubapi.com/webhooks/v3/subscriptions/${webhook.subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      });
    } catch (error) {
      console.error('[HUBSPOT_WEBHOOK] Failed to delete from HubSpot:', error);
    }
  }

  // Mark as inactive in database
  await db
    .update(hubspotWebhooks)
    .set({
      status: 'inactive',
      updatedAt: new Date(),
    })
    .where(eq(hubspotWebhooks.id, webhookId));

  console.log(`[HUBSPOT_WEBHOOK] Deactivated webhook: ${webhookId}`);
}
