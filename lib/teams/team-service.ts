/**
 * TEAM MANAGEMENT SERVICE
 *
 * Enterprise team features:
 * - Team creation and management
 * - Member invitations
 * - Role-based access control
 * - Team workspaces
 * - Usage tracking per team
 */

import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

// ============================================
// TYPES
// ============================================

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  plan: "free" | "pro" | "enterprise";
  memberLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
  email: string;
  name?: string;
  avatar?: string;
  joinedAt: string;
  lastActiveAt?: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: "admin" | "member" | "viewer";
  token: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface TeamUsage {
  teamId: string;
  period: string;
  agentCalls: number;
  tokensUsed: number;
  storageUsedMb: number;
  membersActive: number;
}

// ============================================
// TEAM SERVICE
// ============================================

export class TeamService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Create a new team
   */
  async createTeam(data: {
    name: string;
    description?: string;
    avatar?: string;
  }): Promise<Team> {
    const db = getDb();

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug exists
    const existing = await db.execute(sql`
      SELECT id FROM teams WHERE slug = ${slug}
    `);

    const rows = existing as unknown as Array<{ id: string }>;
    const finalSlug = rows.length > 0 ? `${slug}-${Date.now()}` : slug;

    // Create team
    const teamId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO teams (id, name, slug, description, avatar, owner_id, plan, member_limit, created_at, updated_at)
      VALUES (${teamId}, ${data.name}, ${finalSlug}, ${data.description || null}, ${data.avatar || null}, ${this.userId}, 'free', 5, NOW(), NOW())
    `);

    // Add owner as member
    await db.execute(sql`
      INSERT INTO team_members (id, team_id, user_id, role, joined_at)
      VALUES (${crypto.randomUUID()}, ${teamId}, ${this.userId}, 'owner', NOW())
    `);

    return this.getTeam(teamId) as Promise<Team>;
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    const db = getDb();

    const result = await db.execute(sql`
      SELECT * FROM teams WHERE id = ${teamId}
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    if (!rows[0]) return null;

    return {
      id: rows[0].id as string,
      name: rows[0].name as string,
      slug: rows[0].slug as string,
      description: rows[0].description as string | undefined,
      avatar: rows[0].avatar as string | undefined,
      ownerId: rows[0].owner_id as string,
      plan: rows[0].plan as Team["plan"],
      memberLimit: rows[0].member_limit as number,
      createdAt: rows[0].created_at as string,
      updatedAt: rows[0].updated_at as string,
    };
  }

  /**
   * Get user's teams
   */
  async getUserTeams(): Promise<Team[]> {
    const db = getDb();

    const result = await db.execute(sql`
      SELECT t.* FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ${this.userId}
      ORDER BY t.created_at DESC
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string | undefined,
      avatar: row.avatar as string | undefined,
      ownerId: row.owner_id as string,
      plan: row.plan as Team["plan"],
      memberLimit: row.member_limit as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));
  }

  /**
   * Update team
   */
  async updateTeam(
    teamId: string,
    data: Partial<Pick<Team, "name" | "description" | "avatar">>
  ): Promise<Team | null> {
    // Check permission
    const member = await this.getMemberRole(teamId);
    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Error("Not authorized to update team");
    }

    const db = getDb();

    const updates: string[] = [];
    if (data.name) updates.push(`name = '${data.name}'`);
    if (data.description !== undefined)
      updates.push(`description = ${data.description ? `'${data.description}'` : "NULL"}`);
    if (data.avatar !== undefined)
      updates.push(`avatar = ${data.avatar ? `'${data.avatar}'` : "NULL"}`);

    if (updates.length > 0) {
      await db.execute(sql`
        UPDATE teams
        SET ${sql.raw(updates.join(", "))}, updated_at = NOW()
        WHERE id = ${teamId}
      `);
    }

    return this.getTeam(teamId);
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string): Promise<boolean> {
    // Check if owner
    const member = await this.getMemberRole(teamId);
    if (!member || member.role !== "owner") {
      throw new Error("Only the owner can delete the team");
    }

    const db = getDb();

    // Delete all related data
    await db.execute(sql`DELETE FROM team_invites WHERE team_id = ${teamId}`);
    await db.execute(sql`DELETE FROM team_members WHERE team_id = ${teamId}`);
    await db.execute(sql`DELETE FROM teams WHERE id = ${teamId}`);

    return true;
  }

  // ============================================
  // MEMBER MANAGEMENT
  // ============================================

  /**
   * Get team members
   */
  async getMembers(teamId: string): Promise<TeamMember[]> {
    const db = getDb();

    const result = await db.execute(sql`
      SELECT tm.*, u.email, u.name, u.avatar
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ${teamId}
      ORDER BY
        CASE tm.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
          ELSE 4
        END,
        tm.joined_at ASC
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as string,
      teamId: row.team_id as string,
      userId: row.user_id as string,
      role: row.role as TeamMember["role"],
      email: row.email as string,
      name: row.name as string | undefined,
      avatar: row.avatar as string | undefined,
      joinedAt: row.joined_at as string,
      lastActiveAt: row.last_active_at as string | undefined,
    }));
  }

  /**
   * Get member role
   */
  async getMemberRole(teamId: string): Promise<{ role: TeamMember["role"] } | null> {
    const db = getDb();

    const result = await db.execute(sql`
      SELECT role FROM team_members
      WHERE team_id = ${teamId} AND user_id = ${this.userId}
    `);

    const rows = result as unknown as Array<{ role: string }>;
    return rows[0] ? { role: rows[0].role as TeamMember["role"] } : null;
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: "admin" | "member" | "viewer"
  ): Promise<boolean> {
    // Check permission
    const currentMember = await this.getMemberRole(teamId);
    if (!currentMember || !["owner", "admin"].includes(currentMember.role)) {
      throw new Error("Not authorized to update member roles");
    }

    // Can't change owner role
    const db = getDb();
    const targetResult = await db.execute(sql`
      SELECT role FROM team_members WHERE id = ${memberId}
    `);
    const targetRows = targetResult as unknown as Array<{ role: string }>;
    if (targetRows[0]?.role === "owner") {
      throw new Error("Cannot change owner role");
    }

    await db.execute(sql`
      UPDATE team_members SET role = ${newRole} WHERE id = ${memberId}
    `);

    return true;
  }

  /**
   * Remove member from team
   */
  async removeMember(teamId: string, memberId: string): Promise<boolean> {
    // Check permission
    const currentMember = await this.getMemberRole(teamId);
    if (!currentMember || !["owner", "admin"].includes(currentMember.role)) {
      throw new Error("Not authorized to remove members");
    }

    // Can't remove owner
    const db = getDb();
    const targetResult = await db.execute(sql`
      SELECT role FROM team_members WHERE id = ${memberId}
    `);
    const targetRows = targetResult as unknown as Array<{ role: string }>;
    if (targetRows[0]?.role === "owner") {
      throw new Error("Cannot remove team owner");
    }

    await db.execute(sql`
      DELETE FROM team_members WHERE id = ${memberId}
    `);

    return true;
  }

  // ============================================
  // INVITATIONS
  // ============================================

  /**
   * Invite member to team
   */
  async inviteMember(
    teamId: string,
    email: string,
    role: "admin" | "member" | "viewer" = "member"
  ): Promise<TeamInvite> {
    // Check permission
    const currentMember = await this.getMemberRole(teamId);
    if (!currentMember || !["owner", "admin"].includes(currentMember.role)) {
      throw new Error("Not authorized to invite members");
    }

    // Check team member limit
    const team = await this.getTeam(teamId);
    const members = await this.getMembers(teamId);
    if (team && members.length >= team.memberLimit) {
      throw new Error("Team member limit reached");
    }

    const db = getDb();

    // Check if already a member
    const existingMember = await db.execute(sql`
      SELECT tm.id FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ${teamId} AND u.email = ${email}
    `);
    const existingRows = existingMember as unknown as Array<{ id: string }>;
    if (existingRows.length > 0) {
      throw new Error("User is already a team member");
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const inviteId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO team_invites (id, team_id, email, role, token, invited_by, expires_at)
      VALUES (${inviteId}, ${teamId}, ${email}, ${role}, ${token}, ${this.userId}, ${expiresAt.toISOString()})
    `);

    return {
      id: inviteId,
      teamId,
      email,
      role,
      token,
      invitedBy: this.userId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Accept invitation
   */
  async acceptInvite(token: string): Promise<{ teamId: string; teamName: string }> {
    const db = getDb();

    // Find invite
    const inviteResult = await db.execute(sql`
      SELECT ti.*, t.name as team_name
      FROM team_invites ti
      INNER JOIN teams t ON ti.team_id = t.id
      WHERE ti.token = ${token} AND ti.accepted_at IS NULL
    `);

    const inviteRows = inviteResult as unknown as Array<Record<string, unknown>>;
    if (!inviteRows[0]) {
      throw new Error("Invalid or expired invitation");
    }

    const invite = inviteRows[0];

    // Check expiration
    if (new Date(invite.expires_at as string) < new Date()) {
      throw new Error("Invitation has expired");
    }

    // Add as member
    await db.execute(sql`
      INSERT INTO team_members (id, team_id, user_id, role, joined_at)
      VALUES (${crypto.randomUUID()}, ${invite.team_id}, ${this.userId}, ${invite.role}, NOW())
    `);

    // Mark invite as accepted
    await db.execute(sql`
      UPDATE team_invites SET accepted_at = NOW() WHERE id = ${invite.id}
    `);

    return {
      teamId: invite.team_id as string,
      teamName: invite.team_name as string,
    };
  }

  /**
   * Get pending invites for team
   */
  async getPendingInvites(teamId: string): Promise<TeamInvite[]> {
    const db = getDb();

    const result = await db.execute(sql`
      SELECT * FROM team_invites
      WHERE team_id = ${teamId}
        AND accepted_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: row.id as string,
      teamId: row.team_id as string,
      email: row.email as string,
      role: row.role as TeamInvite["role"],
      token: row.token as string,
      invitedBy: row.invited_by as string,
      expiresAt: row.expires_at as string,
    }));
  }

  /**
   * Cancel invitation
   */
  async cancelInvite(inviteId: string): Promise<boolean> {
    const db = getDb();
    await db.execute(sql`
      DELETE FROM team_invites WHERE id = ${inviteId}
    `);
    return true;
  }

  // ============================================
  // USAGE TRACKING
  // ============================================

  /**
   * Get team usage stats
   */
  async getUsage(teamId: string, period?: string): Promise<TeamUsage | null> {
    const db = getDb();
    const currentPeriod = period || new Date().toISOString().slice(0, 7); // YYYY-MM

    const result = await db.execute(sql`
      SELECT * FROM team_usage
      WHERE team_id = ${teamId} AND period = ${currentPeriod}
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    if (!rows[0]) {
      return {
        teamId,
        period: currentPeriod,
        agentCalls: 0,
        tokensUsed: 0,
        storageUsedMb: 0,
        membersActive: 0,
      };
    }

    return {
      teamId: rows[0].team_id as string,
      period: rows[0].period as string,
      agentCalls: rows[0].agent_calls as number,
      tokensUsed: rows[0].tokens_used as number,
      storageUsedMb: rows[0].storage_used_mb as number,
      membersActive: rows[0].members_active as number,
    };
  }

  /**
   * Track usage
   */
  async trackUsage(
    teamId: string,
    data: { agentCalls?: number; tokensUsed?: number; storageUsedMb?: number }
  ): Promise<void> {
    const db = getDb();
    const period = new Date().toISOString().slice(0, 7);

    await db.execute(sql`
      INSERT INTO team_usage (team_id, period, agent_calls, tokens_used, storage_used_mb, members_active)
      VALUES (${teamId}, ${period}, ${data.agentCalls || 0}, ${data.tokensUsed || 0}, ${data.storageUsedMb || 0}, 1)
      ON CONFLICT (team_id, period)
      DO UPDATE SET
        agent_calls = team_usage.agent_calls + ${data.agentCalls || 0},
        tokens_used = team_usage.tokens_used + ${data.tokensUsed || 0},
        storage_used_mb = GREATEST(team_usage.storage_used_mb, ${data.storageUsedMb || 0}),
        updated_at = NOW()
    `);
  }
}

// Export factory
export function createTeamService(userId: string): TeamService {
  return new TeamService(userId);
}
