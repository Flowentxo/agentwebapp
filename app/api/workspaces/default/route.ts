import { NextRequest, NextResponse } from 'next/server';
import { workspaceManager } from '@/lib/platform/workspace-manager';
import { getSession } from '@/lib/auth/session';

/**
 * GET /api/workspaces/default
 * Get or create user's default workspace
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const isDev = process.env.NODE_ENV !== 'production';

    if (!session || !session.user?.id) {
      if (isDev) {
        const now = new Date().toISOString();
        const workspace = {
          id: 'demo-workspace',
          userId: 'demo-user',
          name: 'Demo Workspace',
          description: 'Local demo workspace (no login required)',
          slug: 'demo-workspace',
          iconUrl: null,
          isDefault: true,
          settings: {},
          createdAt: now,
          updatedAt: now,
        };

        return NextResponse.json({ workspace, demo: true });
      }

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await workspaceManager.getDefaultWorkspace(session.user.id);

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('[WORKSPACE_DEFAULT_GET]', error);
    return NextResponse.json(
      { error: 'Failed to get default workspace' },
      { status: 500 }
    );
  }
}
