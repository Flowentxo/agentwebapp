/**
 * SINTRA Auth System - Sudo Mode (Sensitive Action Protection)
 * Phase 4: Re-authentication for sensitive actions
 *
 * Requires users to re-verify their identity before performing
 * sensitive operations like changing password, deleting passkeys,
 * or creating API keys.
 */

import { getDb } from '../db/connection';
import { sessions, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from './crypto';
import { logActivityAsync } from './audit';

// =====================================================
// Types
// =====================================================

export interface SudoCheckResult {
  /** Whether the session is in sudo mode */
  isValid: boolean;
  /** Minutes until sudo mode expires (0 if expired) */
  remainingMinutes: number;
  /** When sudo mode will expire */
  expiresAt: Date | null;
}

export interface SudoVerifyResult {
  success: boolean;
  error?: string;
  expiresAt?: Date;
}

// =====================================================
// Sudo Mode Check
// =====================================================

/**
 * Check if the current session is in valid sudo mode.
 *
 * Sudo mode is valid if:
 * - The user's sudoSessionTimeout is > 0 (not "always ask")
 * - The time since lastAuthenticatedAt is less than the timeout
 *
 * @param sessionId - The current session ID
 * @returns SudoCheckResult with validity and remaining time
 */
export async function checkSudoMode(sessionId: string): Promise<SudoCheckResult> {
  const db = getDb();

  // Fetch session and user in one query via join
  const result = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!result.length) {
    return {
      isValid: false,
      remainingMinutes: 0,
      expiresAt: null,
    };
  }

  const { session, user } = result[0];
  const timeout = user.sudoSessionTimeout;

  // If timeout is 0, always require re-auth
  if (timeout === 0) {
    return {
      isValid: false,
      remainingMinutes: 0,
      expiresAt: null,
    };
  }

  const lastAuth = session.lastAuthenticatedAt;
  const now = new Date();
  const timeoutMs = timeout * 60 * 1000; // Convert minutes to ms
  const expiresAt = new Date(lastAuth.getTime() + timeoutMs);
  const remainingMs = expiresAt.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return {
      isValid: false,
      remainingMinutes: 0,
      expiresAt,
    };
  }

  return {
    isValid: true,
    remainingMinutes: Math.ceil(remainingMs / 60000),
    expiresAt,
  };
}

/**
 * Simple check if sudo mode is valid (boolean result).
 * Use this for quick checks in API routes.
 *
 * @param sessionId - The current session ID
 * @returns true if sudo mode is valid
 */
export async function isSudoValid(sessionId: string): Promise<boolean> {
  const result = await checkSudoMode(sessionId);
  return result.isValid;
}

// =====================================================
// Sudo Mode Verification
// =====================================================

/**
 * Verify user identity with password and refresh sudo mode.
 *
 * @param userId - The user ID
 * @param sessionId - The session ID to update
 * @param password - The password to verify
 * @param context - Request context for audit
 * @returns SudoVerifyResult
 */
export async function verifySudoWithPassword(
  userId: string,
  sessionId: string,
  password: string,
  context?: { ip?: string; userAgent?: string }
): Promise<SudoVerifyResult> {
  const db = getDb();

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    logActivityAsync({
      userId,
      action: 'SUDO_VERIFICATION_FAILED',
      metadata: { reason: 'user_not_found', method: 'password' },
      ip: context?.ip,
      userAgent: context?.userAgent,
    });
    return { success: false, error: 'User not found' };
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    logActivityAsync({
      userId,
      action: 'SUDO_VERIFICATION_FAILED',
      metadata: { reason: 'invalid_password', method: 'password' },
      ip: context?.ip,
      userAgent: context?.userAgent,
    });
    return { success: false, error: 'Invalid password' };
  }

  // Update session's lastAuthenticatedAt
  const now = new Date();
  await db
    .update(sessions)
    .set({ lastAuthenticatedAt: now })
    .where(eq(sessions.id, sessionId));

  // Calculate expiration
  const timeoutMs = user.sudoSessionTimeout * 60 * 1000;
  const expiresAt = new Date(now.getTime() + timeoutMs);

  // Log success
  logActivityAsync({
    userId,
    action: 'SUDO_VERIFICATION_SUCCESS',
    entityType: 'SESSION',
    entityId: sessionId,
    metadata: { method: 'password', timeout: user.sudoSessionTimeout },
    ip: context?.ip,
    userAgent: context?.userAgent,
  });

  return {
    success: true,
    expiresAt,
  };
}

/**
 * Verify user identity with passkey and refresh sudo mode.
 * This should be called after successful WebAuthn authentication.
 *
 * @param userId - The user ID
 * @param sessionId - The session ID to update
 * @param passkeyId - The passkey that was used
 * @param context - Request context for audit
 * @returns SudoVerifyResult
 */
export async function verifySudoWithPasskey(
  userId: string,
  sessionId: string,
  passkeyId: string,
  context?: { ip?: string; userAgent?: string }
): Promise<SudoVerifyResult> {
  const db = getDb();

  // Get user for timeout setting
  const [user] = await db
    .select({ sudoSessionTimeout: users.sudoSessionTimeout })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    logActivityAsync({
      userId,
      action: 'SUDO_VERIFICATION_FAILED',
      metadata: { reason: 'user_not_found', method: 'passkey' },
      ip: context?.ip,
      userAgent: context?.userAgent,
    });
    return { success: false, error: 'User not found' };
  }

  // Update session's lastAuthenticatedAt
  const now = new Date();
  await db
    .update(sessions)
    .set({ lastAuthenticatedAt: now })
    .where(eq(sessions.id, sessionId));

  // Calculate expiration
  const timeoutMs = user.sudoSessionTimeout * 60 * 1000;
  const expiresAt = new Date(now.getTime() + timeoutMs);

  // Log success
  logActivityAsync({
    userId,
    action: 'SUDO_VERIFICATION_SUCCESS',
    entityType: 'SESSION',
    entityId: sessionId,
    metadata: {
      method: 'passkey',
      passkeyId,
      timeout: user.sudoSessionTimeout,
    },
    ip: context?.ip,
    userAgent: context?.userAgent,
  });

  return {
    success: true,
    expiresAt,
  };
}

// =====================================================
// Sudo Timeout Settings
// =====================================================

/**
 * Valid sudo timeout values (in minutes).
 * 0 = Always ask for verification
 */
export const SUDO_TIMEOUT_OPTIONS = [
  { value: 0, label: 'Immer fragen', labelEn: 'Always ask' },
  { value: 5, label: '5 Minuten', labelEn: '5 minutes' },
  { value: 15, label: '15 Minuten', labelEn: '15 minutes' },
  { value: 60, label: '1 Stunde', labelEn: '1 hour' },
] as const;

export type SudoTimeoutValue = typeof SUDO_TIMEOUT_OPTIONS[number]['value'];

/**
 * Update the user's sudo session timeout preference.
 *
 * @param userId - The user ID
 * @param timeout - The new timeout value (in minutes)
 * @param context - Request context for audit
 * @returns true if successful
 */
export async function updateSudoTimeout(
  userId: string,
  timeout: SudoTimeoutValue,
  context?: { ip?: string; userAgent?: string }
): Promise<boolean> {
  const db = getDb();

  // Validate timeout value
  const validOptions = SUDO_TIMEOUT_OPTIONS.map(o => o.value);
  if (!validOptions.includes(timeout)) {
    return false;
  }

  // Get current value for audit
  const [user] = await db
    .select({ currentTimeout: users.sudoSessionTimeout })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return false;
  }

  // Update timeout
  await db
    .update(users)
    .set({
      sudoSessionTimeout: timeout,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Log change
  logActivityAsync({
    userId,
    action: 'SUDO_TIMEOUT_CHANGED',
    metadata: {
      oldValue: user.currentTimeout,
      newValue: timeout,
    },
    ip: context?.ip,
    userAgent: context?.userAgent,
  });

  return true;
}

/**
 * Get the user's current sudo timeout setting.
 *
 * @param userId - The user ID
 * @returns The timeout in minutes, or null if user not found
 */
export async function getSudoTimeout(userId: string): Promise<number | null> {
  const db = getDb();

  const [user] = await db
    .select({ timeout: users.sudoSessionTimeout })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.timeout ?? null;
}

// =====================================================
// Error Code for API Responses
// =====================================================

export const SUDO_ERROR_CODE = 'SUDO_REQUIRED';

/**
 * Create a standardized SUDO_REQUIRED error response.
 * Use this in API routes to trigger the frontend SudoModal.
 */
export function createSudoRequiredError() {
  return {
    ok: false,
    error: {
      code: SUDO_ERROR_CODE,
      message: 'Re-authentication required. Please verify your identity to continue.',
      messageDE: 'Erneute Authentifizierung erforderlich. Bitte bestätigen Sie Ihre Identität.',
    },
  };
}
