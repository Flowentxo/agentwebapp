/**
 * RBAC & POLICY CLIENT API
 *
 * Client-side functions for role-based access control and policies
 */

import { apiClient } from './client';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: 'system' | 'custom' | 'workspace';
  workspaceId?: string;
  permissions: string[];
  metadata: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  workspaceId?: string;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface Permission {
  name: string;
  displayName: string;
}

export interface Policy {
  id: string;
  name: string;
  type: string;
  workspaceId?: string;
  enabled: boolean;
  config: any;
  actions: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyViolation {
  id: string;
  policyId: string;
  userId?: string;
  workspaceId?: string;
  resource?: string;
  resourceId?: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: any;
  blockedContent?: string;
  actionTaken?: string;
  detectedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  workspaceId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  status: 'success' | 'failure' | 'denied';
  metadata: any;
  ipAddress?: string;
  userAgent?: string;
  changes?: any;
  timestamp: string;
}

// ============================================================
// ROLES FUNCTIONS
// ============================================================

/**
 * Get all roles
 */
export async function getRoles(): Promise<{
  success: boolean;
  roles: Role[];
  count: number;
}> {
  const { data } = await apiClient.get('/rbac/roles');
  return data;
}

/**
 * Create custom role
 */
export async function createRole(role: {
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
}): Promise<{
  success: boolean;
  role: Role;
}> {
  const { data } = await apiClient.post('/rbac/roles', role);
  return data;
}

/**
 * Grant role to user
 */
export async function grantRole(options: {
  userId: string;
  roleName: string;
  expiresAt?: string;
}): Promise<{
  success: boolean;
  userRole: UserRole;
  message: string;
}> {
  const { data } = await apiClient.post('/rbac/roles/grant', options);
  return data;
}

/**
 * Revoke role from user
 */
export async function revokeRole(options: {
  userId: string;
  roleName: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.post('/rbac/roles/revoke', options);
  return data;
}

/**
 * Get user roles
 */
export async function getUserRoles(userId: string): Promise<{
  success: boolean;
  roles: Role[];
  count: number;
}> {
  const { data } = await apiClient.get(`/rbac/users/${userId}/roles`);
  return data;
}

/**
 * Get user permissions
 */
export async function getUserPermissions(userId: string): Promise<{
  success: boolean;
  permissions: string[];
  count: number;
}> {
  const { data } = await apiClient.get(`/rbac/users/${userId}/permissions`);
  return data;
}

/**
 * Check if user has permission
 */
export async function checkPermission(
  userId: string,
  permission: string
): Promise<{
  success: boolean;
  hasPermission: boolean;
  permission: string;
}> {
  const { data } = await apiClient.post('/rbac/check-permission', {
    userId,
    permission,
  });
  return data;
}

// ============================================================
// PERMISSIONS FUNCTIONS
// ============================================================

/**
 * Get available permissions list
 */
export async function getPermissionsList(): Promise<{
  success: boolean;
  permissions: Permission[];
  count: number;
}> {
  const { data } = await apiClient.get('/rbac/permissions/list');
  return data;
}

// ============================================================
// POLICIES FUNCTIONS
// ============================================================

/**
 * Get all policies
 */
export async function getPolicies(type?: string): Promise<{
  success: boolean;
  policies: Policy[];
  count: number;
}> {
  const { data } = await apiClient.get('/rbac/policies', {
    params: { type },
  });
  return data;
}

/**
 * Create policy
 */
export async function createPolicy(policy: {
  name: string;
  type: string;
  config: any;
  actions: string[];
}): Promise<{
  success: boolean;
  policy: Policy;
}> {
  const { data } = await apiClient.post('/rbac/policies', policy);
  return data;
}

/**
 * Update policy
 */
export async function updatePolicy(
  policyId: string,
  updates: {
    name?: string;
    enabled?: boolean;
    config?: any;
    actions?: string[];
  }
): Promise<{
  success: boolean;
  policy: Policy;
}> {
  const { data } = await apiClient.put(`/rbac/policies/${policyId}`, updates);
  return data;
}

/**
 * Delete policy
 */
export async function deletePolicy(policyId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.delete(`/rbac/policies/${policyId}`);
  return data;
}

/**
 * Check content against policies
 */
export async function checkContent(content: string): Promise<{
  success: boolean;
  result: {
    allowed: boolean;
    violations: Array<{
      policyId: string;
      policyName: string;
      violationType: string;
      severity: string;
      message: string;
      blockedContent?: string;
    }>;
    warnings: string[];
  };
}> {
  const { data } = await apiClient.post('/rbac/policies/check-content', {
    content,
  });
  return data;
}

/**
 * Get policy violations
 */
export async function getPolicyViolations(filters?: {
  userId?: string;
  policyId?: string;
  severity?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  violations: PolicyViolation[];
  count: number;
}> {
  const { data } = await apiClient.get('/rbac/violations', {
    params: filters,
  });
  return data;
}

// ============================================================
// AUDIT LOGS FUNCTIONS
// ============================================================

/**
 * Get audit logs
 */
export async function getAuditLogs(filters?: {
  userId?: string;
  action?: string;
  resource?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  logs: AuditLog[];
  count: number;
}> {
  const { data } = await apiClient.get('/rbac/audit-logs', {
    params: filters,
  });
  return data;
}
