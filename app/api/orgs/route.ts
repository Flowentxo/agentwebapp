import { NextRequest, NextResponse } from "next/server";
import { principalFromRequest } from "@/lib/auth/store";
import {
  createOrganization,
  listOrganizations,
  addMembership,
} from "@/lib/orgs/store";

// Force Node.js runtime (crypto module required by auth)
export const runtime = "nodejs";

/**
 * GET /api/orgs
 * List all organizations (could be filtered by membership in future)
 */
export async function GET(req: NextRequest) {
  const pr = principalFromRequest(req);

  // Anonymous users can't list orgs
  if (pr.type === "anonymous") {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const orgs = listOrganizations();
  return NextResponse.json(orgs, { status: 200 });
}

/**
 * POST /api/orgs
 * Create a new organization and add creator as owner
 *
 * Body: { name: string }
 */
export async function POST(req: NextRequest) {
  const pr = principalFromRequest(req);

  // Anonymous users can't create orgs
  if (pr.type === "anonymous") {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { name } = await req.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Organization name is required" },
      { status: 400 }
    );
  }

  const email = pr.user?.email;
  const userId = pr.user?.id;

  if (!email) {
    return NextResponse.json(
      { error: "Email not found in principal" },
      { status: 400 }
    );
  }

  // Create organization
  const org = createOrganization({
    name: name.trim(),
    createdBy: email,
  });

  // Add creator as owner
  const membership = addMembership({
    orgId: org.id,
    email,
    userId,
    role: "owner",
    invitedBy: email,
  });

  return NextResponse.json(
    {
      org,
      membership,
    },
    { status: 201 }
  );
}
