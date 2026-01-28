/**
 * Single Pipeline API
 *
 * Get, update, delete individual pipelines
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { workflows, workflowExecutions } from "@/lib/db/schema-workflows";
import { eq, and, desc } from "drizzle-orm";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

async function getAuthenticatedUser(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  try {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}

/**
 * GET - Get single pipeline with execution history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pipelineId = params.id;

    // Validate UUID format
    if (!isValidUUID(pipelineId)) {
      return NextResponse.json({ error: "Invalid pipeline ID" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Get pipeline details using Drizzle
    const [pipeline] = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.id, pipelineId),
          eq(workflows.userId, user.id)
        )
      )
      .limit(1);

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Get recent executions
    const executions = await db
      .select({
        id: workflowExecutions.id,
        status: workflowExecutions.status,
        startedAt: workflowExecutions.startedAt,
        completedAt: workflowExecutions.completedAt,
        error: workflowExecutions.error,
        isTest: workflowExecutions.isTest,
        createdAt: workflowExecutions.createdAt,
      })
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, pipelineId))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(20);

    return NextResponse.json({
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        nodes: pipeline.nodes,
        edges: pipeline.edges,
        viewport: pipeline.viewport,
        status: pipeline.status,
        version: pipeline.version,
        isPublished: pipeline.isPublished,
        publishedVersion: pipeline.publishedVersion,
        executionCount: pipeline.executionCount,
        lastExecutedAt: pipeline.lastExecutedAt,
        createdAt: pipeline.createdAt,
        updatedAt: pipeline.updatedAt,
      },
      executions
    });
  } catch (error) {
    console.error("[PIPELINE_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get pipeline" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update pipeline
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pipelineId = params.id;

    // Validate UUID format
    if (!isValidUUID(pipelineId)) {
      return NextResponse.json({ error: "Invalid pipeline ID" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const body = await req.json();

    // Check if pipeline exists and belongs to user
    const [existing] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(
        and(
          eq(workflows.id, pipelineId),
          eq(workflows.userId, user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Build update object
    const updateData: Partial<{
      name: string;
      description: string | null;
      nodes: any[];
      edges: any[];
      viewport: { x: number; y: number; zoom: number };
      status: 'draft' | 'active' | 'archived';
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description || null;
    }
    if (body.nodes !== undefined) {
      updateData.nodes = body.nodes;
    }
    if (body.edges !== undefined) {
      updateData.edges = body.edges;
    }
    if (body.viewport !== undefined) {
      updateData.viewport = body.viewport;
    }
    if (body.status !== undefined && ['draft', 'active', 'archived'].includes(body.status)) {
      updateData.status = body.status;
    }

    // Perform update
    const [updated] = await db
      .update(workflows)
      .set(updateData)
      .where(
        and(
          eq(workflows.id, pipelineId),
          eq(workflows.userId, user.id)
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      pipeline: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        nodes: updated.nodes,
        edges: updated.edges,
        viewport: updated.viewport,
        status: updated.status,
        version: updated.version,
        isPublished: updated.isPublished,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      }
    });
  } catch (error) {
    console.error("[PIPELINE_PUT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update pipeline" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete pipeline
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pipelineId = params.id;

    // Validate UUID format
    if (!isValidUUID(pipelineId)) {
      return NextResponse.json({ error: "Invalid pipeline ID" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Check if pipeline exists and belongs to user
    const [existing] = await db
      .select({ id: workflows.id })
      .from(workflows)
      .where(
        and(
          eq(workflows.id, pipelineId),
          eq(workflows.userId, user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Delete executions first (cascade should handle this, but being explicit)
    await db
      .delete(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, pipelineId));

    // Delete pipeline
    await db
      .delete(workflows)
      .where(
        and(
          eq(workflows.id, pipelineId),
          eq(workflows.userId, user.id)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Pipeline deleted"
    });
  } catch (error) {
    console.error("[PIPELINE_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete pipeline" },
      { status: 500 }
    );
  }
}
