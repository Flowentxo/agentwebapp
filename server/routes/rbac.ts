/**
 * RBAC API ROUTES
 *
 * Endpoints for role and permission management
 */

import { Router, Request, Response } from 'express';
import { rbacService, SYSTEM_ROLES, PERMISSIONS } from '../services/RBACService';
import { policyEngineService, PolicyType } from '../services/PolicyEngineService';
import { requirePermission, requireAdmin } from '../middleware/permission-middleware';

const router = Router();

// ============================================================
// ROLES ENDPOINTS
// ============================================================

/**
 * GET /api/rbac/roles
 * Get all roles
 */
router.get('/roles', requirePermission(PERMISSIONS.ROLES_READ), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string;

    const roles = await rbacService.getRoles(workspaceId);

    res.json({
      success: true,
      roles,
      count: roles.length,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to get roles:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/rbac/roles
 * Create custom role
 */
router.post('/roles', requirePermission(PERMISSIONS.ROLES_CREATE), async (req: Request, res: Response) => {
  try {
    const { name, displayName, description, permissions } = req.body;
    const workspaceId = req.headers['x-workspace-id'] as string;

    if (!name || !displayName || !permissions) {
      return res.status(400).json({
        success: false,
        error: 'name, displayName, and permissions are required',
      });
    }

    const role = await rbacService.createRole({
      name,
      displayName,
      description,
      workspaceId,
      permissions,
    });

    res.json({
      success: true,
      role,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to create role:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/rbac/roles/grant
 * Grant role to user
 */
router.post('/roles/grant', requirePermission(PERMISSIONS.ROLES_GRANT), async (req: Request, res: Response) => {
  try {
    const { userId, roleName, expiresAt } = req.body;
    const workspaceId = req.headers['x-workspace-id'] as string;
    const grantedBy = req.headers['x-user-id'] as string;

    if (!userId || !roleName) {
      return res.status(400).json({
        success: false,
        error: 'userId and roleName are required',
      });
    }

    const userRole = await rbacService.grantRole(
      userId,
      roleName,
      workspaceId,
      grantedBy,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.json({
      success: true,
      userRole,
      message: `Role ${roleName} granted to user ${userId}`,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to grant role:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/rbac/roles/revoke
 * Revoke role from user
 */
router.post('/roles/revoke', requirePermission(PERMISSIONS.ROLES_REVOKE), async (req: Request, res: Response) => {
  try {
    const { userId, roleName } = req.body;
    const workspaceId = req.headers['x-workspace-id'] as string;

    if (!userId || !roleName) {
      return res.status(400).json({
        success: false,
        error: 'userId and roleName are required',
      });
    }

    await rbacService.revokeRole(userId, roleName, workspaceId);

    res.json({
      success: true,
      message: `Role ${roleName} revoked from user ${userId}`,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to revoke role:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/rbac/users/:userId/roles
 * Get user roles
 */
router.get('/users/:userId/roles', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string;

    const roles = await rbacService.getUserRoles(userId, workspaceId);

    res.json({
      success: true,
      roles,
      count: roles.length,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to get user roles:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/rbac/users/:userId/permissions
 * Get user permissions
 */
router.get('/users/:userId/permissions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const workspaceId = req.headers['x-workspace-id'] as string;

    const permissions = await rbacService.getUserPermissions(userId, workspaceId);

    res.json({
      success: true,
      permissions,
      count: permissions.length,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to get user permissions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/rbac/check-permission
 * Check if user has permission
 */
router.post('/check-permission', async (req: Request, res: Response) => {
  try {
    const { userId, permission } = req.body;
    const workspaceId = req.headers['x-workspace-id'] as string;

    if (!userId || !permission) {
      return res.status(400).json({
        success: false,
        error: 'userId and permission are required',
      });
    }

    const hasPermission = await rbacService.hasPermission(userId, permission, workspaceId);

    res.json({
      success: true,
      hasPermission,
      permission,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to check permission:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// POLICIES ENDPOINTS
// ============================================================

/**
 * GET /api/rbac/policies
 * Get all policies
 */
router.get('/policies', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const workspaceId = req.headers['x-workspace-id'] as string;

    const policies = await policyEngineService.getActivePolicies(
      type as PolicyType,
      workspaceId
    );

    res.json({
      success: true,
      policies,
      count: policies.length,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to get policies:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/rbac/policies
 * Create policy
 */
router.post('/policies', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { name, type, config, actions } = req.body;
    const workspaceId = req.headers['x-workspace-id'] as string;
    const createdBy = req.headers['x-user-id'] as string;

    if (!name || !type || !config || !actions) {
      return res.status(400).json({
        success: false,
        error: 'name, type, config, and actions are required',
      });
    }

    const policy = await policyEngineService.createPolicy({
      name,
      type,
      workspaceId,
      config,
      actions,
      createdBy,
    });

    res.json({
      success: true,
      policy,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to create policy:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/rbac/policies/:id
 * Update policy
 */
router.put('/policies/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, enabled, config, actions } = req.body;

    const policy = await policyEngineService.updatePolicy(id, {
      name,
      enabled,
      config,
      actions,
    });

    res.json({
      success: true,
      policy,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to update policy:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/rbac/policies/:id
 * Delete policy
 */
router.delete('/policies/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await policyEngineService.deletePolicy(id);

    res.json({
      success: true,
      message: 'Policy deleted',
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to delete policy:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/rbac/policies/check-content
 * Check content against policies
 */
router.post('/policies/check-content', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const workspaceId = req.headers['x-workspace-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content is required',
      });
    }

    const result = await policyEngineService.checkContent(content, workspaceId, userId);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to check content:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/rbac/violations
 * Get policy violations
 */
router.get('/violations', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { userId, policyId, severity, limit } = req.query;
    const workspaceId = req.headers['x-workspace-id'] as string;

    const violations = await policyEngineService.getViolations({
      userId: userId as string,
      workspaceId,
      policyId: policyId as string,
      severity: severity as any,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      violations,
      count: violations.length,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to get violations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// AUDIT LOGS ENDPOINTS
// ============================================================

/**
 * GET /api/rbac/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', requirePermission(PERMISSIONS.SYSTEM_AUDIT), async (req: Request, res: Response) => {
  try {
    const { userId, action, resource, limit } = req.query;
    const workspaceId = req.headers['x-workspace-id'] as string;

    const logs = await rbacService.getAuditLogs({
      userId: userId as string,
      workspaceId,
      action: action as string,
      resource: resource as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to get audit logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/rbac/permissions/list
 * Get available permissions
 */
router.get('/permissions/list', async (req: Request, res: Response) => {
  try {
    const permissionsList = Object.values(PERMISSIONS).map((permission) => ({
      name: permission,
      displayName: permission.replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    }));

    res.json({
      success: true,
      permissions: permissionsList,
      count: permissionsList.length,
    });
  } catch (error: any) {
    console.error('[RBAC_API] Failed to get permissions list:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
