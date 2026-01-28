import { NextRequest } from 'next/server';
import type { UserRole } from '@/lib/knowledge/acl';

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  orgId?: string;
  teamId?: string;
}

/**
 * Get current user from request
 * In production, this would validate JWT/session
 * For now, accepts header-based auth for development
 */
export function getCurrentUser(req: NextRequest): CurrentUser {
  // Check for user ID in header (dev mode)
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role') as UserRole;
  const userEmail = req.headers.get('x-user-email');

  if (userId) {
    return {
      id: userId,
      email: userEmail || `${userId}@sintra.local`,
      role: userRole || 'user',
      orgId: req.headers.get('x-org-id') || undefined,
      teamId: req.headers.get('x-team-id') || undefined,
    };
  }

  // TODO: In production, extract from JWT token
  // const token = req.headers.get('authorization')?.replace('Bearer ', '');
  // const decoded = verifyJWT(token);
  // return decoded.user;

  // Fallback: system user
  return {
    id: 'system',
    email: 'system@sintra.local',
    role: 'admin',
  };
}

/**
 * Require authentication (throws if no user)
 */
export function requireAuth(req: NextRequest): CurrentUser {
  const user = getCurrentUser(req);

  if (!user || user.id === 'system') {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Require specific role (throws if insufficient)
 */
export function requireRole(req: NextRequest, minRole: UserRole): CurrentUser {
  const user = requireAuth(req);

  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    editor: 2,
    reviewer: 3,
    admin: 4,
  };

  if (roleHierarchy[user.role] < roleHierarchy[minRole]) {
    throw new Error(`Insufficient permissions. Required: ${minRole}, Got: ${user.role}`);
  }

  return user;
}
