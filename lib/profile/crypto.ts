/**
 * SINTRA Profile System - Cryptography Utilities
 * AES-256-GCM encryption for MFA secrets and recovery codes
 */

import crypto from 'crypto';

// =====================================================
// Configuration & Constants
// =====================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// =====================================================
// Key Management
// =====================================================

/**
 * Get encryption key from environment
 * Uses ENCRYPTION_KEY (unified with OAuth token encryption)
 * Falls back to PROFILE_ENCRYPTION_KEY for backwards compatibility
 * @throws Error if key is missing or invalid
 */
function getEncryptionKey(): Buffer {
  // Use unified ENCRYPTION_KEY (same as OAuth), fallback to PROFILE_ENCRYPTION_KEY
  const keyHex = process.env.ENCRYPTION_KEY || process.env.PROFILE_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY not configured. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Remove any whitespace or newlines
  const cleanKey = keyHex.trim();

  if (cleanKey.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got ${cleanKey.length} characters.`
    );
  }

  try {
    return Buffer.from(cleanKey, 'hex');
  } catch (error) {
    throw new Error('ENCRYPTION_KEY must be valid hexadecimal');
  }
}

// =====================================================
// Encryption & Decryption
// =====================================================

/**
 * Encrypt plaintext using AES-256-GCM
 * @param plaintext - String to encrypt
 * @returns Encrypted string in format: iv:tag:data (all hex)
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Format: iv:tag:data (all hex-encoded)
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

/**
 * Decrypt ciphertext encrypted with encryptSecret
 * @param ciphertext - Encrypted string from encryptSecret
 * @returns Decrypted plaintext
 * @throws Error if ciphertext is invalid or corrupted
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Ciphertext must be a non-empty string');
  }

  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    throw new Error(
      'Invalid ciphertext format. Expected format: iv:tag:data'
    );
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(
      `Failed to decrypt: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// =====================================================
// Recovery Codes
// =====================================================

/**
 * Generate MFA recovery codes
 * @param count - Number of codes to generate (default: 10)
 * @returns Array of recovery codes in format XXXX-XXXX
 */
export function generateRecoveryCodes(count: number = 10): string[] {
  if (count < 1 || count > 100) {
    throw new Error('Count must be between 1 and 100');
  }

  const codes: string[] = [];
  const used = new Set<string>();

  while (codes.length < count) {
    // Generate 4 random bytes = 8 hex characters
    const bytes = crypto.randomBytes(4);
    const code = bytes.toString('hex').toUpperCase();

    // Format as XXXX-XXXX
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;

    // Ensure uniqueness
    if (!used.has(formatted)) {
      codes.push(formatted);
      used.add(formatted);
    }
  }

  return codes;
}

/**
 * Encrypt recovery codes for storage
 * @param codes - Array of recovery codes
 * @returns Encrypted string
 */
export function encryptRecoveryCodes(codes: string[]): string {
  return encryptSecret(JSON.stringify(codes));
}

/**
 * Decrypt recovery codes from storage
 * @param encrypted - Encrypted recovery codes
 * @returns Array of recovery codes
 */
export function decryptRecoveryCodes(encrypted: string): string[] {
  const decrypted = decryptSecret(encrypted);
  return JSON.parse(decrypted) as string[];
}

/**
 * Verify if a recovery code is in the encrypted list
 * @param code - Code to verify
 * @param encryptedCodes - Encrypted recovery codes
 * @returns True if code is valid
 */
export function verifyRecoveryCode(
  code: string,
  encryptedCodes: string
): boolean {
  try {
    const codes = decryptRecoveryCodes(encryptedCodes);
    return codes.includes(code.toUpperCase());
  } catch {
    return false;
  }
}

/**
 * Remove a used recovery code from the list
 * @param code - Code to remove
 * @param encryptedCodes - Encrypted recovery codes
 * @returns Updated encrypted codes, or null if no codes remain
 */
export function removeRecoveryCode(
  code: string,
  encryptedCodes: string
): string | null {
  try {
    const codes = decryptRecoveryCodes(encryptedCodes);
    const filtered = codes.filter((c) => c !== code.toUpperCase());

    if (filtered.length === 0) {
      return null;
    }

    return encryptRecoveryCodes(filtered);
  } catch {
    return null;
  }
}

// =====================================================
// Secret Masking
// =====================================================

/**
 * Mask a secret for display purposes
 * @param secret - Secret to mask
 * @param visibleChars - Number of characters to show at start and end
 * @returns Masked secret (e.g., "ABCD...WXYZ")
 */
export function maskSecret(secret: string, visibleChars: number = 4): string {
  if (!secret || typeof secret !== 'string') {
    return '****';
  }

  if (secret.length <= visibleChars * 2) {
    return '*'.repeat(secret.length);
  }

  const start = secret.slice(0, visibleChars);
  const end = secret.slice(-visibleChars);

  return `${start}...${end}`;
}

// =====================================================
// Testing & Validation
// =====================================================

/**
 * Test encryption/decryption roundtrip
 * @returns True if encryption is working correctly
 */
export function testEncryption(): boolean {
  try {
    const testData = 'Test secret data 123!@#';
    const encrypted = encryptSecret(testData);
    const decrypted = decryptSecret(encrypted);

    return decrypted === testData;
  } catch {
    return false;
  }
}

/**
 * Validate encryption key is properly configured
 * @returns True if key is valid
 */
export function validateEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return testEncryption();
  } catch {
    return false;
  }
}

// =====================================================
// Exports
// =====================================================

export const crypto_utils = {
  encrypt: encryptSecret,
  decrypt: decryptSecret,
  generateRecoveryCodes,
  encryptRecoveryCodes,
  decryptRecoveryCodes,
  verifyRecoveryCode,
  removeRecoveryCode,
  maskSecret,
  test: testEncryption,
  validate: validateEncryptionKey,
};
