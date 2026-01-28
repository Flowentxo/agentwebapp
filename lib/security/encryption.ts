/**
 * ENCRYPTION UTILITY
 *
 * Secure encryption for OAuth tokens and database passwords
 * Uses AES-256-GCM for authenticated symmetric encryption
 */

import crypto from 'crypto';

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;       // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;      // 128 bits
const KEY_LENGTH = 32;      // 256 bits
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

// Get encryption key from environment or use default (should be in .env)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-me-in-production-32bytes';

// ============================================================================
// NEW: OAuth Token Encryption Interface
// ============================================================================

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  tag: string;
}

/**
 * Get and validate the encryption key from environment (strict mode)
 */
function getValidatedEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY is not set in environment variables. ' +
      'Generate one using: generateEncryptionKey()'
    );
  }

  // Key should be 64 hex characters (32 bytes)
  if (key.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be 64 hex characters (32 bytes). ` +
      `Current length: ${key.length}. ` +
      'Generate a valid key using: generateEncryptionKey()'
    );
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(key)) {
    throw new Error('ENCRYPTION_KEY must be a valid hexadecimal string');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Generate a new encryption key for .env setup
 * @returns A 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt sensitive text using AES-256-GCM (for OAuth tokens)
 * @param text - Plain text to encrypt
 * @returns Encrypted data with IV and authentication tag
 */
export function encrypt(text: string): EncryptedData {
  if (!text) {
    throw new Error('Cannot encrypt empty or null text');
  }

  const key = getValidatedEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

/**
 * Decrypt text that was encrypted with AES-256-GCM
 * @param encryptedData - Hex-encoded encrypted data
 * @param iv - Hex-encoded initialization vector
 * @param tag - Hex-encoded authentication tag
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string, iv: string, tag: string): string {
  if (!encryptedData || !iv || !tag) {
    throw new Error('Missing required decryption parameters');
  }

  const key = getValidatedEncryptionKey();

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt an object (converts to JSON first)
 */
export function encryptObject<T>(obj: T): EncryptedData {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt and parse JSON object
 */
export function decryptObject<T>(encryptedData: string, iv: string, tag: string): T {
  const decrypted = decrypt(encryptedData, iv, tag);
  return JSON.parse(decrypted) as T;
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getValidatedEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate encryption setup by performing a test encrypt/decrypt cycle
 */
export function validateEncryptionSetup(): { valid: boolean; error?: string } {
  try {
    const testText = 'encryption-validation-test';
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted.encryptedData, encrypted.iv, encrypted.tag);

    if (decrypted !== testText) {
      return { valid: false, error: 'Decryption produced incorrect result' };
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

// ============================================================================
// LEGACY: Password Encryption (keeping for backward compatibility)
// ============================================================================

/**
 * Derive a key from the encryption key using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    ENCRYPTION_KEY,
    salt,
    100000,
    32,
    'sha512'
  );
}

/**
 * Encrypt a password
 */
export function encryptPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(password, 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  // Combine: salt + iv + tag + encrypted
  const result = Buffer.concat([salt, iv, tag, encrypted]);

  return result.toString('base64');
}

/**
 * Decrypt a password
 */
export function decryptPassword(encryptedPassword: string): string {
  const data = Buffer.from(encryptedPassword, 'base64');

  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, TAG_POSITION);
  const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION);
  const encrypted = data.subarray(ENCRYPTED_POSITION);

  const key = deriveKey(salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Test if encryption/decryption works
 */
export function testEncryption(): boolean {
  try {
    const testPassword = 'test-password-123';
    const encrypted = encryptPassword(testPassword);
    const decrypted = decryptPassword(encrypted);
    return testPassword === decrypted;
  } catch (error) {
    console.error('[ENCRYPTION] Test failed:', error);
    return false;
  }
}
