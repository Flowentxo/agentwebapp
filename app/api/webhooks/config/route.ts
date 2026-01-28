/**
 * WEBHOOK CONFIGURATION API
 *
 * Manages webhook configurations for workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookService } from '@/server/services/WebhookService';

/**
 * GET /api/webhooks/config?workflowId={id}
 *
 * Get webhook configuration for a workflow
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get('workflowId');
    const userId = req.headers.get('x-user-id') || 'demo-user';

    if (!workflowId) {
      return NextResponse.json(
        {
          error: 'Workflow ID is required',
        },
        { status: 400 }
      );
    }

    const config = await webhookService.getWebhookConfig(workflowId, userId);

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message: 'No webhook configuration found for this workflow',
          hasWebhook: false,
        },
        { status: 404 }
      );
    }

    // Generate webhook URL (without secret)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/webhooks/${workflowId}/****`;

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        webhookUrl, // URL with masked secret
      },
      hasWebhook: true,
    });
  } catch (error: any) {
    console.error('[WEBHOOK_CONFIG_API] GET Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get webhook configuration',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks/config
 *
 * Create webhook configuration for a workflow
 * Returns the plaintext secret (ONLY shown once!)
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body = await req.json();

    const { workflowId, description, allowedIps, rateLimitPerMinute } = body;

    if (!workflowId) {
      return NextResponse.json(
        {
          error: 'Workflow ID is required',
        },
        { status: 400 }
      );
    }

    // Create webhook config
    const { secret, config } = await webhookService.createWebhookConfig(workflowId, userId, {
      description,
      allowedIps,
      rateLimitPerMinute,
    });

    // Generate full webhook URL with secret
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/webhooks/${workflowId}/${secret}`;

    return NextResponse.json({
      success: true,
      secret, // ⚠️ IMPORTANT: Only shown once!
      webhookUrl, // Full URL with secret
      config,
      message: '⚠️ Save this secret! It will not be shown again.',
    });
  } catch (error: any) {
    console.error('[WEBHOOK_CONFIG_API] POST Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create webhook configuration',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/webhooks/config
 *
 * Update webhook configuration
 */
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body = await req.json();

    const { workflowId, enabled, description, allowedIps, rateLimitPerMinute } = body;

    if (!workflowId) {
      return NextResponse.json(
        {
          error: 'Workflow ID is required',
        },
        { status: 400 }
      );
    }

    const updated = await webhookService.updateWebhookConfig(workflowId, userId, {
      enabled,
      description,
      allowedIps,
      rateLimitPerMinute,
    });

    return NextResponse.json({
      success: true,
      config: updated,
    });
  } catch (error: any) {
    console.error('[WEBHOOK_CONFIG_API] PATCH Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to update webhook configuration',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks/config?workflowId={id}
 *
 * Delete webhook configuration
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get('workflowId');
    const userId = req.headers.get('x-user-id') || 'demo-user';

    if (!workflowId) {
      return NextResponse.json(
        {
          error: 'Workflow ID is required',
        },
        { status: 400 }
      );
    }

    await webhookService.deleteWebhookConfig(workflowId, userId);

    return NextResponse.json({
      success: true,
      message: 'Webhook configuration deleted',
    });
  } catch (error: any) {
    console.error('[WEBHOOK_CONFIG_API] DELETE Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete webhook configuration',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
