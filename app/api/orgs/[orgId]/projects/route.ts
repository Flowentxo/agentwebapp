import { NextRequest, NextResponse } from "next/server";
import { principalFromRequest } from "@/lib/auth/store";
import {
  requireOrgMember,
  listProjectsByOrg,
  createProject,
} from "@/lib/orgs/store";

// Force Node.js runtime (crypto module required by auth)
export const runtime = "nodejs";

/**
 * GET /api/orgs/:orgId/projects
 * List all projects in the organization (requires viewer access)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const pr = principalFromRequest(req);
  const { orgId } = params;

  try {
    // Require at least viewer access
    requireOrgMember(pr, orgId, "viewer");
  } catch (e: any) {
    return NextResponse.json(
      { error: e.code || "forbidden" },
      { status: e.status || 403 }
    );
  }

  const projects = listProjectsByOrg(orgId);
  return NextResponse.json(projects, { status: 200 });
}

/**
 * POST /api/orgs/:orgId/projects
 * Create a new project (requires member access)
 *
 * Body: { name: string, description?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const pr = principalFromRequest(req);
  const { orgId } = params;

  try {
    // Require at least member access to create projects
    requireOrgMember(pr, orgId, "member");
  } catch (e: any) {
    return NextResponse.json(
      { error: e.code || "forbidden" },
      { status: e.status || 403 }
    );
  }

  const { name, description } = await req.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const creatorEmail = pr.user?.email || "system";

  const project = createProject({
    orgId,
    name: name.trim(),
    description: description?.trim(),
    createdBy: creatorEmail,
  });

  return NextResponse.json(project, { status: 201 });
}
