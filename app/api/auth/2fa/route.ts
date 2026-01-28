/**
 * Two-Factor Authentication API
 *
 * Endpoints:
 * GET - Get 2FA status
 * POST - Setup or verify 2FA
 * DELETE - Disable 2FA
 */

import { NextRequest, NextResponse } from "next/server";
import { createTwoFactorService } from "@/lib/auth/two-factor";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function getAuthenticatedUser(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  try {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}

/**
 * GET - Get current 2FA status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const twoFactor = createTwoFactorService(user.id);
    const status = await twoFactor.getStatus();

    return NextResponse.json({
      enabled: status.enabled,
      verifiedAt: status.verifiedAt,
      backupCodesRemaining: status.backupCodesRemaining,
    });
  } catch (error) {
    console.error("[2FA_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}

/**
 * POST - Setup, verify, or validate 2FA
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, code } = body;

    const twoFactor = createTwoFactorService(user.id);

    switch (action) {
      case "setup": {
        // Initialize 2FA setup
        const setup = await twoFactor.setup(user.email);
        return NextResponse.json({
          success: true,
          qrCodeUrl: setup.qrCodeUrl,
          backupCodes: setup.backupCodes,
          message: "Scan the QR code with your authenticator app",
        });
      }

      case "verify": {
        // Verify setup with TOTP code
        if (!code) {
          return NextResponse.json(
            { error: "Code is required" },
            { status: 400 }
          );
        }

        const verified = await twoFactor.verify(code);

        if (!verified) {
          return NextResponse.json(
            { error: "Invalid verification code" },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "2FA enabled successfully",
        });
      }

      case "validate": {
        // Validate code during login
        if (!code) {
          return NextResponse.json(
            { error: "Code is required" },
            { status: 400 }
          );
        }

        const valid = await twoFactor.validate(code);

        if (!valid) {
          return NextResponse.json(
            { error: "Invalid authentication code" },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Authentication successful",
        });
      }

      case "regenerate-backup": {
        // Regenerate backup codes
        if (!code) {
          return NextResponse.json(
            { error: "Current code is required" },
            { status: 400 }
          );
        }

        const newCodes = await twoFactor.regenerateBackupCodes(code);

        if (!newCodes) {
          return NextResponse.json(
            { error: "Invalid authentication code" },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          backupCodes: newCodes,
          message: "Backup codes regenerated",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: setup, verify, validate, or regenerate-backup" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[2FA_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to process 2FA request" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disable 2FA
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Authentication code is required" },
        { status: 400 }
      );
    }

    const twoFactor = createTwoFactorService(user.id);
    const disabled = await twoFactor.disable(code);

    if (!disabled) {
      return NextResponse.json(
        { error: "Invalid authentication code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("[2FA_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
