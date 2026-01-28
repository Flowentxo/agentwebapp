import { NextRequest, NextResponse } from 'next/server';
import { agentConnector } from '@/lib/platform/agent-connector';
import { getSession } from '@/lib/auth/session';

/**
 * POST /api/platform/agents/[id]/health
 * Trigger health check for agent
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isHealthy = await agentConnector.healthCheck(params.id);

    return NextResponse.json({
      success: true,
      agentId: params.id,
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}
