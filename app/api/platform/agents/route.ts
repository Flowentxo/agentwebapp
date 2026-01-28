import { NextRequest, NextResponse } from 'next/server';
import { agentConnector } from '@/lib/platform/agent-connector';
import { getSession } from '@/lib/auth/session';

/**
 * GET /api/platform/agents
 * List all external agents
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any;

    const agents = await agentConnector.listAgents({
      status,
      userId: session.user.id,
    });

    return NextResponse.json({
      agents,
      total: agents.length,
    });
  } catch (error) {
    console.error('Failed to list agents:', error);
    return NextResponse.json(
      { error: 'Failed to list agents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/platform/agents
 * Register a new external agent
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.id || !body.name || !body.endpoint || !body.apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, endpoint, apiKey' },
        { status: 400 }
      );
    }

    const agent = await agentConnector.registerAgent(
      {
        id: body.id,
        name: body.name,
        description: body.description,
        endpoint: body.endpoint,
        apiKey: body.apiKey,
        capabilities: body.capabilities || [],
        version: body.version,
        iconUrl: body.iconUrl,
        config: body.config || {},
      },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      agent,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to register agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register agent' },
      { status: 500 }
    );
  }
}
