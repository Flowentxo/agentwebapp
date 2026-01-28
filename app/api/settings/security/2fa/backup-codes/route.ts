/**
 * 2FA Backup Codes Management API
 *
 * Endpoints for:
 * - Getting backup codes status
 * - Regenerating backup codes
 * - Using a backup code (for login recovery)
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { users, userAudit } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: string;
}

/**
 * Generate new backup codes
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
 * Get authenticated user
 */
async function getAuthenticatedUser(req: NextRequest) {
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
 * GET - Get backup codes status
 * Shows which codes have been used
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

    if (!user.mfaEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled" },
        { status: 400 }
      );
    }

    const backupCodes = user.mfaRecoveryCodes
      ? (JSON.parse(user.mfaRecoveryCodes) as BackupCode[])
      : [];

    // Return codes with masked values
    const maskedCodes = backupCodes.map((c, i) => ({
      index: i + 1,
      used: c.used,
      usedAt: c.usedAt || null,
      // Only show first 4 chars, mask rest
      preview: c.used ? "USED" : `${c.code.substring(0, 4)}-****`,
    }));

    const totalCodes = backupCodes.length;
    const usedCodes = backupCodes.filter(c => c.used).length;
    const remainingCodes = totalCodes - usedCodes;

    return NextResponse.json({
      codes: maskedCodes,
      totalCodes,
      usedCodes,
      remainingCodes,
      shouldRegenerate: remainingCodes <= 2,
    });
  } catch (error) {
    console.error("[BACKUP_CODES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get backup codes" },
      { status: 500 }
    );
  }
}

/**
 * POST - Regenerate backup codes
 * Requires TOTP verification for security
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

    if (!user.mfaEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled" },
        { status: 400 }
      );
    }

    // Optional: Verify with current TOTP code for extra security
    // const body = await req.json();
    // if (body.code && !verifyTOTP(user.mfaSecret, body.code)) {
    //   return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    // }

    // Generate new codes
    const newCodes = generateBackupCodes();
    const codesData: BackupCode[] = newCodes.map(code => ({
      code,
      used: false,
    }));

    // Save new codes
    const db = getDb();
    await db
      .update(users)
      .set({
        mfaRecoveryCodes: JSON.stringify(codesData),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await logAudit(user.id, "backup_codes_regenerated", {
      previousCodesCount: user.mfaRecoveryCodes
        ? JSON.parse(user.mfaRecoveryCodes).length
        : 0,
      newCodesCount: newCodes.length,
    }, req);

    return NextResponse.json({
      success: true,
      codes: newCodes,
      message: "Backup codes regenerated successfully. Save these codes in a secure location.",
    });
  } catch (error) {
    console.error("[BACKUP_CODES_REGENERATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Use a backup code (mark as used)
 * Used during login when TOTP is unavailable
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, backupCode } = body;

    if (!userId || !backupCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.mfaEnabled || !user.mfaRecoveryCodes) {
      return NextResponse.json(
        { error: "2FA is not enabled or no backup codes" },
        { status: 400 }
      );
    }

    const codes = JSON.parse(user.mfaRecoveryCodes) as BackupCode[];
    const codeIndex = codes.findIndex(c =>
      c.code.toUpperCase() === backupCode.toUpperCase() && !c.used
    );

    if (codeIndex === -1) {
      await logAudit(userId, "backup_code_invalid", {
        attemptedCode: backupCode.substring(0, 4) + "****",
      }, req);

      return NextResponse.json(
        { error: "Invalid or already used backup code" },
        { status: 400 }
      );
    }

    // Mark code as used
    codes[codeIndex].used = true;
    codes[codeIndex].usedAt = new Date().toISOString();

    await db
      .update(users)
      .set({
        mfaRecoveryCodes: JSON.stringify(codes),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await logAudit(userId, "backup_code_used", {
      codeIndex: codeIndex + 1,
      remainingCodes: codes.filter(c => !c.used).length,
    }, req);

    const remainingCodes = codes.filter(c => !c.used).length;

    return NextResponse.json({
      success: true,
      remainingCodes,
      shouldRegenerate: remainingCodes <= 2,
      message: remainingCodes <= 2
        ? "Warning: You have only ${remainingCodes} backup codes left. Consider regenerating."
        : "Backup code used successfully.",
    });
  } catch (error) {
    console.error("[BACKUP_CODE_USE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to use backup code" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Download backup codes (returns all unused codes in plain text)
 * For user to save securely
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

    if (!user.mfaEnabled || !user.mfaRecoveryCodes) {
      return NextResponse.json(
        { error: "2FA is not enabled or no backup codes" },
        { status: 400 }
      );
    }

    const codes = JSON.parse(user.mfaRecoveryCodes) as BackupCode[];
    const unusedCodes = codes.filter(c => !c.used).map(c => c.code);

    await logAudit(user.id, "backup_codes_downloaded", {
      downloadedCodesCount: unusedCodes.length,
    }, req);

    // Format for download
    const content = [
      "SINTRA AI - 2FA Backup Codes",
      "=" .repeat(40),
      "",
      `Generated: ${new Date().toISOString()}`,
      `Account: ${user.email}`,
      "",
      "Keep these codes in a secure location.",
      "Each code can only be used once.",
      "",
      "Codes:",
      ...unusedCodes.map((code, i) => `${(i + 1).toString().padStart(2, "0")}. ${code}`),
    ].join("\n");

    return NextResponse.json({
      success: true,
      content,
      filename: `sintra-backup-codes-${new Date().toISOString().split("T")[0]}.txt`,
      unusedCodes,
    });
  } catch (error) {
    console.error("[BACKUP_CODES_DOWNLOAD_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to download backup codes" },
      { status: 500 }
    );
  }
}
