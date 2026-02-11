/**
 * Pipeline Restore API
 *
 * Phase IV: Restore an archived pipeline back to draft status.
 *
 * POST /api/pipelines/[id]/restore
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { workflows } from "@/lib/db/schema-workflows";
import { eq, and } from "drizzle-orm";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pipelineId = params.id;

    if (!UUID_REGEX.test(pipelineId)) {
      return NextResponse.json({ error: "Invalid pipeline ID" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Verify user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check pipeline exists and is archived
    const [pipeline] = await db
      .select({ id: workflows.id, status: workflows.status })
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

    if (pipeline.status !== "archived") {
      return NextResponse.json(
        { error: "Pipeline is not archived" },
        { status: 400 }
      );
    }

    // Restore to draft
    const [restored] = await db
      .update(workflows)
      .set({ status: "draft", updatedAt: new Date() })
      .where(
        and(
          eq(workflows.id, pipelineId),
          eq(workflows.userId, user.id)
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      message: "Pipeline restored",
      pipeline: {
        id: restored.id,
        name: restored.name,
        status: restored.status,
      },
    });
  } catch (error) {
    console.error("[PIPELINE_RESTORE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to restore pipeline" },
      { status: 500 }
    );
  }
}
