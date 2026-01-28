/**
 * SINTRA Auth System - Cryptography Utilities
 * Secure password hashing, token generation, and token hashing
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// =====================================================
// Password Hashing (Bcrypt)
// Using bcrypt with 12 rounds (OWASP recommendation)
// =====================================================

/**
 * Current bcrypt cost factor for NEW password hashes.
 * SECURITY NOTE:
 * - 6 rounds is too weak (< 1ms to hash on modern hardware)
 * - 10 rounds is minimum recommended (OWASP)
 * - 12 rounds provides ~300ms hash time (good balance of security/UX)
 * - Increase this value if hardware improves significantly
 */
const BCRYPT_ROUNDS = 12;

/**
 * Minimum acceptable bcrypt cost factor for existing hashes.
 * Hashes below this threshold will be rehashed on next login.
 */
const BCRYPT_MIN_ROUNDS = 10;

/**
 * Hash a password using bcrypt with the current cost factor
 * @param password - Plain text password
 * @returns Bcrypt hash with embedded cost factor
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    // Invalid hash format or other bcrypt error
    console.error('[CRYPTO] Password verification error:', error);
    return false;
  }
}

/**
 * Extract the cost factor (rounds) from a bcrypt hash.
 * Bcrypt hash format: $2a$XX$... where XX is the cost factor in decimal.
 * @param hash - Bcrypt hash string
 * @returns Cost factor (rounds) or null if invalid format
 */
export function getBcryptRounds(hash: string): number | null {
  try {
    // Bcrypt hash format: $2a$12$... or $2b$12$...
    const match = hash.match(/^\$2[aby]?\$(\d{2})\$/);
    if (!match) return null;
    return parseInt(match[1], 10);
  } catch {
    return null;
  }
}

/**
 * Check if a password hash needs to be rehashed.
 * Returns true if:
 * - Hash uses fewer rounds than BCRYPT_MIN_ROUNDS
 * - Hash format is unrecognized (should never happen with valid bcrypt)
 *
 * @param hash - Bcrypt hash to check
 * @returns True if hash should be upgraded
 */
export function needsRehash(hash: string): boolean {
  const rounds = getBcryptRounds(hash);

  // If we can't determine rounds, assume it needs rehash (safety first)
  if (rounds === null) {
    console.warn('[CRYPTO] Unable to determine bcrypt rounds from hash, marking for rehash');
    return true;
  }

  // Rehash if cost factor is below minimum threshold
  return rounds < BCRYPT_MIN_ROUNDS;
}

/**
 * Get the current bcrypt cost factor being used for new hashes.
 * Useful for logging and monitoring.
 */
export function getCurrentBcryptRounds(): number {
  return BCRYPT_ROUNDS;
}

// =====================================================
// Token Generation & Hashing
// =====================================================

/**
 * Generate a cryptographically secure random token
 * @param bytes - Number of random bytes (default: 32)
 * @returns Base64url-encoded token (URL-safe, no padding)
 */
export function randomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Hash a token using SHA-256
 * Tokens should NEVER be stored in plaintext in the database
 * @param token - Plain text token
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a random token and its hash
 * @param bytes - Number of random bytes (default: 32)
 * @returns Object with plain token and its hash
 */
export function generateTokenPair(bytes: number = 32): { token: string; hash: string } {
  const token = randomToken(bytes);
  const hash = hashToken(token);
  return { token, hash };
}

// =====================================================
// Timing-Safe Comparison
// =====================================================

/**
 * Compare two strings in constant time to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

// =====================================================
// CSRF Token Generation
// =====================================================

/**
 * Generate a CSRF token (shorter than session tokens)
 * @returns Base64url-encoded CSRF token
 */
export function generateCsrfToken(): string {
  return randomToken(16); // 16 bytes = 128 bits
}

// =====================================================
// Password Strength Checking (Basic)
// For production, consider integrating zxcvbn library
// =====================================================

export interface PasswordStrength {
  score: number; // 0-4 (0=weak, 4=strong)
  feedback: string[];
}

/**
 * Basic password strength checker
 * @param password - Password to check
 * @returns Strength score and feedback
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length scoring
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (password.length >= 18) score++;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Common patterns (negative scoring)
  const commonPatterns = [
    /^[0-9]+$/,           // All numbers
    /^[a-zA-Z]+$/,        // All letters
    /password/i,          // Contains "password"
    /123456/,             // Sequential numbers
    /qwerty/i,            // Keyboard patterns
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid common patterns and words');
      break;
    }
  }

  // Feedback messages
  if (score < 2) {
    feedback.push('Password is too weak');
  } else if (score < 3) {
    feedback.push('Password could be stronger');
  }

  if (password.length < 14) {
    feedback.push('Consider using a longer password (14+ characters)');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('Add special characters for better security');
  }

  return {
    score: Math.min(4, Math.max(0, score)),
    feedback,
  };
}

// =====================================================
// Exports
// =====================================================
export const crypto_utils = {
  hashPassword,
  verifyPassword,
  randomToken,
  hashToken,
  generateTokenPair,
  timingSafeEqual,
  generateCsrfToken,
  checkPasswordStrength,
  // Bcrypt upgrade utilities
  getBcryptRounds,
  needsRehash,
  getCurrentBcryptRounds,
};
