/**
 * PERMISSION MIDDLEWARE
 *
 * Express middleware for RBAC permission checking
 */

import { Request, Response, NextFunction } from 'express';
import { rbacService, PERMISSIONS } from '../services/RBACService';

// Extend Express Request to include user and workspace
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      workspaceId?: string;
    }
  }
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId || req.headers['x-user-id'] as string;
      const workspaceId = req.workspaceId || req.headers['x-workspace-id'] as string;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required',
        });
      }

      const hasPermission = await rbacService.hasPermission(
        userId,
        permission,
        workspaceId
      );

      if (!hasPermission) {
        // Log audit trail
        await rbacService.createAuditLog({
          userId,
          workspaceId,
          action: req.method + ' ' + req.path,
          resource: req.baseUrl,
          status: 'denied',
          metadata: {
            requiredPermission: permission,
            reason: 'insufficient_permissions',
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Missing required permission: ${permission}`,
        });
      }

      // Log successful access
      await rbacService.createAuditLog({
        userId,
        workspaceId,
        action: req.method + ' ' + req.path,
        resource: req.baseUrl,
        status: 'success',
        metadata: {
          permission,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      next();
    } catch (error: any) {
      console.error('[PERMISSION_MIDDLEWARE] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId || req.headers['x-user-id'] as string;
      const workspaceId = req.workspaceId || req.headers['x-workspace-id'] as string;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required',
        });
      }

      const hasPermission = await rbacService.hasAnyPermission(
        userId,
        permissions,
        workspaceId
      );

      if (!hasPermission) {
        await rbacService.createAuditLog({
          userId,
          workspaceId,
          action: req.method + ' ' + req.path,
          resource: req.baseUrl,
          status: 'denied',
          metadata: {
            requiredPermissions: permissions,
            reason: 'insufficient_permissions',
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Missing required permissions. Need one of: ${permissions.join(', ')}`,
        });
      }

      next();
    } catch (error: any) {
      console.error('[PERMISSION_MIDDLEWARE] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  };
}

/**
 * Middleware to require all specified permissions
 */
export function requireAllPermissions(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId || req.headers['x-user-id'] as string;
      const workspaceId = req.workspaceId || req.headers['x-workspace-id'] as string;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User authentication required',
        });
      }

      const hasPermission = await rbacService.hasAllPermissions(
        userId,
        permissions,
        workspaceId
      );

      if (!hasPermission) {
        await rbacService.createAuditLog({
          userId,
          workspaceId,
          action: req.method + ' ' + req.path,
          resource: req.baseUrl,
          status: 'denied',
          metadata: {
            requiredPermissions: permissions,
            reason: 'insufficient_permissions',
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Missing required permissions: ${permissions.join(', ')}`,
        });
      }

      next();
    } catch (error: any) {
      console.error('[PERMISSION_MIDDLEWARE] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin() {
  return requirePermission(PERMISSIONS.SYSTEM_ADMIN);
}

/**
 * Middleware to attach user permissions to request
 */
export async function attachUserPermissions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId || req.headers['x-user-id'] as string;
    const workspaceId = req.workspaceId || req.headers['x-workspace-id'] as string;

    if (userId) {
      const permissions = await rbacService.getUserPermissions(userId, workspaceId);
      req.headers['x-user-permissions'] = JSON.stringify(permissions);
    }

    next();
  } catch (error: any) {
    console.error('[PERMISSION_MIDDLEWARE] Error attaching permissions:', error);
    next(); // Continue even if permission attachment fails
  }
}

/**
 * Helper to extract userId and workspaceId from request
 */
export function extractUserContext(req: Request): {
  userId: string;
  workspaceId?: string;
} {
  const userId = req.userId || req.headers['x-user-id'] as string || 'anonymous';
  const workspaceId = req.workspaceId || req.headers['x-workspace-id'] as string;

  return { userId, workspaceId };
}
