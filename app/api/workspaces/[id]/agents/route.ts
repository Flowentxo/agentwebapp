import { NextRequest, NextResponse } from 'next/server';
import { workspaceManager } from '@/lib/platform/workspace-manager';
import { getSession } from '@/lib/auth/session';

/**
 * GET /api/workspaces/[id]/agents
 * Get workspace agents
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workspace access
    const hasAccess = await workspaceManager.hasAccess(params.id, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const agents = await workspaceManager.getAllWorkspaceAgents(params.id);

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('[WORKSPACE_AGENTS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to get workspace agents' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workspaces/[id]/agents
 * Update workspace agent status
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workspace access
    const hasAccess = await workspaceManager.hasAccess(params.id, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    if (!body.agentId || typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'agentId and enabled are required' },
        { status: 400 }
      );
    }

    await workspaceManager.updateWorkspaceAgent(
      params.id,
      body.agentId,
      body.enabled
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WORKSPACE_AGENTS_PUT]', error);
    return NextResponse.json(
      { error: 'Failed to update workspace agents' },
      { status: 500 }
    );
  }
}
