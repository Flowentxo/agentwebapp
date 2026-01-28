/**
 * SINTRA Profile System - Service Layer
 * Business logic for profile management, MFA, sessions, and privacy
 */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { users, sessions, userNotificationPrefs, userAudit } from '../db/schema';
import { verifyPassword, hashPassword } from '../auth/crypto';
import { createVerificationToken, getVerificationToken } from '../auth/tokens';
import { sendVerificationEmail } from '../auth/mailer';
import { getUserRoles } from '../auth/user';
import { recordUserEventSimple, AuditAction } from './audit';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import {
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  encryptRecoveryCodes,
  decryptRecoveryCodes,
  verifyRecoveryCode,
  removeRecoveryCode,
  maskSecret
} from './crypto';
import type {
  UpdateProfileRequest,
  RequestEmailChangeRequest,
  ChangePasswordRequest,
  MfaEnableRequest,
  UpdateNotificationsRequest,
  UpdatePrivacyRequest,
  ProfileResponse,
  SessionResponse,
  NotificationsResponse,
  PrivacyResponse,
  AuditLogResponse,
  MfaSetupResponse,
} from './schemas';

// =====================================================
// Profile Management
// =====================================================

/**
 * Get user profile with all fields
 * @param userId - User ID
 * @returns Complete profile data
 */
export async function getProfile(userId: string): Promise<ProfileResponse> {
  const db = getDb();

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!result[0]) {
    throw new Error('User not found');
  }

  const user = result[0];
  const roles = await getUserRoles(userId);

  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    displayName: user.displayName || null,
    avatarUrl: user.avatarUrl || null,
    bio: user.bio || null,
    locale: user.locale || 'de-DE',
    timezone: user.timezone || 'Europe/Berlin',
    theme: (user.theme as 'system' | 'light' | 'dark') || 'system',
    pronouns: user.pronouns || null,
    location: user.location || null,
    orgTitle: user.orgTitle || null,
    accessibility: (user.accessibility as any) || {
      reduceMotion: false,
      highContrast: false,
      fontScale: 1.0,
    },
    privacySettings: (user.privacySettings as any) || {
      directoryOptOut: false,
      dataSharing: { analytics: true, product: true },
      searchVisibility: true,
    },
    mfaEnabled: user.mfaEnabled || false,
    roles,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    sudoSessionTimeout: user.sudoSessionTimeout ?? 15,
  };
}

/**
 * Update user profile
 * @param userId - User ID
 * @param input - Profile updates
 * @returns Updated profile
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileRequest
): Promise<ProfileResponse> {
  const db = getDb();

  // Validate theme
  if (input.theme && !['light', 'dark', 'system'].includes(input.theme)) {
    throw new Error('Invalid theme');
  }

  // Prepare update data
  const updateData: any = {
    ...input,
    updatedAt: new Date(),
  };

  await db.update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  await recordUserEventSimple(userId, AuditAction.PROFILE_UPDATE, {
    fields: Object.keys(input),
  });

  return getProfile(userId);
}

// =====================================================
// Email Change
// =====================================================

/**
 * Request email change (sends verification to new email)
 * @param userId - User ID
 * @param newEmail - New email address
 * @param currentPassword - Current password for verification
 * @returns Confirmation message
 */
export async function requestEmailChange(
  userId: string,
  newEmail: string,
  currentPassword: string
): Promise<{ message: string }> {
  const db = getDb();

  // Verify current password
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!result[0]) {
    throw new Error('User not found');
  }

  const user = result[0];
  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  // Check if new email is already in use
  const existingUser = await db.select()
    .from(users)
    .where(eq(users.email, newEmail))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error('Email already in use');
  }

  // Create verification token for email change
  const tokenResult = await createVerificationToken(userId, 'email_change');

  // Send verification email to NEW address
  await sendVerificationEmail(newEmail, tokenResult.token);

  await recordUserEventSimple(userId, AuditAction.EMAIL_CHANGE_REQUESTED, {
    newEmail,
  });

  return { message: 'Verification email sent to new address' };
}

/**
 * Confirm email change with verification token
 * @param token - Verification token
 * @returns Confirmation message
 */
export async function confirmEmailChange(token: string): Promise<{ message: string }> {
  const db = getDb();

  const verification = await getVerificationToken(token, 'email_change');

  if (!verification) {
    throw new Error('Invalid or expired token');
  }

  const newEmail = verification.metadata?.newEmail as string;

  if (!newEmail) {
    throw new Error('Invalid token metadata');
  }

  // Update email
  await db.update(users)
    .set({
      email: newEmail,
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, verification.userId));

  await recordUserEventSimple(verification.userId, AuditAction.EMAIL_CHANGED, {
    newEmail,
  });

  return { message: 'Email changed successfully' };
}

// =====================================================
// Password Management
// =====================================================

/**
 * Change user password (revokes all sessions)
 * @param userId - User ID
 * @param currentPassword - Current password
 * @param newPassword - New password
 * @returns Confirmation message
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const db = getDb();

  // Verify current password
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!result[0]) {
    throw new Error('User not found');
  }

  const user = result[0];
  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Invalid current password');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await db.update(users)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Revoke all sessions for security
  await db.delete(sessions).where(eq(sessions.userId, userId));

  await recordUserEventSimple(userId, AuditAction.PASSWORD_CHANGED, {});

  return { message: 'Password changed successfully. Please log in again.' };
}

// =====================================================
// Multi-Factor Authentication (MFA)
// =====================================================

/**
 * Setup MFA (generate secret and QR code)
 * @param userId - User ID
 * @returns MFA setup data with QR code
 */
export async function mfaSetup(userId: string): Promise<MfaSetupResponse> {
  const db = getDb();

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!result[0]) {
    throw new Error('User not found');
  }

  const user = result[0];

  // Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `SINTRA (${user.email})`,
    issuer: 'SINTRA',
    length: 32,
  });

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url || '');

  // Encrypt and store temporary secret (not enabled yet)
  const encryptedSecret = encryptSecret(secret.base32);
  const recoveryCodes = generateRecoveryCodes(10);
  const encryptedRecoveryCodes = encryptRecoveryCodes(recoveryCodes);

  // Store as temporary (will be confirmed in mfaEnable)
  await db.update(users)
    .set({
      mfaSecret: encryptedSecret,
      mfaRecoveryCodes: encryptedRecoveryCodes,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    otpauthUrl: secret.otpauth_url || '',
    secret: maskSecret(secret.base32),
    qrDataUrl: qrCodeDataUrl,
  };
}

/**
 * Enable MFA (verify code and activate)
 * @param userId - User ID
 * @param code - TOTP code to verify
 * @returns Confirmation message
 */
export async function mfaEnable(
  userId: string,
  code: string
): Promise<{ message: string; recoveryCodes: string[] }> {
  const db = getDb();

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!result[0]) {
    throw new Error('User not found');
  }

  const user = result[0];

  if (!user.mfaSecret) {
    throw new Error('MFA setup not initiated. Call mfaSetup first.');
  }

  if (user.mfaEnabled) {
    throw new Error('MFA already enabled');
  }

  // Decrypt secret
  const secret = decryptSecret(user.mfaSecret);

  // Verify TOTP code
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 2, // Allow 2 time steps (~60 seconds)
  });

  if (!isValid) {
    throw new Error('Invalid verification code');
  }

  // Enable MFA
  await db.update(users)
    .set({
      mfaEnabled: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await recordUserEventSimple(userId, AuditAction.MFA_ENABLED, {});

  // Return recovery codes
  const recoveryCodes = user.mfaRecoveryCodes
    ? decryptRecoveryCodes(user.mfaRecoveryCodes)
    : [];

  return {
    message: 'MFA enabled successfully',
    recoveryCodes,
  };
}

/**
 * Verify TOTP code for login (without enabling MFA)
 * Used during login when user has MFA enabled
 * @param userId - User ID
 * @param code - TOTP code to verify
 * @returns true if code is valid
 */
export async function verifyTotpCode(
  userId: string,
  code: string
): Promise<boolean> {
  console.log('[MFA_VERIFY] Starting verification for userId:', userId);
  console.log('[MFA_VERIFY] Code received:', code, 'length:', code?.length);

  const db = getDb();

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!result[0]) {
    console.log('[MFA_VERIFY] User not found');
    return false;
  }

  const user = result[0];
  console.log('[MFA_VERIFY] User found, mfaEnabled:', user.mfaEnabled, 'hasMfaSecret:', !!user.mfaSecret);

  if (!user.mfaEnabled || !user.mfaSecret) {
    console.log('[MFA_VERIFY] MFA not enabled or no secret');
    return false;
  }

  // Decrypt secret
  let secret: string;
  try {
    secret = decryptSecret(user.mfaSecret);
    console.log('[MFA_VERIFY] Secret decrypted successfully, length:', secret?.length);
    // Log first 4 chars for debugging (safe - this is just the beginning of base32)
    console.log('[MFA_VERIFY] Secret prefix:', secret?.substring(0, 4) + '...');
  } catch (decryptError) {
    console.error('[MFA_VERIFY] Failed to decrypt secret:', decryptError);
    return false;
  }

  // Generate expected code for debugging
  const expectedCode = speakeasy.totp({
    secret,
    encoding: 'base32',
  });
  console.log('[MFA_VERIFY] Expected TOTP code:', expectedCode);
  console.log('[MFA_VERIFY] Received code:', code);
  console.log('[MFA_VERIFY] Codes match directly:', expectedCode === code);

  // Verify TOTP code with window of 4 time steps (~120 seconds) for tolerance
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 4,
  });
  console.log('[MFA_VERIFY] speakeasy.totp.verify result:', isValid);

  // Also check recovery codes if TOTP fails
  if (!isValid && user.mfaRecoveryCodes) {
    console.log('[MFA_VERIFY] TOTP failed, checking recovery codes...');
    const isRecoveryValid = verifyRecoveryCode(user.mfaRecoveryCodes, code);
    if (isRecoveryValid) {
      console.log('[MFA_VERIFY] Recovery code valid!');
      // Remove used recovery code
      const newRecoveryCodes = removeRecoveryCode(user.mfaRecoveryCodes, code);
      await db.update(users)
        .set({
          mfaRecoveryCodes: newRecoveryCodes,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      return true;
    }
    console.log('[MFA_VERIFY] Recovery code also invalid');
  }

  console.log('[MFA_VERIFY] Final result:', isValid);
  return isValid;
}

/**
 * Disable MFA (requires password)
 * @param userId - User ID
 * @param currentPassword - Current password for verification
 * @returns Confirmation message
 */
export async function mfaDisable(
  userId: string,
  currentPassword: string
): Promise<{ message: string }> {
  const db = getDb();

  // Verify password
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!result[0]) {
    throw new Error('User not found');
  }

  const user = result[0];
  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  // Disable MFA
  await db.update(users)
    .set({
      mfaEnabled: false,
      mfaSecret: null,
      mfaRecoveryCodes: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await recordUserEventSimple(userId, AuditAction.MFA_DISABLED, {});

  return { message: 'MFA disabled successfully' };
}

// =====================================================
// Session Management
// =====================================================

/**
 * List all active sessions for user
 * @param userId - User ID
 * @returns List of sessions
 */
export async function listSessions(userId: string): Promise<SessionResponse[]> {
  const db = getDb();

  const result = await db.select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt));

  return result.map(session => ({
    id: session.id,
    userAgent: session.userAgent || 'Unknown',
    ip: session.ip || 'Unknown',
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  }));
}

/**
 * Revoke a specific session
 * @param userId - User ID
 * @param sessionId - Session ID to revoke
 * @returns Confirmation message
 */
export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<{ message: string }> {
  const db = getDb();

  await db.delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));

  await recordUserEventSimple(userId, AuditAction.SESSION_REVOKED, {
    sessionId,
  });

  return { message: 'Session revoked successfully' };
}

// =====================================================
// Notification Preferences
// =====================================================

/**
 * Get user notification preferences
 * @param userId - User ID
 * @returns Notification preferences
 */
export async function getNotifications(userId: string): Promise<NotificationsResponse> {
  const db = getDb();

  const result = await db.select()
    .from(userNotificationPrefs)
    .where(eq(userNotificationPrefs.userId, userId))
    .limit(1);

  if (!result[0]) {
    // Create default preferences
    await db.insert(userNotificationPrefs).values({
      userId,
      emailDigest: true,
      productUpdates: true,
      securityAlerts: true,
      webPush: false,
      sms: false,
    });

    return {
      email: true,
      push: false,
      sms: false,
      agentActivity: true,
      securityAlerts: true,
      productUpdates: true,
      weeklyDigest: true,
    };
  }

  const prefs = result[0];

  return {
    email: prefs.emailDigest || false,
    push: prefs.webPush || false,
    sms: prefs.sms || false,
    agentActivity: true,
    securityAlerts: prefs.securityAlerts || false,
    productUpdates: prefs.productUpdates || false,
    weeklyDigest: prefs.emailDigest || false,
  };
}

/**
 * Update notification preferences
 * @param userId - User ID
 * @param input - Notification preferences
 * @returns Updated preferences
 */
export async function updateNotifications(
  userId: string,
  input: UpdateNotificationsRequest
): Promise<NotificationsResponse> {
  const db = getDb();

  await db.update(userNotificationPrefs)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(userNotificationPrefs.userId, userId));

  await recordUserEventSimple(userId, AuditAction.NOTIFICATIONS_UPDATED, {
    preferences: Object.keys(input),
  });

  return getNotifications(userId);
}

// =====================================================
// Privacy Settings
// =====================================================

/**
 * Get user privacy settings
 * @param userId - User ID
 * @returns Privacy settings
 */
export async function getPrivacy(userId: string): Promise<PrivacyResponse> {
  const db = getDb();

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!result[0]) {
    throw new Error('User not found');
  }

  const user = result[0];
  const privacySettings = (user.privacySettings as any) || {};

  return {
    directoryOptOut: privacySettings.directoryOptOut || false,
    dataSharing: {
      analytics: privacySettings.dataSharing?.analytics || false,
      product: privacySettings.dataSharing?.product || false,
    },
    searchVisibility: privacySettings.searchVisibility !== false, // Default true
  };
}

/**
 * Update privacy settings
 * @param userId - User ID
 * @param input - Privacy settings
 * @returns Updated settings
 */
export async function updatePrivacy(
  userId: string,
  input: UpdatePrivacyRequest
): Promise<PrivacyResponse> {
  const db = getDb();

  await db.update(users)
    .set({
      privacySettings: input as any,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await recordUserEventSimple(userId, AuditAction.PRIVACY_UPDATED, {
    settings: Object.keys(input),
  });

  return getPrivacy(userId);
}

// =====================================================
// Audit Log
// =====================================================

/**
 * Get user audit log
 * @param userId - User ID
 * @param limit - Number of entries to return
 * @returns Audit log entries
 */
export async function getAudit(userId: string, limit: number = 50): Promise<AuditLogResponse[]> {
  const db = getDb();

  const result = await db.select()
    .from(userAudit)
    .where(eq(userAudit.userId, userId))
    .orderBy(desc(userAudit.createdAt))
    .limit(limit);

  return result.map((entry) => ({
    id: entry.id,
    action: entry.action,
    ip: entry.ip || 'Unknown',
    userAgent: entry.userAgent || 'Unknown',
    details: entry.details || {},
    createdAt: entry.createdAt,
  }));
}
