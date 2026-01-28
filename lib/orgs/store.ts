import { randomUUID } from "node:crypto";
import { Principal, hasAdminStar, hasScope, Scope } from "@/lib/auth/store";

// ====== Types ======
export type OrgRole = "owner" | "admin" | "member" | "viewer";

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  createdBy?: string; // userId or email
}

export interface Membership {
  id: string;
  orgId: string;
  userId?: string; // if user principal
  email: string; // user's email or service account identifier
  role: OrgRole;
  invitedAt: string;
  invitedBy?: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
}

// ====== In-memory stores ======
const orgs = new Map<string, Organization>();
const memberships = new Map<string, Membership>(); // key: membershipId
const projects = new Map<string, Project>();

// Index: orgId → Set<membershipId>
const orgMembersIndex = new Map<string, Set<string>>();
// Index: email → Set<membershipId>
const emailMembersIndex = new Map<string, Set<string>>();
// Index: orgId → Set<projectId>
const orgProjectsIndex = new Map<string, Set<string>>();

// ====== Helpers ======
function addToIndex<K>(map: Map<K, Set<string>>, key: K, value: string) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(value);
}

function removeFromIndex<K>(map: Map<K, Set<string>>, key: K, value: string) {
  const set = map.get(key);
  if (set) {
    set.delete(value);
    if (set.size === 0) map.delete(key);
  }
}

// ====== Organizations ======
export function createOrganization(input: {
  name: string;
  createdBy?: string;
}): Organization {
  const org: Organization = {
    id: `org-${randomUUID()}`,
    name: input.name,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };

  orgs.set(org.id, org);
  return org;
}

export function getOrganization(orgId: string): Organization | undefined {
  return orgs.get(orgId);
}

export function listOrganizations(): Organization[] {
  return Array.from(orgs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ====== Memberships ======
export function addMembership(input: {
  orgId: string;
  email: string;
  role: OrgRole;
  userId?: string;
  invitedBy?: string;
}): Membership {
  const membership: Membership = {
    id: `mem-${randomUUID()}`,
    orgId: input.orgId,
    userId: input.userId,
    email: input.email,
    role: input.role,
    invitedAt: new Date().toISOString(),
    invitedBy: input.invitedBy,
  };

  memberships.set(membership.id, membership);
  addToIndex(orgMembersIndex, input.orgId, membership.id);
  addToIndex(emailMembersIndex, input.email, membership.id);

  return membership;
}

export function getMembership(membershipId: string): Membership | undefined {
  return memberships.get(membershipId);
}

export function listMembershipsByOrg(orgId: string): Membership[] {
  const memberIds = orgMembersIndex.get(orgId) || new Set();
  return Array.from(memberIds)
    .map((id) => memberships.get(id)!)
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(a.invitedAt).getTime() - new Date(b.invitedAt).getTime()
    );
}

export function listMembershipsByEmail(email: string): Membership[] {
  const memberIds = emailMembersIndex.get(email) || new Set();
  return Array.from(memberIds)
    .map((id) => memberships.get(id)!)
    .filter(Boolean);
}

export function updateMembershipRole(
  membershipId: string,
  newRole: OrgRole
): Membership | undefined {
  const mem = memberships.get(membershipId);
  if (!mem) return undefined;

  mem.role = newRole;
  return mem;
}

export function removeMembership(membershipId: string): boolean {
  const mem = memberships.get(membershipId);
  if (!mem) return false;

  removeFromIndex(orgMembersIndex, mem.orgId, membershipId);
  removeFromIndex(emailMembersIndex, mem.email, membershipId);
  memberships.delete(membershipId);

  return true;
}

// ====== Projects ======
export function createProject(input: {
  orgId: string;
  name: string;
  description?: string;
  createdBy?: string;
}): Project {
  const project: Project = {
    id: `proj-${randomUUID()}`,
    orgId: input.orgId,
    name: input.name,
    description: input.description,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };

  projects.set(project.id, project);
  addToIndex(orgProjectsIndex, input.orgId, project.id);

  return project;
}

export function getProject(projectId: string): Project | undefined {
  return projects.get(projectId);
}

export function listProjectsByOrg(orgId: string): Project[] {
  const projectIds = orgProjectsIndex.get(orgId) || new Set();
  return Array.from(projectIds)
    .map((id) => projects.get(id)!)
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function listAllProjects(): Project[] {
  return Array.from(projects.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ====== Guards ======
export interface GuardError extends Error {
  status: number;
  code: string;
}

function createGuardError(
  status: number,
  code: string,
  message: string
): GuardError {
  const err = new Error(message) as GuardError;
  err.status = status;
  err.code = code;
  return err;
}

/**
 * requireOrgMember: Ensures principal has membership in org with minimum role.
 * Throws GuardError if not authorized.
 *
 * Role hierarchy: owner > admin > member > viewer
 */
export function requireOrgMember(
  principal: Principal,
  orgId: string,
  minRole: OrgRole = "viewer"
): Membership {
  if (principal.type === "anonymous") {
    throw createGuardError(401, "unauthenticated", "Authentication required");
  }

  // Principals with admin:* can access any org as owner (regardless of type)
  if (hasAdminStar(principal)) {
    // Return synthetic membership for admin:* principals
    return {
      id: "admin-star",
      orgId,
      email: principal.user?.email || "admin@system",
      role: "owner",
      invitedAt: new Date().toISOString(),
    };
  }

  // Check org exists
  const org = getOrganization(orgId);
  if (!org) {
    throw createGuardError(404, "org_not_found", "Organization not found");
  }

  // Find membership by email (user principals have email in user field)
  const email = principal.type === "user" ? principal.user?.email : undefined;

  if (!email) {
    throw createGuardError(403, "forbidden", "No email found in principal");
  }

  const membershipsForUser = listMembershipsByEmail(email);
  const membership = membershipsForUser.find((m) => m.orgId === orgId);

  if (!membership) {
    throw createGuardError(
      403,
      "not_member",
      `Not a member of organization ${orgId}`
    );
  }

  // Check role hierarchy
  const roleRank: Record<OrgRole, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  if (roleRank[membership.role] < roleRank[minRole]) {
    throw createGuardError(
      403,
      "insufficient_role",
      `Requires ${minRole} role, but user has ${membership.role}`
    );
  }

  return membership;
}

/**
 * requireProjectAccess: Ensures principal has both:
 * 1. Membership in project's organization with minimum role
 * 2. Required scopes (e.g., agents:run)
 *
 * Throws GuardError if not authorized.
 */
export function requireProjectAccess(
  principal: Principal,
  projectId: string,
  minRole: OrgRole = "member",
  requiredScopes: Scope[] = []
): { project: Project; membership: Membership } {
  const project = getProject(projectId);
  if (!project) {
    throw createGuardError(404, "project_not_found", "Project not found");
  }

  // Check organization membership
  const membership = requireOrgMember(principal, project.orgId, minRole);

  // Check scopes (admin:* wildcard covers all scopes)
  if (requiredScopes.length > 0) {
    const hasAllScopes = requiredScopes.every((scope) =>
      hasScope(principal, scope)
    );

    if (!hasAllScopes) {
      throw createGuardError(
        403,
        "insufficient_scopes",
        `Missing required scopes: ${requiredScopes.join(", ")}`
      );
    }
  }

  return { project, membership };
}

// ====== Test-only reset ======
export async function resetForTests() {
  try {
    orgs.clear();
    memberships.clear();
    projects.clear();
    orgMembersIndex.clear();
    emailMembersIndex.clear();
    orgProjectsIndex.clear();
  } catch {}
}
