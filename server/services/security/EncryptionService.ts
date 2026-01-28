/**
 * Encryption Service
 *
 * Phase 5: Credential Vault & Sub-Workflow Orchestration
 *
 * Provides AES-256-GCM encryption for secure credential storage.
 * Uses environment-based ENCRYPTION_KEY for master key derivation.
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV per encryption operation
 * - PBKDF2 key derivation with high iteration count
 * - Secure memory scrubbing after use
 * - No plaintext key storage
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
  createHash,
  timingSafeEqual,
} from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits for AES-256
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha512';

// ============================================================================
// INTERFACES
// ============================================================================

export interface EncryptionResult {
  encryptedData: string; // Base64-encoded ciphertext
  iv: string; // Hex-encoded IV
  authTag: string; // Hex-encoded authentication tag
}

export interface DecryptionInput {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export interface EncryptionConfig {
  /** Override the encryption key (for testing) */
  encryptionKey?: string;
  /** Salt for key derivation (optional, will use default if not provided) */
  salt?: string;
}

// ============================================================================
// ENCRYPTION SERVICE CLASS
// ============================================================================

export class EncryptionService {
  private derivedKey: Buffer | null = null;
  private keySalt: Buffer;
  private isInitialized = false;

  constructor(config: EncryptionConfig = {}) {
    // Get encryption key from environment or config
    const masterKey = config.encryptionKey || process.env.ENCRYPTION_KEY;

    if (!masterKey) {
      console.warn('[EncryptionService] No ENCRYPTION_KEY found. Encryption will fail!');
    }

    // Use provided salt or derive from a fixed value for consistency
    if (config.salt) {
      this.keySalt = Buffer.from(config.salt, 'hex');
    } else {
      // Create a deterministic salt from the key itself (for key rotation support)
      // In production, this should be stored securely alongside the key
      this.keySalt = createHash('sha256')
        .update('flowent-credential-vault-salt-v1')
        .digest()
        .subarray(0, SALT_LENGTH);
    }

    if (masterKey) {
      this.deriveKey(masterKey);
      this.isInitialized = true;
    }
  }

  // --------------------------------------------------------------------------
  // KEY MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Derive encryption key from master key using PBKDF2
   */
  private deriveKey(masterKey: string): void {
    this.derivedKey = pbkdf2Sync(
      masterKey,
      this.keySalt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      PBKDF2_DIGEST
    );
  }

  /**
   * Check if the service is properly initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.derivedKey) {
      throw new Error('EncryptionService not initialized. Set ENCRYPTION_KEY environment variable.');
    }
  }

  /**
   * Securely wipe a buffer from memory
   */
  private secureWipe(buffer: Buffer): void {
    // Fill with random data then zeros to prevent memory remanence
    randomBytes(buffer.length).copy(buffer);
    buffer.fill(0);
  }

  // --------------------------------------------------------------------------
  // ENCRYPTION
  // --------------------------------------------------------------------------

  /**
   * Encrypt plaintext data
   */
  encrypt(plaintext: string | object): EncryptionResult {
    this.ensureInitialized();

    // Convert object to JSON if needed
    const plaintextStr = typeof plaintext === 'string'
      ? plaintext
      : JSON.stringify(plaintext);

    // Generate a unique IV for this encryption
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, this.derivedKey!, iv);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintextStr, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Encrypt with additional authenticated data (AAD)
   * Useful for binding ciphertext to a specific context (e.g., credential ID)
   */
  encryptWithAAD(plaintext: string | object, aad: string): EncryptionResult {
    this.ensureInitialized();

    const plaintextStr = typeof plaintext === 'string'
      ? plaintext
      : JSON.stringify(plaintext);

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.derivedKey!, iv);

    // Set AAD before encrypting
    cipher.setAAD(Buffer.from(aad, 'utf8'));

    const encrypted = Buffer.concat([
      cipher.update(plaintextStr, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  // --------------------------------------------------------------------------
  // DECRYPTION
  // --------------------------------------------------------------------------

  /**
   * Decrypt ciphertext
   */
  decrypt(input: DecryptionInput): string {
    this.ensureInitialized();

    const { encryptedData, iv, authTag } = input;

    // Validate inputs
    if (!encryptedData || !iv || !authTag) {
      throw new Error('Invalid decryption input: missing required fields');
    }

    // Convert from hex/base64
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');

    // Validate lengths
    if (ivBuffer.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }
    if (authTagBuffer.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid auth tag length');
    }

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, this.derivedKey!, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    try {
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      // Don't leak details about decryption failures
      throw new Error('Decryption failed: invalid ciphertext or authentication');
    }
  }

  /**
   * Decrypt with AAD verification
   */
  decryptWithAAD(input: DecryptionInput, aad: string): string {
    this.ensureInitialized();

    const { encryptedData, iv, authTag } = input;

    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.derivedKey!, ivBuffer);
    decipher.setAuthTag(authTagBuffer);
    decipher.setAAD(Buffer.from(aad, 'utf8'));

    try {
      const decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Decryption failed: invalid ciphertext, AAD, or authentication');
    }
  }

  /**
   * Decrypt and parse as JSON
   */
  decryptToObject<T = unknown>(input: DecryptionInput): T {
    const decrypted = this.decrypt(input);

    try {
      return JSON.parse(decrypted) as T;
    } catch (error) {
      throw new Error('Failed to parse decrypted data as JSON');
    }
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Generate a cryptographically secure random string
   */
  generateRandomString(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure random token for webhooks, etc.
   */
  generateSecureToken(length: number = 32): string {
    // URL-safe base64
    return randomBytes(length)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Hash a value (one-way, for comparison purposes)
   */
  hash(value: string, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    return createHash(algorithm).update(value).digest('hex');
  }

  /**
   * Timing-safe string comparison
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return timingSafeEqual(bufA, bufB);
  }

  /**
   * Mask a sensitive value for logging
   */
  mask(value: string, visibleChars: number = 4): string {
    if (value.length <= visibleChars * 2) {
      return '*'.repeat(value.length);
    }

    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - visibleChars);
    const masked = '*'.repeat(Math.max(value.length - visibleChars * 2, 4));

    return `${start}${masked}${end}`;
  }

  /**
   * Validate encryption key strength
   */
  static validateKeyStrength(key: string): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (key.length < 32) {
      issues.push('Key should be at least 32 characters');
    }

    if (!/[a-z]/.test(key)) {
      issues.push('Key should contain lowercase letters');
    }

    if (!/[A-Z]/.test(key)) {
      issues.push('Key should contain uppercase letters');
    }

    if (!/[0-9]/.test(key)) {
      issues.push('Key should contain numbers');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(key)) {
      issues.push('Key should contain special characters');
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(.)\1+$/, // All same character
      /^(12345|password|secret|admin)/i, // Common weak prefixes
      /^[a-z]+$/i, // Only letters
      /^[0-9]+$/, // Only numbers
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(key)) {
        issues.push('Key matches a weak pattern');
        break;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate a strong encryption key
   */
  static generateEncryptionKey(length: number = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const bytes = randomBytes(length);
    let key = '';

    for (let i = 0; i < length; i++) {
      key += chars[bytes[i] % chars.length];
    }

    return key;
  }

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------

  /**
   * Securely destroy the service instance
   * Call this when shutting down to clear sensitive data from memory
   */
  destroy(): void {
    if (this.derivedKey) {
      this.secureWipe(this.derivedKey);
      this.derivedKey = null;
    }
    this.secureWipe(this.keySalt);
    this.isInitialized = false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let encryptionServiceInstance: EncryptionService | null = null;

export function getEncryptionService(config?: EncryptionConfig): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService(config);
  }
  return encryptionServiceInstance;
}

/**
 * Create a new isolated encryption service (for testing)
 */
export function createEncryptionService(config: EncryptionConfig): EncryptionService {
  return new EncryptionService(config);
}

export default EncryptionService;
