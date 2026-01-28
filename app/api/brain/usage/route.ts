/**
 * Brain AI - AI Usage Tracking API
 *
 * GET /api/brain/usage - Get usage statistics
 * POST /api/brain/usage - Track usage (internal)
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiUsageTracker } from '@/lib/brain/AIUsageTracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Get usage statistics
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const workspaceId = req.nextUrl.searchParams.get('workspaceId') || 'default-workspace';
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');
    const includeRecent = req.nextUrl.searchParams.get('includeRecent') === 'true';

    // Calculate date range
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    // Get stats
    const stats = await aiUsageTracker.getStats(workspaceId, {
      userId,
      from,
      to,
    });

    // Get user-specific usage
    const userUsage = await aiUsageTracker.getUserUsage(workspaceId, userId, days);

    // Get recent records if requested
    let recentRecords;
    if (includeRecent) {
      recentRecords = await aiUsageTracker.getRecentUsage(workspaceId, 20);
    }

    return NextResponse.json({
      success: true,
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        days,
      },
      stats,
      userUsage,
      recentRecords,
    });
  } catch (error) {
    console.error('[USAGE_API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    );
  }
}

interface TrackUsageRequest {
  model: string;
  provider: string;
  operation: string;
  tokensPrompt: number;
  tokensCompletion: number;
  latencyMs?: number;
  success?: boolean;
  errorMessage?: string;
  context?: {
    agentId?: string;
    feature?: string;
    sessionId?: string;
  };
}

/**
 * POST - Track usage (internal use)
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user';
    const body: TrackUsageRequest = await req.json();

    const workspaceId = 'default-workspace';

    await aiUsageTracker.track({
      workspaceId,
      userId,
      model: body.model,
      provider: body.provider as 'openai' | 'google' | 'anthropic',
      operation: body.operation as 'query' | 'generate' | 'embed' | 'summarize' | 'standup' | 'classify' | 'extract' | 'translate' | 'chat',
      tokensPrompt: body.tokensPrompt,
      tokensCompletion: body.tokensCompletion,
      latencyMs: body.latencyMs,
      success: body.success ?? true,
      errorMessage: body.errorMessage,
      context: body.context,
    });

    return NextResponse.json({
      success: true,
      message: 'Usage tracked',
    });
  } catch (error) {
    console.error('[USAGE_API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to track usage' },
      { status: 500 }
    );
  }
}
