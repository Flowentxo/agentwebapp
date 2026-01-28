/**
 * TWO-FACTOR AUTHENTICATION (2FA) SERVICE
 *
 * Features:
 * - TOTP (Time-based One-Time Password) generation
 * - QR code generation for authenticator apps
 * - Backup codes generation
 * - 2FA verification
 * - Recovery options
 */

import crypto from "crypto";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

// ============================================
// TYPES
// ============================================

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  verifiedAt?: string;
  backupCodesRemaining: number;
}

// ============================================
// TOTP IMPLEMENTATION
// ============================================

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;

// SECURITY: SHA256 is more secure than SHA1
// Note: Most authenticator apps (Google Authenticator, Authy, 1Password) support SHA256
// RFC 6238 recommends SHA256 or SHA512 for new implementations
// If users have issues, they may need to re-enroll their 2FA
const TOTP_ALGORITHM = "sha256";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generate a random base32-encoded secret
 */
export function generateSecret(length = 20): string {
  const buffer = crypto.randomBytes(length);
  let secret = "";

  for (let i = 0; i < buffer.length; i++) {
    secret += BASE32_ALPHABET[buffer[i] % 32];
  }

  return secret;
}

/**
 * Decode base32 string to buffer
 */
function base32Decode(encoded: string): Buffer {
  const stripped = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const output = [];
  let bits = 0;
  let value = 0;

  for (const char of stripped) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generate TOTP code for given timestamp
 */
export function generateTOTP(secret: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  const counter = Math.floor(time / 1000 / TOTP_PERIOD);

  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  // HMAC-SHA1
  const secretBuffer = base32Decode(secret);
  const hmac = crypto.createHmac(TOTP_ALGORITHM, secretBuffer);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const truncated =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Generate code with leading zeros
  const code = (truncated % Math.pow(10, TOTP_DIGITS)).toString();
  return code.padStart(TOTP_DIGITS, "0");
}

/**
 * Verify TOTP code with time window tolerance
 */
export function verifyTOTP(secret: string, code: string, window = 1): boolean {
  const now = Date.now();

  // Check current and adjacent time periods
  for (let i = -window; i <= window; i++) {
    const timestamp = now + i * TOTP_PERIOD * 1000;
    const expectedCode = generateTOTP(secret, timestamp);

    if (crypto.timingSafeEqual(
      Buffer.from(code),
      Buffer.from(expectedCode)
    )) {
      return true;
    }
  }

  return false;
}

/**
 * Generate otpauth:// URL for authenticator apps
 */
export function generateOTPAuthURL(
  secret: string,
  email: string,
  issuer = "Flowent AI"
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);

  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?` +
    `secret=${secret}&issuer=${encodedIssuer}&algorithm=${TOTP_ALGORITHM.toUpperCase()}&` +
    `digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Generate QR code data URL using the qrcode library
 */
export async function generateQRCodeDataURL(otpauthURL: string): Promise<string> {
  try {
    // Dynamic import to avoid issues with SSR
    const QRCode = await import("qrcode");

    // Generate QR code as data URL (base64 PNG)
    const dataUrl = await QRCode.toDataURL(otpauthURL, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return dataUrl;
  } catch (error) {
    console.error("[2FA] Failed to generate QR code:", error);
    // Fallback to external API if local generation fails
    const encodedURL = encodeURIComponent(otpauthURL);
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodedURL}`;
  }
}

// ============================================
// BACKUP CODES
// ============================================

/**
 * Generate backup codes
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

/**
 * Hash backup codes for storage
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map((code) =>
    crypto.createHash("sha256").update(code).digest("hex")
  );
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
  const hashedInput = crypto.createHash("sha256").update(code).digest("hex");
  return hashedCodes.findIndex((hashed) =>
    crypto.timingSafeEqual(Buffer.from(hashed, "hex"), Buffer.from(hashedInput, "hex"))
  );
}

// ============================================
// 2FA SERVICE
// ============================================

export class TwoFactorService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize 2FA setup
   */
  async setup(email: string): Promise<TwoFactorSetup> {
    const secret = generateSecret();
    const backupCodes = generateBackupCodes();
    const hashedCodes = hashBackupCodes(backupCodes);

    const otpauthURL = generateOTPAuthURL(secret, email);
    const qrCodeUrl = await generateQRCodeDataURL(otpauthURL);

    const db = getDb();

    // Store pending 2FA setup (not yet verified)
    await db.execute(sql`
      INSERT INTO user_2fa (user_id, secret, backup_codes, status, created_at)
      VALUES (${this.userId}, ${secret}, ${JSON.stringify(hashedCodes)}, 'pending', NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        secret = ${secret},
        backup_codes = ${JSON.stringify(hashedCodes)},
        status = 'pending',
        updated_at = NOW()
    `);

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify and enable 2FA
   */
  async verify(code: string): Promise<boolean> {
    const db = getDb();

    // Get pending 2FA setup
    const result = await db.execute(sql`
      SELECT secret FROM user_2fa
      WHERE user_id = ${this.userId} AND status = 'pending'
    `);

    const rows = result as unknown as Array<{ secret: string }>;
    if (!rows[0]?.secret) {
      throw new Error("No pending 2FA setup found");
    }

    const secret = rows[0].secret;

    // Verify the code
    if (!verifyTOTP(secret, code)) {
      return false;
    }

    // Enable 2FA
    await db.execute(sql`
      UPDATE user_2fa
      SET status = 'active', verified_at = NOW(), updated_at = NOW()
      WHERE user_id = ${this.userId}
    `);

    return true;
  }

  /**
   * Validate 2FA code during login
   */
  async validate(code: string): Promise<boolean> {
    const db = getDb();

    // Get active 2FA
    const result = await db.execute(sql`
      SELECT secret, backup_codes FROM user_2fa
      WHERE user_id = ${this.userId} AND status = 'active'
    `);

    const rows = result as unknown as Array<{ secret: string; backup_codes: string }>;
    if (!rows[0]) {
      return true; // 2FA not enabled
    }

    const { secret, backup_codes } = rows[0];
    const hashedCodes: string[] = JSON.parse(backup_codes);

    // Try TOTP first
    if (verifyTOTP(secret, code)) {
      return true;
    }

    // Try backup code
    const formattedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const backupCodeIndex = verifyBackupCode(formattedCode, hashedCodes);

    if (backupCodeIndex >= 0) {
      // Remove used backup code
      hashedCodes.splice(backupCodeIndex, 1);
      await db.execute(sql`
        UPDATE user_2fa
        SET backup_codes = ${JSON.stringify(hashedCodes)}, updated_at = NOW()
        WHERE user_id = ${this.userId}
      `);
      return true;
    }

    return false;
  }

  /**
   * Get 2FA status
   */
  async getStatus(): Promise<TwoFactorStatus> {
    const db = getDb();

    const result = await db.execute(sql`
      SELECT status, verified_at, backup_codes FROM user_2fa
      WHERE user_id = ${this.userId}
    `);

    const rows = result as unknown as Array<{
      status: string;
      verified_at: string;
      backup_codes: string;
    }>;

    if (!rows[0] || rows[0].status !== "active") {
      return { enabled: false, backupCodesRemaining: 0 };
    }

    const backupCodes: string[] = JSON.parse(rows[0].backup_codes);

    return {
      enabled: true,
      verifiedAt: rows[0].verified_at,
      backupCodesRemaining: backupCodes.length,
    };
  }

  /**
   * Disable 2FA
   */
  async disable(code: string): Promise<boolean> {
    // Verify code first
    const isValid = await this.validate(code);
    if (!isValid) {
      return false;
    }

    const db = getDb();
    await db.execute(sql`
      DELETE FROM user_2fa WHERE user_id = ${this.userId}
    `);

    return true;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(code: string): Promise<string[] | null> {
    // Verify current code
    const isValid = await this.validate(code);
    if (!isValid) {
      return null;
    }

    const newBackupCodes = generateBackupCodes();
    const hashedCodes = hashBackupCodes(newBackupCodes);

    const db = getDb();
    await db.execute(sql`
      UPDATE user_2fa
      SET backup_codes = ${JSON.stringify(hashedCodes)}, updated_at = NOW()
      WHERE user_id = ${this.userId}
    `);

    return newBackupCodes;
  }

  /**
   * Check if 2FA is required for login
   */
  async isRequired(): Promise<boolean> {
    const status = await this.getStatus();
    return status.enabled;
  }
}

// Export factory
export function createTwoFactorService(userId: string): TwoFactorService {
  return new TwoFactorService(userId);
}
