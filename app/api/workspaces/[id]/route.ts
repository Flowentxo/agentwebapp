import { NextRequest, NextResponse } from 'next/server';
import { workspaceStore } from '@/lib/stores/workspace-store';

/**
 * GET /api/workspaces/[id]
 * Get workspace details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspace = workspaceStore.getById(id);

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workspace,
      agents: [],
      stats: { enabledAgents: 0, totalAgents: 0, knowledgeItems: 0 },
    });
  } catch (error) {
    console.error('[WORKSPACE_GET]', error);
    return NextResponse.json(
      { error: 'Failed to get workspace' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workspaces/[id]
 * Update workspace
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, iconUrl, settings } = body;

    const updatedWorkspace = workspaceStore.update(id, {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(iconUrl !== undefined && { iconUrl }),
      ...(settings && { settings }),
    });

    if (!updatedWorkspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workspace: updatedWorkspace,
      message: 'Workspace updated successfully',
    });
  } catch (error) {
    console.error('[WORKSPACE_PUT]', error);
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]
 * Delete workspace
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if it's the default workspace
    if (id === 'default-workspace') {
      return NextResponse.json(
        { error: 'Der Standard-Workspace kann nicht gelöscht werden' },
        { status: 400 }
      );
    }

    // Try to delete from store (will succeed even if not found)
    workspaceStore.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  } catch (error) {
    console.error('[WORKSPACE_DELETE]', error);

    if (error instanceof Error) {
      if (error.message.includes('Standard-Workspace')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}
