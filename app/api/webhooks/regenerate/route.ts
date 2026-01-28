/**
 * WEBHOOK SECRET REGENERATION API
 *
 * POST /api/webhooks/regenerate
 *
 * Regenerates webhook secret for a workflow (invalidates old secret)
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookService } from '@/server/services/WebhookService';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body = await req.json();

    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json(
        {
          error: 'Workflow ID is required',
        },
        { status: 400 }
      );
    }

    // Regenerate secret
    const { secret } = await webhookService.regenerateSecret(workflowId, userId);

    // Generate new webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/webhooks/${workflowId}/${secret}`;

    return NextResponse.json({
      success: true,
      secret, // ⚠️ Only shown once!
      webhookUrl,
      message: '⚠️ Old secret invalidated. Save this new secret! It will not be shown again.',
    });
  } catch (error: any) {
    console.error('[WEBHOOK_REGENERATE_API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to regenerate webhook secret',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
