/**
 * REVOLUTION WEBHOOKS MANAGEMENT API
 *
 * GET /api/revolution/webhooks - Get user's active webhooks
 * DELETE /api/revolution/webhooks/:id - Deactivate a webhook
 *
 * Allows users to view and manage their HubSpot webhook subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserWebhooks, deactivateWebhook } from '@/lib/services/hubspot-webhook-service';

export const dynamic = 'force-dynamic';

/**
 * GET - List user's webhooks
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Missing user ID',
          message: 'x-user-id header is required',
        },
        { status: 400 }
      );
    }

    const webhooks = await getUserWebhooks(userId);

    return NextResponse.json({
      success: true,
      count: webhooks.length,
      webhooks: webhooks.map((w) => ({
        id: w.id,
        eventType: w.eventType,
        objectType: w.objectType,
        propertyName: w.propertyName,
        status: w.status,
        hubspotPortalId: w.hubspotPortalId,
        subscriptionId: w.subscriptionId,
        triggerCount: w.triggerCount,
        lastTriggeredAt: w.lastTriggeredAt,
        agentId: w.agentId,
        createdAt: w.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[WEBHOOKS_GET]', error);
    return NextResponse.json(
      {
        error: 'Failed to get webhooks',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Deactivate a webhook
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Missing user ID',
          message: 'x-user-id header is required',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        {
          error: 'Missing webhook ID',
          message: 'Webhook ID is required',
        },
        { status: 400 }
      );
    }

    await deactivateWebhook(webhookId, userId);

    return NextResponse.json({
      success: true,
      message: 'Webhook deactivated successfully',
    });
  } catch (error: any) {
    console.error('[WEBHOOKS_DELETE]', error);
    return NextResponse.json(
      {
        error: 'Failed to deactivate webhook',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
