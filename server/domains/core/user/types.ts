/**
 * User Domain Types
 * Clean separation of concerns with proper TypeScript types
 */

export type UserRole = 'admin' | 'user' | 'agent' | 'viewer';

export interface UserMetadata {
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  loginCount: number;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  lastPasswordChange?: Date;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  defaultAgentId?: string;
}

export interface User {
  // Core properties
  id: string;
  email: string;
  password: string; // Hashed password
  name: string;
  role: UserRole;
  
  // Domain-specific properties
  assignedAgents: string[]; // IDs of agents user has access to
  metadata: UserMetadata;
  settings: UserSettings;
  
  // Optional properties
  avatarUrl?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  bio?: string;
  
  // Security & permissions
  permissions?: string[];
  apiKey?: string;
  refreshToken?: string;
  
  // Audit trail
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date;
}

// DTOs (Data Transfer Objects) for API communication
export interface UserCreateInput {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  settings?: Partial<UserSettings>;
}

export interface UserUpdateInput {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  settings?: Partial<UserSettings>;
  assignedAgents?: string[];
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedAgents: string[];
  metadata: UserMetadata;
  settings: UserSettings;
  avatarUrl?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
}

// Query interfaces for repository
export interface UserQuery {
  email?: string;
  role?: UserRole;
  searchTerm?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  hasAssignedAgents?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

// Event types for domain events
export type UserEventType = 
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'user.password.changed'
  | 'user.role.changed'
  | 'user.agents.assigned';

export interface UserEvent {
  type: UserEventType;
  userId: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    performedBy?: string;
  };
}

// Statistics types
export interface UserStatistics {
  totalUsers: number;
  byRole: Record<UserRole, number>;
  activeUsers: number; // Users logged in within last 30 days
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  avgLoginFrequency: number;
}

// Permission types
export interface UserPermission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  conditions?: Record<string, any>;
}

export interface UserRoleDefinition {
  name: UserRole;
  description: string;
  permissions: UserPermission[];
  defaultSettings: UserSettings;
}

// Validation schemas
export const USER_ROLES: UserRole[] = ['admin', 'user', 'agent', 'viewer'];

export const USER_ROLE_DEFINITIONS: Record<UserRole, UserRoleDefinition> = {
  admin: {
    name: 'admin',
    description: 'Full system access',
    permissions: [
      { resource: '*', action: 'admin' }
    ],
    defaultSettings: {
      notificationsEnabled: true,
      theme: 'dark',
      language: 'en',
      emailNotifications: true,
      pushNotifications: true
    }
  },
  user: {
    name: 'user',
    description: 'Regular user with agent access',
    permissions: [
      { resource: 'agents', action: 'read', conditions: { ownedByUser: true } },
      { resource: 'profile', action: 'write' }
    ],
    defaultSettings: {
      notificationsEnabled: true,
      theme: 'system',
      language: 'en',
      emailNotifications: true,
      pushNotifications: false
    }
  },
  agent: {
    name: 'agent',
    description: 'Agent service account',
    permissions: [
      { resource: 'agent.api', action: 'write' }
    ],
    defaultSettings: {
      notificationsEnabled: false,
      theme: 'dark',
      language: 'en',
      emailNotifications: false,
      pushNotifications: false
    }
  },
  viewer: {
    name: 'viewer',
    description: 'Read-only access',
    permissions: [
      { resource: 'agents', action: 'read' },
      { resource: 'analytics', action: 'read' }
    ],
    defaultSettings: {
      notificationsEnabled: false,
      theme: 'light',
      language: 'en',
      emailNotifications: false,
      pushNotifications: false
    }
  }
};

// Utility functions
export function isAdminUser(user: User | UserResponse): boolean {
  return user.role === 'admin';
}

export function canUserAccessResource(user: User | UserResponse, resource: string, action: string): boolean {
  if (isAdminUser(user)) {
    return true;
  }
  
  const roleDefinition = USER_ROLE_DEFINITIONS[user.role];
  return roleDefinition.permissions.some(permission => 
    permission.resource === resource && permission.action === action
  );
}

export function sanitizeUserForResponse(user: User): UserResponse {
  const { password, refreshToken, apiKey, ...sanitized } = user;
  return sanitized as UserResponse;
}