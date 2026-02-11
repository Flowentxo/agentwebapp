/**
 * Pipeline Modify API
 *
 * Phase IV: Chat-based pipeline modification via natural language.
 * Takes the current pipeline state + a modification prompt,
 * returns a modified pipeline for user preview before applying.
 *
 * POST /api/pipelines/[id]/modify
 */

import { NextRequest, NextResponse } from "next/server";
import { modifyPipeline } from "@/server/services/workflow/PipelineModifier";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const body = await req.json();
    const { currentNodes, currentEdges, modificationPrompt } = body;

    if (!modificationPrompt || typeof modificationPrompt !== "string") {
      return NextResponse.json(
        { error: "modificationPrompt is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(currentNodes) || !Array.isArray(currentEdges)) {
      return NextResponse.json(
        { error: "currentNodes and currentEdges arrays are required" },
        { status: 400 }
      );
    }

    const result = await modifyPipeline({
      currentNodes,
      currentEdges,
      modificationPrompt: modificationPrompt.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      modifiedNodes: result.modifiedNodes,
      modifiedEdges: result.modifiedEdges,
      explanation: result.explanation,
      changes: result.changes,
    });
  } catch (error: any) {
    console.error("[PIPELINE_MODIFY_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to modify pipeline", message: error.message },
      { status: 500 }
    );
  }
}
