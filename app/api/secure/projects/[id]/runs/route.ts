import { NextRequest, NextResponse } from "next/server";
import { principalFromRequest } from "@/lib/auth/store";
import { requireProjectAccess } from "@/lib/orgs/store";
import { runsStore } from "@/lib/agents/store";

// Force Node.js runtime (crypto module required by auth)
export const runtime = "nodejs";

/**
 * POST /api/secure/projects/:id/runs
 * Create an agent run within a project
 *
 * Requires:
 * 1. Membership in project's organization (at least member role)
 * 2. agents:run scope
 *
 * Body: { agentId: string, input?: any }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pr = principalFromRequest(req);
  const projectId = params.id;

  try {
    // Dual guard: membership + scopes
    const { project } = requireProjectAccess(
      pr,
      projectId,
      "member", // minimum role
      ["agents:run"] // required scopes
    );

    const { agentId, input } = await req.json();

    if (!agentId || typeof agentId !== "string") {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    // Create agent run with project context
    const run = runsStore.createRun(agentId, input);

    return NextResponse.json(
      {
        ok: true,
        runId: run.id,
        projectId: project.id,
        projectName: project.name,
        orgId: project.orgId,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e.code || "forbidden", message: e.message },
      { status: e.status || 403 }
    );
  }
}
