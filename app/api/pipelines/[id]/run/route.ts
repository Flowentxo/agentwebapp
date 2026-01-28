/**
 * Pipeline Run API Endpoint
 *
 * POST /api/pipelines/[id]/run
 * Triggers execution of a workflow pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { workflows } from '@/lib/db/schema-workflows';
import { eq, and } from 'drizzle-orm';
import { WorkflowEngine } from '@/server/services/workflows/WorkflowEngine';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

/**
 * Get authenticated user from request
 */
async function getAuthenticatedUser(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;

  const db = getDb();
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user || { id: userId, email: 'demo@example.com' };
}

/**
 * POST /api/pipelines/[id]/run
 *
 * Execute a workflow pipeline
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid pipeline ID format' },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse optional trigger data from request body
    let triggerData: unknown = null;
    try {
      const body = await req.json();
      triggerData = body.triggerData || body.data || null;
    } catch {
      // No body provided, that's fine
    }

    const db = getDb();

    // Verify workflow exists and belongs to user
    const [workflow] = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        userId: workflows.userId,
      })
      .from(workflows)
      .where(
        and(
          eq(workflows.id, id),
          eq(workflows.userId, user.id)
        )
      )
      .limit(1);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    console.log(`[API:Run] Starting execution for pipeline: ${workflow.name} (${id})`);

    // Create engine instance and run
    const engine = new WorkflowEngine();
    const result = await engine.run(id, triggerData);

    // Update workflow execution count and last executed timestamp
    await db
      .update(workflows)
      .set({
        executionCount: (workflow as any).executionCount + 1 || 1,
        lastExecutedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, id));

    console.log(`[API:Run] Execution completed: ${result.status}`);

    return NextResponse.json({
      success: true,
      executionId: result.executionId,
      workflowId: result.workflowId,
      status: result.status,
      duration: result.duration,
      nodeCount: Object.keys(result.nodeResults).length,
      ...(result.error && { error: result.error }),
    });
  } catch (error) {
    console.error('[API:Run] Execution error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute pipeline',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
