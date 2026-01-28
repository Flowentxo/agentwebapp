import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

/**
 * GET /api/workspaces
 * List user's workspaces
 */
export async function GET(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  const now = new Date().toISOString();

  // Demo workspace for development/fallback
  const demoWorkspace = {
    id: 'demo-workspace',
    userId: 'demo-user',
    name: 'Demo Workspace',
    description: 'Local demo workspace',
    slug: 'demo-workspace',
    iconUrl: null,
    isDefault: true,
    settings: {},
    createdAt: now,
    updatedAt: now,
  };

  try {
    let sessionData = null;

    try {
      sessionData = await getSession();
    } catch (sessionError) {
      console.warn('[WORKSPACES_GET] Session error, using demo mode:', sessionError);
      // In dev mode, return demo workspace if session fails
      if (isDev) {
        return NextResponse.json({
          workspaces: [demoWorkspace],
          total: 1,
          demo: true,
        });
      }
    }

    if (!sessionData || !sessionData.user?.id) {
      if (isDev) {
        return NextResponse.json({
          workspaces: [demoWorkspace],
          total: 1,
          demo: true,
        });
      }

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to load workspaces from database
    try {
      const { workspaceManager } = await import('@/lib/platform/workspace-manager');
      let workspaces = await workspaceManager.listWorkspaces(sessionData.user.id);

      // Ensure at least one workspace exists for signed-in users
      if (workspaces.length === 0) {
        const created = await workspaceManager.getDefaultWorkspace(sessionData.user.id);
        workspaces = [created];
      }

      return NextResponse.json({
        workspaces,
        total: workspaces.length,
      });
    } catch (dbError) {
      console.warn('[WORKSPACES_GET] Database error, using fallback:', dbError);

      // Return user-specific fallback workspace
      const userWorkspace = {
        ...demoWorkspace,
        id: `ws-${sessionData.user.id}`,
        userId: sessionData.user.id,
        name: `${sessionData.user.displayName || 'My'} Workspace`,
        description: 'Your personal workspace',
      };

      return NextResponse.json({
        workspaces: [userWorkspace],
        total: 1,
        fallback: true,
      });
    }
  } catch (error) {
    console.error('[WORKSPACES_GET]', error);

    // In dev mode, always return demo workspace on error
    if (isDev) {
      return NextResponse.json({
        workspaces: [demoWorkspace],
        total: 1,
        demo: true,
        error: 'Fallback mode due to error',
      });
    }

    return NextResponse.json(
      { error: 'Failed to list workspaces' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces
 * Create new workspace
 */
export async function POST(req: NextRequest) {
  try {
    const sessionData = await getSession();
    const isDev = process.env.NODE_ENV !== 'production';

    const body = await req.json();

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    if (!sessionData || !sessionData.user?.id) {
      if (isDev) {
        const now = new Date().toISOString();
        const workspace = {
          id: 'demo-workspace',
          userId: 'demo-user',
          name: body.name.trim(),
          description: body.description?.trim() || 'Local workspace (demo)',
          slug: body.slug || 'demo-workspace',
          iconUrl: body.iconUrl || null,
          isDefault: true,
          settings: {},
          createdAt: now,
          updatedAt: now,
        };

        return NextResponse.json({ workspace, demo: true }, { status: 201 });
      }

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await workspaceManager.createWorkspace(sessionData.user.id, {
      name: body.name.trim(),
      description: body.description?.trim(),
      slug: body.slug,
      iconUrl: body.iconUrl,
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('[WORKSPACES_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
