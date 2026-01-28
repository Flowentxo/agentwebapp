/**
 * SINTRA Auth System - User Management
 * Database operations for users and roles
 */

import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { users, userRoles } from '../db/schema';
import { hashPassword } from './crypto';
import type { UserRole } from './types';

// =====================================================
// User Queries
// =====================================================

/**
 * Find user by email (case-insensitive)
 * @param email - User email address
 * @returns User record or null if not found
 * @throws Error if database connection fails (so login can use dev fallback)
 */
export async function findUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const db = getDb();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[AUTH] Database error in findUserByEmail:', errMsg);
    // THROW the error so login route can use dev fallback
    throw new Error(`DATABASE_ERROR: ${errMsg}`);
  }
}

/**
 * Find user by ID
 * @param userId - User ID
 * @returns User record or null if not found
 */
export async function findUserById(userId: string) {
  const db = getDb();

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if user exists by email
 * @param email - User email address
 * @returns True if user exists
 */
export async function userExistsByEmail(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  return user !== null;
}

// =====================================================
// User Creation
// =====================================================

export interface CreateUserParams {
  email: string;
  password: string;
  displayName?: string;
  isActive?: boolean;
}

/**
 * Create a new user with hashed password
 * @param params - User creation parameters
 * @returns Created user record
 * @throws Error if email already exists
 */
export async function createUser(params: CreateUserParams) {
  const db = getDb();

  // Check if email already exists
  const existing = await findUserByEmail(params.email);
  if (existing) {
    throw new Error('Email already in use');
  }

  // Hash password
  const passwordHash = await hashPassword(params.password);

  // Insert user
  const result = await db
    .insert(users)
    .values({
      email: params.email.toLowerCase().trim(),
      passwordHash,
      displayName: params.displayName?.trim() || null,
      isActive: params.isActive ?? true,
    })
    .returning();

  return result[0];
}

// =====================================================
// User Updates
// =====================================================

/**
 * Update user's email verification status
 * @param userId - User ID
 * @returns Updated user record
 */
export async function markEmailVerified(userId: string) {
  const db = getDb();

  const result = await db
    .update(users)
    .set({
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return result[0];
}

/**
 * Update user's password
 * @param userId - User ID
 * @param newPassword - New plain text password
 * @returns Updated user record
 */
export async function updateUserPassword(userId: string, newPassword: string) {
  const db = getDb();

  const passwordHash = await hashPassword(newPassword);

  const result = await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return result[0];
}

/**
 * Update user's password hash directly (used for bcrypt rehashing on login).
 * This function accepts a pre-computed hash, NOT a plain password.
 *
 * SECURITY NOTE: This should only be called after successful password verification
 * to upgrade weak hashes to stronger bcrypt cost factors.
 *
 * @param userId - User ID
 * @param newHash - Pre-computed bcrypt hash
 * @returns True if update was successful
 */
export async function updateUserPasswordHash(userId: string, newHash: string): Promise<boolean> {
  try {
    const db = getDb();

    const result = await db
      .update(users)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return result.length > 0;
  } catch (error) {
    console.error('[AUTH] Failed to update password hash:', error);
    return false;
  }
}

/**
 * Update user's display name
 * @param userId - User ID
 * @param displayName - New display name
 * @returns Updated user record
 */
export async function updateUserDisplayName(userId: string, displayName: string) {
  const db = getDb();

  const result = await db
    .update(users)
    .set({
      displayName: displayName.trim(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return result[0];
}

/**
 * Deactivate user account (soft delete)
 * @param userId - User ID
 * @returns Updated user record
 */
export async function deactivateUser(userId: string) {
  const db = getDb();

  const result = await db
    .update(users)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return result[0];
}

/**
 * Reactivate user account
 * @param userId - User ID
 * @returns Updated user record
 */
export async function reactivateUser(userId: string) {
  const db = getDb();

  const result = await db
    .update(users)
    .set({
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return result[0];
}

// =====================================================
// Role Management
// =====================================================

/**
 * Get all roles for a user
 * @param userId - User ID
 * @returns Array of role strings
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const db = getDb();

  const results = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  return results.map((r) => r.role as UserRole);
}

/**
 * Add a role to a user
 * @param userId - User ID
 * @param role - Role to add
 * @returns Created user role record
 */
export async function addUserRole(userId: string, role: UserRole) {
  const db = getDb();

  // Check if role already exists (idempotent)
  const existing = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Insert role
  const result = await db
    .insert(userRoles)
    .values({
      userId,
      role,
    })
    .returning();

  return result[0];
}

/**
 * Remove a role from a user
 * @param userId - User ID
 * @param role - Role to remove
 */
export async function removeUserRole(userId: string, role: UserRole): Promise<void> {
  const db = getDb();

  await db
    .delete(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)));
}

/**
 * Check if user has a specific role
 * @param userId - User ID
 * @param role - Role to check
 * @returns True if user has the role
 */
export async function userHasRole(userId: string, role: UserRole): Promise<boolean> {
  const db = getDb();

  const result = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
    .limit(1);

  return result.length > 0;
}

/**
 * Check if user has any of the specified roles
 * @param userId - User ID
 * @param roles - Array of roles to check
 * @returns True if user has at least one of the roles
 */
export async function userHasAnyRole(userId: string, roles: UserRole[]): Promise<boolean> {
  const userRolesList = await getUserRoles(userId);
  return roles.some((role) => userRolesList.includes(role));
}

/**
 * Set user roles (replace all existing roles)
 * @param userId - User ID
 * @param roles - Array of roles to set
 */
export async function setUserRoles(userId: string, roles: UserRole[]): Promise<void> {
  const db = getDb();

  // Delete all existing roles
  await db.delete(userRoles).where(eq(userRoles.userId, userId));

  // Insert new roles
  if (roles.length > 0) {
    await db.insert(userRoles).values(
      roles.map((role) => ({
        userId,
        role,
      }))
    );
  }
}

// =====================================================
// User + Roles Combined Queries
// =====================================================

export interface UserWithRoles {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles: UserRole[];
}

/**
 * Get user with roles by ID
 * @param userId - User ID
 * @returns User with roles or null if not found
 */
export async function getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
  const user = await findUserById(userId);
  if (!user) return null;

  const roles = await getUserRoles(userId);

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    displayName: user.displayName,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles,
  };
}

/**
 * Get user with roles by email
 * @param email - User email
 * @returns User with roles or null if not found
 */
export async function getUserWithRolesByEmail(email: string): Promise<UserWithRoles | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  return getUserWithRoles(user.id);
}
