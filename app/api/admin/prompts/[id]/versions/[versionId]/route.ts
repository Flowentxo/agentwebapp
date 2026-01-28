/**
 * PROMPT VERSION DETAIL API
 *
 * Phase 4.1 - Prompt Registry & Lab
 *
 * Endpoints for managing individual prompt versions.
 *
 * GET  /api/admin/prompts/[id]/versions/[versionId] - Get version details
 * POST /api/admin/prompts/[id]/versions/[versionId]/activate - Set as active
 * POST /api/admin/prompts/[id]/versions/[versionId]/rollback - Rollback to this version
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPromptService } from '@/server/services/PromptService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * GET /api/admin/prompts/[id]/versions/[versionId]
 *
 * Get details of a specific version including test results
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionId } = await params;
    const promptService = getPromptService();

    // Get the version
    const version = await promptService.getVersion(versionId);

    if (!version || version.promptId !== id) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    // Get test results for this version
    const testResults = await promptService.getTestResults(versionId, 10);

    return NextResponse.json({
      success: true,
      data: {
        ...version,
        testResults,
      },
    });
  } catch (error) {
    console.error('[PROMPT_VERSION_DETAIL_API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prompts/[id]/versions/[versionId]
 *
 * Perform actions on a version (activate or rollback)
 *
 * Body:
 * {
 *   action: 'activate' | 'rollback'
 * }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionId } = await params;
    const body = await req.json();
    const userId = req.headers.get('x-user-id') || 'system';

    const { action } = body;

    if (!action || !['activate', 'rollback'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "activate" or "rollback"' },
        { status: 400 }
      );
    }

    const promptService = getPromptService();

    // Check if version exists and belongs to this prompt
    const version = await promptService.getVersion(versionId);
    if (!version || version.promptId !== id) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    if (action === 'activate') {
      // Set this version as active
      await promptService.setActiveVersion(id, versionId);

      return NextResponse.json({
        success: true,
        message: `Version ${version.version} is now active`,
        data: {
          ...version,
          isActive: true,
        },
      });
    }

    if (action === 'rollback') {
      // Create a new version based on this one
      const newVersion = await promptService.rollbackToVersion(id, versionId, userId);

      return NextResponse.json({
        success: true,
        message: `Rolled back to version ${version.version}. Created new version ${newVersion.version}`,
        data: newVersion,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[PROMPT_VERSION_DETAIL_API] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
