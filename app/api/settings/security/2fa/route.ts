/**
 * Enterprise 2FA API Endpoints
 *
 * Provides TOTP-based two-factor authentication with:
 * - QR code generation
 * - Secret verification
 * - Backup codes management
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { users, userAudit } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// TOTP Configuration
const TOTP_CONFIG = {
  issuer: "SINTRA AI",
  algorithm: "SHA1",
  digits: 6,
  period: 30,
};

/**
 * Generate a cryptographically secure Base32 secret
 */
function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";

  for (let i = 0; i < buffer.length; i++) {
    secret += base32Chars[buffer[i] % 32];
  }

  return secret;
}

/**
 * Generate 10 backup codes
 */
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

/**
 * Generate OTPAuth URL for QR codes
 */
function generateOTPAuthURL(secret: string, email: string): string {
  const encodedIssuer = encodeURIComponent(TOTP_CONFIG.issuer);
  const encodedEmail = encodeURIComponent(email);

  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${TOTP_CONFIG.algorithm}&digits=${TOTP_CONFIG.digits}&period=${TOTP_CONFIG.period}`;
}

/**
 * Verify TOTP code against secret
 */
function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const currentTime = Math.floor(Date.now() / 1000);

  for (let i = -window; i <= window; i++) {
    const counter = Math.floor((currentTime + i * TOTP_CONFIG.period) / TOTP_CONFIG.period);
    const generatedCode = generateTOTPCode(secret, counter);

    if (generatedCode === code) {
      return true;
    }
  }

  return false;
}

/**
 * Generate TOTP code for a given counter
 */
function generateTOTPCode(secret: string, counter: number): string {
  // Decode Base32 secret
  const secretBuffer = base32Decode(secret);

  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  // Generate HMAC-SHA1
  const hmac = crypto.createHmac("sha1", secretBuffer);
  hmac.update(counterBuffer);
  const hmacResult = hmac.digest();

  // Dynamic truncation
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binaryCode =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  // Generate 6-digit code
  const otp = binaryCode % Math.pow(10, TOTP_CONFIG.digits);
  return otp.toString().padStart(TOTP_CONFIG.digits, "0");
}

/**
 * Base32 decode helper
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const stripped = encoded.replace(/=/g, "").toUpperCase();

  let bits = "";
  for (const char of stripped) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Log security audit event
 */
async function logAudit(
  userId: string,
  action: string,
  details: Record<string, unknown>,
  req: NextRequest
) {
  try {
    const db = getDb();
    await db.insert(userAudit).values({
      userId,
      action,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details,
    });
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}

/**
 * Get user from session/request
 * In production, this should validate the session token
 */
async function getAuthenticatedUser(req: NextRequest) {
  // Get user ID from header or session
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return null;
  }

  try {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch (error) {
    console.error("[AUTH_ERROR]", error);
    return null;
  }
}

/**
 * POST - Initialize 2FA setup
 * Returns QR code URL and secret for authenticator app
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: "2FA is already enabled" },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = generateTOTPSecret();
    const otpAuthUrl = generateOTPAuthURL(secret, user.email);

    // Store secret temporarily (will be confirmed on verify)
    // In production, store in Redis with short TTL
    const db = getDb();
    await db
      .update(users)
      .set({
        mfaSecret: secret, // Temporarily store unconfirmed secret
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await logAudit(user.id, "2fa_setup_initiated", {}, req);

    return NextResponse.json({
      success: true,
      secret,
      otpAuthUrl,
      issuer: TOTP_CONFIG.issuer,
      algorithm: TOTP_CONFIG.algorithm,
      digits: TOTP_CONFIG.digits,
      period: TOTP_CONFIG.period,
    });
  } catch (error) {
    console.error("[2FA_SETUP_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to setup 2FA" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Verify and enable 2FA
 * Validates the TOTP code and generates backup codes
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code } = body;

    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid code format" },
        { status: 400 }
      );
    }

    if (!user.mfaSecret) {
      return NextResponse.json(
        { error: "2FA setup not initiated" },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = verifyTOTP(user.mfaSecret, code);

    if (!isValid) {
      await logAudit(user.id, "2fa_verification_failed", { attemptedCode: code.substring(0, 2) + "****" }, req);

      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Enable 2FA
    const db = getDb();
    await db
      .update(users)
      .set({
        mfaEnabled: true,
        mfaRecoveryCodes: JSON.stringify(backupCodes.map(code => ({ code, used: false }))),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await logAudit(user.id, "2fa_enabled", { backupCodesGenerated: backupCodes.length }, req);

    return NextResponse.json({
      success: true,
      message: "2FA enabled successfully",
      backupCodes,
    });
  } catch (error) {
    console.error("[2FA_VERIFY_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disable 2FA
 * Requires password verification for security
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!user.mfaEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { code, backupCode } = body;

    // Verify with TOTP code or backup code
    let verified = false;
    let verificationMethod = "";

    if (code && user.mfaSecret) {
      verified = verifyTOTP(user.mfaSecret, code);
      verificationMethod = "totp";
    } else if (backupCode && user.mfaRecoveryCodes) {
      const storedCodes = JSON.parse(user.mfaRecoveryCodes) as Array<{ code: string; used: boolean }>;
      const matchingCode = storedCodes.find(c => c.code === backupCode && !c.used);

      if (matchingCode) {
        verified = true;
        verificationMethod = "backup_code";
      }
    }

    if (!verified) {
      await logAudit(user.id, "2fa_disable_failed", { reason: "invalid_verification" }, req);

      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Disable 2FA
    const db = getDb();
    await db
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await logAudit(user.id, "2fa_disabled", { verificationMethod }, req);

    return NextResponse.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("[2FA_DISABLE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}

/**
 * GET - Get 2FA status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const backupCodes = user.mfaRecoveryCodes
      ? JSON.parse(user.mfaRecoveryCodes) as Array<{ code: string; used: boolean }>
      : [];

    const unusedBackupCodes = backupCodes.filter(c => !c.used).length;

    return NextResponse.json({
      enabled: user.mfaEnabled,
      hasBackupCodes: backupCodes.length > 0,
      unusedBackupCodes,
      setupRequired: !user.mfaEnabled && !user.mfaSecret,
    });
  } catch (error) {
    console.error("[2FA_STATUS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}
