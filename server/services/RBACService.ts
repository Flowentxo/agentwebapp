/**
 * ROLE-BASED ACCESS CONTROL SERVICE
 *
 * Manages roles, permissions, and access control
 */

import { getDb } from '@/lib/db';
import {
  roles,
  userRoles,
  permissions,
  workspacePermissions,
  auditLogs,
  Role,
  NewRole,
  UserRole,
  NewUserRole,
  Permission,
  AuditLog,
} from '@/lib/db/schema-rbac';
import { eq, and, or, inArray } from 'drizzle-orm';

// ============================================================
// SYSTEM ROLES (Pre-defined)
// ============================================================

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
  GUEST: 'guest',
} as const;

// ============================================================
// PERMISSION DEFINITIONS
// ============================================================

export const PERMISSIONS = {
  // Workflows
  WORKFLOWS_CREATE: 'workflows.create',
  WORKFLOWS_READ: 'workflows.read',
  WORKFLOWS_UPDATE: 'workflows.update',
  WORKFLOWS_DELETE: 'workflows.delete',
  WORKFLOWS_EXECUTE: 'workflows.execute',
  WORKFLOWS_PUBLISH: 'workflows.publish',

  // Agents
  AGENTS_CREATE: 'agents.create',
  AGENTS_READ: 'agents.read',
  AGENTS_UPDATE: 'agents.update',
  AGENTS_DELETE: 'agents.delete',
  AGENTS_CHAT: 'agents.chat',

  // Users
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_INVITE: 'users.invite',

  // Roles & Permissions
  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_GRANT: 'roles.grant',
  ROLES_REVOKE: 'roles.revoke',

  // Workspaces
  WORKSPACES_CREATE: 'workspaces.create',
  WORKSPACES_READ: 'workspaces.read',
  WORKSPACES_UPDATE: 'workspaces.update',
  WORKSPACES_DELETE: 'workspaces.delete',
  WORKSPACES_MANAGE_MEMBERS: 'workspaces.manage_members',

  // Knowledge Base
  KNOWLEDGE_UPLOAD: 'knowledge.upload',
  KNOWLEDGE_READ: 'knowledge.read',
  KNOWLEDGE_DELETE: 'knowledge.delete',
  KNOWLEDGE_SEARCH: 'knowledge.search',

  // Integrations
  INTEGRATIONS_CREATE: 'integrations.create',
  INTEGRATIONS_READ: 'integrations.read',
  INTEGRATIONS_UPDATE: 'integrations.update',
  INTEGRATIONS_DELETE: 'integrations.delete',

  // System
  SYSTEM_ADMIN: 'system.admin',
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_LOGS: 'system.logs',
  SYSTEM_AUDIT: 'system.audit',
} as const;

// ============================================================
// ROLE PERMISSION MAPPINGS
// ============================================================

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [SYSTEM_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [SYSTEM_ROLES.ADMIN]: [
    PERMISSIONS.WORKFLOWS_CREATE,
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_UPDATE,
    PERMISSIONS.WORKFLOWS_DELETE,
    PERMISSIONS.WORKFLOWS_EXECUTE,
    PERMISSIONS.WORKFLOWS_PUBLISH,
    PERMISSIONS.AGENTS_CREATE,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.AGENTS_UPDATE,
    PERMISSIONS.AGENTS_DELETE,
    PERMISSIONS.AGENTS_CHAT,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_INVITE,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.WORKSPACES_READ,
    PERMISSIONS.WORKSPACES_UPDATE,
    PERMISSIONS.WORKSPACES_MANAGE_MEMBERS,
    PERMISSIONS.KNOWLEDGE_UPLOAD,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_DELETE,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.INTEGRATIONS_CREATE,
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.INTEGRATIONS_UPDATE,
    PERMISSIONS.INTEGRATIONS_DELETE,
  ],

  [SYSTEM_ROLES.MEMBER]: [
    PERMISSIONS.WORKFLOWS_CREATE,
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_UPDATE,
    PERMISSIONS.WORKFLOWS_EXECUTE,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.AGENTS_CHAT,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.WORKSPACES_READ,
    PERMISSIONS.KNOWLEDGE_UPLOAD,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.INTEGRATIONS_READ,
  ],

  [SYSTEM_ROLES.VIEWER]: [
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.WORKSPACES_READ,
    PERMISSIONS.KNOWLEDGE_READ,
    PERMISSIONS.KNOWLEDGE_SEARCH,
    PERMISSIONS.INTEGRATIONS_READ,
  ],

  [SYSTEM_ROLES.GUEST]: [
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.AGENTS_READ,
  ],
};

// ============================================================
// RBAC SERVICE
// ============================================================

export class RBACService {
  private db = getDb();

  /**
   * Initialize system roles
   */
  async initializeSystemRoles(): Promise<void> {
    console.log('[RBAC] Initializing system roles...');

    const systemRoles = [
      {
        name: SYSTEM_ROLES.SUPER_ADMIN,
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        type: 'system',
        permissions: ROLE_PERMISSIONS[SYSTEM_ROLES.SUPER_ADMIN],
      },
      {
        name: SYSTEM_ROLES.ADMIN,
        displayName: 'Administrator',
        description: 'Workspace administration and management',
        type: 'system',
        permissions: ROLE_PERMISSIONS[SYSTEM_ROLES.ADMIN],
      },
      {
        name: SYSTEM_ROLES.MEMBER,
        displayName: 'Member',
        description: 'Standard workspace member',
        type: 'system',
        permissions: ROLE_PERMISSIONS[SYSTEM_ROLES.MEMBER],
      },
      {
        name: SYSTEM_ROLES.VIEWER,
        displayName: 'Viewer',
        description: 'Read-only access',
        type: 'system',
        permissions: ROLE_PERMISSIONS[SYSTEM_ROLES.VIEWER],
      },
      {
        name: SYSTEM_ROLES.GUEST,
        displayName: 'Guest',
        description: 'Limited guest access',
        type: 'system',
        permissions: ROLE_PERMISSIONS[SYSTEM_ROLES.GUEST],
      },
    ];

    for (const role of systemRoles) {
      try {
        const existing = await this.db
          .select()
          .from(roles)
          .where(eq(roles.name, role.name))
          .limit(1);

        if (existing.length === 0) {
          await this.db.insert(roles).values(role);
          console.log(`[RBAC] Created system role: ${role.name}`);
        }
      } catch (error) {
        console.error(`[RBAC] Failed to create role ${role.name}:`, error);
      }
    }

    console.log('[RBAC] System roles initialized');
  }

  /**
   * Grant role to user
   */
  async grantRole(
    userId: string,
    roleName: string,
    workspaceId?: string,
    grantedBy?: string,
    expiresAt?: Date
  ): Promise<UserRole> {
    // Find role
    const [role] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    // Check if user already has this role
    const existing = await this.db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, role.id),
          workspaceId ? eq(userRoles.workspaceId, workspaceId) : undefined
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    // Grant role
    const [userRole] = await this.db
      .insert(userRoles)
      .values({
        userId,
        roleId: role.id,
        workspaceId,
        grantedBy,
        expiresAt,
      })
      .returning();

    console.log(`[RBAC] Granted role ${roleName} to user ${userId}`);

    return userRole;
  }

  /**
   * Revoke role from user
   */
  async revokeRole(
    userId: string,
    roleName: string,
    workspaceId?: string
  ): Promise<void> {
    // Find role
    const [role] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    // Revoke role
    await this.db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, role.id),
          workspaceId ? eq(userRoles.workspaceId, workspaceId) : undefined
        )
      );

    console.log(`[RBAC] Revoked role ${roleName} from user ${userId}`);
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string, workspaceId?: string): Promise<Role[]> {
    const query = this.db
      .select({ role: roles })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          workspaceId ? eq(userRoles.workspaceId, workspaceId) : undefined
        )
      );

    const results = await query;
    return results.map((r) => r.role);
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(
    userId: string,
    workspaceId?: string
  ): Promise<string[]> {
    const userRolesList = await this.getUserRoles(userId, workspaceId);

    const allPermissions = new Set<string>();

    for (const role of userRolesList) {
      const rolePermissions = role.permissions as string[];
      rolePermissions.forEach((p) => allPermissions.add(p));
    }

    return Array.from(allPermissions);
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    workspaceId?: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, workspaceId);
    return (
      permissions.includes(permission) ||
      permissions.includes(PERMISSIONS.SYSTEM_ADMIN)
    );
  }

  /**
   * Check if user has any of the permissions
   */
  async hasAnyPermission(
    userId: string,
    permissionsList: string[],
    workspaceId?: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, workspaceId);

    return (
      permissions.includes(PERMISSIONS.SYSTEM_ADMIN) ||
      permissionsList.some((p) => permissions.includes(p))
    );
  }

  /**
   * Check if user has all permissions
   */
  async hasAllPermissions(
    userId: string,
    permissionsList: string[],
    workspaceId?: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, workspaceId);

    if (permissions.includes(PERMISSIONS.SYSTEM_ADMIN)) {
      return true;
    }

    return permissionsList.every((p) => permissions.includes(p));
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(log: {
    userId?: string;
    workspaceId?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    status: 'success' | 'failure' | 'denied';
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    changes?: any;
  }): Promise<AuditLog> {
    const [auditLog] = await this.db.insert(auditLogs).values(log).returning();

    return auditLog;
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters: {
    userId?: string;
    workspaceId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    const { userId, workspaceId, action, resource, limit = 100 } = filters;

    const conditions = [];

    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (workspaceId) conditions.push(eq(auditLogs.workspaceId, workspaceId));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (resource) conditions.push(eq(auditLogs.resource, resource));

    const logs = await this.db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(auditLogs.timestamp)
      .limit(limit);

    return logs;
  }

  /**
   * Create custom role
   */
  async createRole(role: {
    name: string;
    displayName: string;
    description?: string;
    workspaceId?: string;
    permissions: string[];
  }): Promise<Role> {
    const [newRole] = await this.db
      .insert(roles)
      .values({
        ...role,
        type: 'custom',
      })
      .returning();

    console.log(`[RBAC] Created custom role: ${role.name}`);

    return newRole;
  }

  /**
   * Get all roles
   */
  async getRoles(workspaceId?: string): Promise<Role[]> {
    const query = this.db.select().from(roles);

    if (workspaceId) {
      return await query.where(
        or(eq(roles.workspaceId, workspaceId), eq(roles.type, 'system'))
      );
    }

    return await query;
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const rbacService = new RBACService();
