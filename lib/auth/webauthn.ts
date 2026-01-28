/**
 * SINTRA Auth System - WebAuthn/Passkeys
 * Phase 3, Punkt 2: FIDO2/WebAuthn Implementation
 *
 * Enables passwordless authentication with Passkeys (FaceID, TouchID, YubiKey, etc.)
 * Uses SimpleWebAuthn for WebAuthn protocol handling.
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { eq, and, lt } from 'drizzle-orm';
import { getDb } from '../db/connection';
import {
  users,
  userPasskeys,
  webauthnChallenges,
  type UserPasskey,
  type AuthenticatorTransport,
} from '../db/schema';
import { logActivityAsync } from './audit';

// =====================================================
// Configuration
// =====================================================

// Relying Party (RP) configuration - should match your domain
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'SINTRA.AI';
const RP_ID = process.env.WEBAUTHN_RP_ID || (process.env.NODE_ENV === 'development' ? 'localhost' : 'sintra.ai');
const ORIGIN = process.env.WEBAUTHN_ORIGIN || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : `https://${RP_ID}`);

// Challenge expiration time (5 minutes)
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// =====================================================
// Types
// =====================================================

export interface PasskeyInfo {
  id: string;
  name: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface RegistrationStartResult {
  options: PublicKeyCredentialCreationOptionsJSON;
  challengeId: string;
}

export interface AuthenticationStartResult {
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeId: string;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Convert Uint8Array to base64url string
 */
function uint8ArrayToBase64url(array: Uint8Array): string {
  return Buffer.from(array).toString('base64url');
}

/**
 * Convert base64url string to Uint8Array
 */
function base64urlToUint8Array(base64url: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64url, 'base64url'));
}

/**
 * Store a challenge in the database
 */
async function storeChallenge(
  userId: string | null,
  challenge: string,
  type: 'registration' | 'authentication'
): Promise<string> {
  const db = getDb();

  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  const [result] = await db
    .insert(webauthnChallenges)
    .values({
      userId,
      challenge,
      type,
      expiresAt,
    })
    .returning();

  return result.id;
}

/**
 * Get and delete a challenge (one-time use)
 */
async function consumeChallenge(
  challengeId: string,
  type: 'registration' | 'authentication'
): Promise<{ challenge: string; userId: string | null } | null> {
  const db = getDb();

  // Get the challenge
  const [result] = await db
    .select()
    .from(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.id, challengeId),
        eq(webauthnChallenges.type, type)
      )
    )
    .limit(1);

  if (!result) {
    return null;
  }

  // Check if expired
  if (result.expiresAt < new Date()) {
    // Delete expired challenge
    await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, challengeId));
    return null;
  }

  // Delete the challenge (one-time use)
  await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, challengeId));

  return {
    challenge: result.challenge,
    userId: result.userId,
  };
}

/**
 * Clean up expired challenges
 */
export async function cleanupExpiredChallenges(): Promise<number> {
  const db = getDb();

  const result = await db
    .delete(webauthnChallenges)
    .where(lt(webauthnChallenges.expiresAt, new Date()))
    .returning();

  return result.length;
}

// =====================================================
// Registration Flow
// =====================================================

/**
 * Start passkey registration for a user.
 * Returns options to pass to navigator.credentials.create()
 */
export async function startRegistration(
  userId: string
): Promise<RegistrationStartResult> {
  const db = getDb();

  // Get user info
  const [user] = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Get existing passkeys for this user (to exclude them)
  const existingPasskeys = await db
    .select({ credentialId: userPasskeys.credentialId, transports: userPasskeys.transports })
    .from(userPasskeys)
    .where(eq(userPasskeys.userId, userId));

  // Convert to excludeCredentials format
  const excludeCredentials = existingPasskeys.map((pk) => ({
    id: base64urlToUint8Array(pk.credentialId),
    transports: pk.transports as AuthenticatorTransportFuture[] | undefined,
  }));

  // Generate registration options
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.displayName || user.email,
    // Timeout: 60 seconds
    timeout: 60000,
    // Attestation: none (we don't need hardware attestation)
    attestationType: 'none',
    // Exclude existing credentials
    excludeCredentials,
    // Prefer resident keys (passkeys that can be discovered without username)
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform', // Prefer platform authenticators (Face ID, Touch ID)
    },
    // Support common algorithms
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  });

  // Store the challenge
  const challengeId = await storeChallenge(userId, options.challenge, 'registration');

  return {
    options,
    challengeId,
  };
}

/**
 * Complete passkey registration.
 * Verifies the response and stores the credential.
 */
export async function finishRegistration(
  challengeId: string,
  response: RegistrationResponseJSON,
  passkeyName: string = 'Passkey',
  requestContext?: { ip?: string; userAgent?: string }
): Promise<UserPasskey> {
  const db = getDb();

  // Get and consume the challenge
  const challengeData = await consumeChallenge(challengeId, 'registration');
  if (!challengeData || !challengeData.userId) {
    throw new Error('Invalid or expired challenge');
  }

  const { challenge, userId } = challengeData;

  // Verify the registration response
  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
  } catch (error) {
    console.error('[WEBAUTHN] Registration verification failed:', error);
    throw new Error('Registration verification failed');
  }

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed');
  }

  const { registrationInfo } = verification;

  // Check if credential already exists
  const existingCred = await db
    .select()
    .from(userPasskeys)
    .where(eq(userPasskeys.credentialId, uint8ArrayToBase64url(registrationInfo.credentialID)))
    .limit(1);

  if (existingCred.length > 0) {
    throw new Error('This passkey is already registered');
  }

  // Store the credential
  const [newPasskey] = await db
    .insert(userPasskeys)
    .values({
      userId,
      credentialId: uint8ArrayToBase64url(registrationInfo.credentialID),
      credentialPublicKey: uint8ArrayToBase64url(registrationInfo.credentialPublicKey),
      counter: registrationInfo.counter,
      credentialDeviceType: registrationInfo.credentialDeviceType,
      credentialBackedUp: registrationInfo.credentialBackedUp,
      transports: response.response.transports as AuthenticatorTransport[] | undefined,
      name: passkeyName,
      aaguid: registrationInfo.aaguid,
    })
    .returning();

  // Audit log
  logActivityAsync({
    userId,
    action: 'PASSKEY_REGISTERED',
    entityType: 'PASSKEY',
    entityId: newPasskey.id,
    ip: requestContext?.ip,
    userAgent: requestContext?.userAgent,
    metadata: {
      passkeyName,
      credentialDeviceType: registrationInfo.credentialDeviceType,
      credentialBackedUp: registrationInfo.credentialBackedUp,
    },
  });

  console.log(`[WEBAUTHN] Passkey registered for user ${userId}: ${newPasskey.id}`);

  return newPasskey;
}

// =====================================================
// Authentication Flow
// =====================================================

/**
 * Start passkey authentication.
 * Can be used with or without a user ID (discoverable credentials).
 */
export async function startAuthentication(
  userId?: string
): Promise<AuthenticationStartResult> {
  const db = getDb();

  // If user ID provided, get their passkeys
  let allowCredentials: { id: Uint8Array; transports?: AuthenticatorTransportFuture[] }[] | undefined;

  if (userId) {
    const userPasskeysList = await db
      .select({ credentialId: userPasskeys.credentialId, transports: userPasskeys.transports })
      .from(userPasskeys)
      .where(eq(userPasskeys.userId, userId));

    if (userPasskeysList.length === 0) {
      throw new Error('No passkeys registered for this user');
    }

    allowCredentials = userPasskeysList.map((pk) => ({
      id: base64urlToUint8Array(pk.credentialId),
      transports: pk.transports as AuthenticatorTransportFuture[] | undefined,
    }));
  }

  // Generate authentication options
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: 60000,
    userVerification: 'preferred',
    allowCredentials,
  });

  // Store the challenge
  const challengeId = await storeChallenge(userId || null, options.challenge, 'authentication');

  return {
    options,
    challengeId,
  };
}

/**
 * Complete passkey authentication.
 * Verifies the response and returns the authenticated user.
 */
export async function finishAuthentication(
  challengeId: string,
  response: AuthenticationResponseJSON,
  requestContext?: { ip?: string; userAgent?: string }
): Promise<{ userId: string; passkeyId: string }> {
  const db = getDb();

  // Get and consume the challenge
  const challengeData = await consumeChallenge(challengeId, 'authentication');
  if (!challengeData) {
    throw new Error('Invalid or expired challenge');
  }

  const { challenge } = challengeData;

  // Find the passkey by credential ID
  const credentialIdBase64 = response.id;
  const [passkey] = await db
    .select()
    .from(userPasskeys)
    .where(eq(userPasskeys.credentialId, credentialIdBase64))
    .limit(1);

  if (!passkey) {
    // Audit failed attempt
    logActivityAsync({
      action: 'PASSKEY_LOGIN_FAILED',
      ip: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      metadata: { reason: 'passkey_not_found', credentialId: credentialIdBase64.substring(0, 20) + '...' },
    });
    throw new Error('Passkey not found');
  }

  // Get user info for audit
  const [user] = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, passkey.userId))
    .limit(1);

  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  // Verify the authentication response
  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: base64urlToUint8Array(passkey.credentialId),
        credentialPublicKey: base64urlToUint8Array(passkey.credentialPublicKey),
        counter: passkey.counter,
        transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
      },
    });
  } catch (error) {
    console.error('[WEBAUTHN] Authentication verification failed:', error);

    // Audit failed attempt
    logActivityAsync({
      userId: passkey.userId,
      action: 'PASSKEY_LOGIN_FAILED',
      entityType: 'PASSKEY',
      entityId: passkey.id,
      ip: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      metadata: { reason: 'verification_failed', error: error instanceof Error ? error.message : String(error) },
    });

    throw new Error('Authentication verification failed');
  }

  if (!verification.verified) {
    throw new Error('Authentication verification failed');
  }

  // Update the counter (for replay attack prevention)
  await db
    .update(userPasskeys)
    .set({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    })
    .where(eq(userPasskeys.id, passkey.id));

  // Audit successful login
  logActivityAsync({
    userId: passkey.userId,
    action: 'PASSKEY_LOGIN_SUCCESS',
    entityType: 'PASSKEY',
    entityId: passkey.id,
    ip: requestContext?.ip,
    userAgent: requestContext?.userAgent,
    metadata: {
      passkeyName: passkey.name,
      credentialDeviceType: passkey.credentialDeviceType,
    },
  });

  console.log(`[WEBAUTHN] User ${passkey.userId} authenticated with passkey ${passkey.id}`);

  return {
    userId: passkey.userId,
    passkeyId: passkey.id,
  };
}

// =====================================================
// Passkey Management
// =====================================================

/**
 * Get all passkeys for a user
 */
export async function getUserPasskeys(userId: string): Promise<PasskeyInfo[]> {
  const db = getDb();

  const passkeys = await db
    .select({
      id: userPasskeys.id,
      name: userPasskeys.name,
      credentialDeviceType: userPasskeys.credentialDeviceType,
      credentialBackedUp: userPasskeys.credentialBackedUp,
      createdAt: userPasskeys.createdAt,
      lastUsedAt: userPasskeys.lastUsedAt,
    })
    .from(userPasskeys)
    .where(eq(userPasskeys.userId, userId))
    .orderBy(userPasskeys.createdAt);

  return passkeys;
}

/**
 * Rename a passkey
 */
export async function renamePasskey(
  userId: string,
  passkeyId: string,
  newName: string
): Promise<boolean> {
  const db = getDb();

  const result = await db
    .update(userPasskeys)
    .set({ name: newName })
    .where(and(eq(userPasskeys.id, passkeyId), eq(userPasskeys.userId, userId)))
    .returning();

  return result.length > 0;
}

/**
 * Delete a passkey
 */
export async function deletePasskey(
  userId: string,
  passkeyId: string,
  requestContext?: { ip?: string; userAgent?: string }
): Promise<boolean> {
  const db = getDb();

  // Get passkey info for audit
  const [passkey] = await db
    .select({ id: userPasskeys.id, name: userPasskeys.name })
    .from(userPasskeys)
    .where(and(eq(userPasskeys.id, passkeyId), eq(userPasskeys.userId, userId)))
    .limit(1);

  if (!passkey) {
    return false;
  }

  // Delete the passkey
  const result = await db
    .delete(userPasskeys)
    .where(and(eq(userPasskeys.id, passkeyId), eq(userPasskeys.userId, userId)))
    .returning();

  if (result.length > 0) {
    // Audit log
    logActivityAsync({
      userId,
      action: 'PASSKEY_REMOVED',
      entityType: 'PASSKEY',
      entityId: passkeyId,
      ip: requestContext?.ip,
      userAgent: requestContext?.userAgent,
      metadata: { passkeyName: passkey.name },
    });

    console.log(`[WEBAUTHN] Passkey ${passkeyId} deleted for user ${userId}`);
  }

  return result.length > 0;
}

/**
 * Check if a user has any passkeys registered
 */
export async function hasPasskeys(userId: string): Promise<boolean> {
  const db = getDb();

  const result = await db
    .select({ id: userPasskeys.id })
    .from(userPasskeys)
    .where(eq(userPasskeys.userId, userId))
    .limit(1);

  return result.length > 0;
}

/**
 * Count passkeys for a user
 */
export async function countPasskeys(userId: string): Promise<number> {
  const db = getDb();

  const result = await db
    .select({ id: userPasskeys.id })
    .from(userPasskeys)
    .where(eq(userPasskeys.userId, userId));

  return result.length;
}
