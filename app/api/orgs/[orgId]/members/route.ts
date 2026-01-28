import { NextRequest, NextResponse } from "next/server";
import { principalFromRequest } from "@/lib/auth/store";
import {
  requireOrgMember,
  listMembershipsByOrg,
  addMembership,
  updateMembershipRole,
  getMembership,
  OrgRole,
} from "@/lib/orgs/store";

// Force Node.js runtime (crypto module required by auth)
export const runtime = "nodejs";

/**
 * GET /api/orgs/:orgId/members
 * List all members of the organization (requires viewer access)
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

  const members = listMembershipsByOrg(orgId);
  return NextResponse.json(members, { status: 200 });
}

/**
 * POST /api/orgs/:orgId/members
 * Invite a new member (requires admin access)
 *
 * Body: { email: string, role: OrgRole }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const pr = principalFromRequest(req);
  const { orgId } = params;

  try {
    // Require admin access to invite members
    requireOrgMember(pr, orgId, "admin");
  } catch (e: any) {
    return NextResponse.json(
      { error: e.code || "forbidden" },
      { status: e.status || 403 }
    );
  }

  const { email, role } = await req.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  if (!role || !["owner", "admin", "member", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Valid role required" }, { status: 400 });
  }

  const inviterEmail = pr.user?.email || "system";

  const membership = addMembership({
    orgId,
    email: email.trim(),
    role: role as OrgRole,
    invitedBy: inviterEmail,
  });

  return NextResponse.json(membership, { status: 201 });
}

/**
 * PATCH /api/orgs/:orgId/members
 * Update member role (requires admin access)
 *
 * Body: { membershipId: string, role: OrgRole }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const pr = principalFromRequest(req);
  const { orgId } = params;

  try {
    // Require admin access to update roles
    requireOrgMember(pr, orgId, "admin");
  } catch (e: any) {
    return NextResponse.json(
      { error: e.code || "forbidden" },
      { status: e.status || 403 }
    );
  }

  const { membershipId, role } = await req.json();

  if (!membershipId || typeof membershipId !== "string") {
    return NextResponse.json(
      { error: "membershipId required" },
      { status: 400 }
    );
  }

  if (!role || !["owner", "admin", "member", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Valid role required" }, { status: 400 });
  }

  const membership = getMembership(membershipId);
  if (!membership || membership.orgId !== orgId) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 }
    );
  }

  const updated = updateMembershipRole(membershipId, role as OrgRole);
  return NextResponse.json(updated, { status: 200 });
}
