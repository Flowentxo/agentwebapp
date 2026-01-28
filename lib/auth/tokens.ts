/**
 * SINTRA Auth System - Verification Token Management
 * Email verification and password reset tokens
 */

import { eq, and, lt, gt, isNull } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { verificationTokens } from '../db/schema';
import { generateTokenPair, hashToken } from './crypto';
import type { VerificationPurpose } from './types';

// =====================================================
// Token Creation
// =====================================================

export interface CreateTokenResult {
  tokenId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Create a verification token for a user
 * @param userId - User ID
 * @param purpose - Token purpose (email_verify or password_reset)
 * @param expiresInMs - Token lifetime in milliseconds (default: 1 hour)
 * @returns Token ID, plain token, and expiry
 */
export async function createVerificationToken(
  userId: string,
  purpose: VerificationPurpose,
  expiresInMs: number = 60 * 60 * 1000 // 1 hour
): Promise<CreateTokenResult> {
  const db = getDb();

  // Generate token
  const { token, hash } = generateTokenPair();

  // Calculate expiry
  const expiresAt = new Date(Date.now() + expiresInMs);

  // Insert token
  const result = await db
    .insert(verificationTokens)
    .values({
      userId,
      tokenHash: hash,
      purpose,
      expiresAt,
    })
    .returning();

  return {
    tokenId: result[0].id,
    token,
    expiresAt,
  };
}

// =====================================================
// Token Validation
// =====================================================

/**
 * Get verification token by plain token
 * @param token - Plain token string
 * @param purpose - Expected token purpose
 * @returns Token record or null if not found/expired/used
 */
export async function getVerificationToken(token: string, purpose: VerificationPurpose) {
  const db = getDb();

  const tokenHash = hashToken(token);
  const now = new Date();

  const result = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        eq(verificationTokens.purpose, purpose),
        isNull(verificationTokens.usedAt),
        gt(verificationTokens.expiresAt, now)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Validate a verification token
 * @param token - Plain token string
 * @param purpose - Expected token purpose
 * @returns User ID if valid, null otherwise
 */
export async function validateVerificationToken(
  token: string,
  purpose: VerificationPurpose
): Promise<string | null> {
  const tokenRecord = await getVerificationToken(token, purpose);
  return tokenRecord ? tokenRecord.userId : null;
}

// =====================================================
// Token Usage
// =====================================================

/**
 * Mark a verification token as used
 * @param token - Plain token string
 * @param purpose - Token purpose
 * @returns True if marked successfully
 */
export async function markTokenUsed(token: string, purpose: VerificationPurpose): Promise<boolean> {
  const db = getDb();

  const tokenHash = hashToken(token);

  const result = await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        eq(verificationTokens.purpose, purpose)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Use a verification token (validate + mark as used)
 * @param token - Plain token string
 * @param purpose - Token purpose
 * @returns User ID if valid, null otherwise
 */
export async function useVerificationToken(
  token: string,
  purpose: VerificationPurpose
): Promise<string | null> {
  const userId = await validateVerificationToken(token, purpose);

  if (!userId) {
    return null;
  }

  await markTokenUsed(token, purpose);
  return userId;
}

// =====================================================
// Token Revocation
// =====================================================

/**
 * Revoke all tokens for a user (mark as used)
 * @param userId - User ID
 * @param purpose - Token purpose (optional, revokes all if not specified)
 */
export async function revokeUserTokens(
  userId: string,
  purpose?: VerificationPurpose
): Promise<void> {
  const db = getDb();

  const conditions = [eq(verificationTokens.userId, userId), isNull(verificationTokens.usedAt)];

  if (purpose) {
    conditions.push(eq(verificationTokens.purpose, purpose));
  }

  await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(and(...conditions));
}

// =====================================================
// Token Cleanup
// =====================================================

/**
 * Delete expired or used tokens older than specified days
 * @param olderThanDays - Delete tokens older than this many days (default: 7)
 * @returns Number of tokens deleted
 */
export async function cleanupOldTokens(olderThanDays: number = 7): Promise<number> {
  const db = getDb();

  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(verificationTokens)
    .where(lt(verificationTokens.createdAt, cutoffDate))
    .returning();

  return result.length;
}
