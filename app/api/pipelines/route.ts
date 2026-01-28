/**
 * Pipelines API
 *
 * Manage and monitor workflow pipelines:
 * - List all pipelines/workflows
 * - Create new pipelines
 * - Get execution history
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { workflows } from "@/lib/db/schema-workflows";
import { eq, desc, sql } from "drizzle-orm";

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
 * GET - List all pipelines with their latest execution status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // draft, active, archived, all
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const db = getDb();

    // Build query with filters
    let query = db
      .select({
        id: workflows.id,
        name: workflows.name,
        description: workflows.description,
        status: workflows.status,
        nodes: workflows.nodes,
        edges: workflows.edges,
        viewport: workflows.viewport,
        isPublished: workflows.isPublished,
        version: workflows.version,
        publishedVersion: workflows.publishedVersion,
        executionCount: workflows.executionCount,
        lastExecutedAt: workflows.lastExecutedAt,
        createdAt: workflows.createdAt,
        updatedAt: workflows.updatedAt,
      })
      .from(workflows)
      .where(eq(workflows.userId, user.id))
      .orderBy(desc(workflows.updatedAt))
      .limit(limit)
      .offset(offset);

    const pipelinesList = await query;

    // Get running executions count
    const [runningCount] = await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM workflow_executions we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE w.user_id = ${user.id} AND we.status = 'running'
    `);

    return NextResponse.json({
      pipelines: pipelinesList,
      meta: {
        total: pipelinesList.length,
        running: (runningCount as { count: number })?.count || 0,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error("[PIPELINES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get pipelines" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new pipeline/workflow
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      nodes = [],
      edges = [],
      viewport = { x: 0, y: 0, zoom: 1 }
    } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const db = getDb();

    const [pipeline] = await db
      .insert(workflows)
      .values({
        userId: user.id,
        name: name.trim(),
        description: description || null,
        nodes: nodes,
        edges: edges,
        viewport: viewport,
        status: 'draft',
        version: '1.0.0',
        isPublished: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
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
        createdAt: pipeline.createdAt,
        updatedAt: pipeline.updatedAt,
      }
    });
  } catch (error) {
    console.error("[PIPELINES_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create pipeline" },
      { status: 500 }
    );
  }
}
