/**
 * Bulk Token Rotation API
 *
 * Emergency rotation of all API keys:
 * - Invalidates all existing keys
 * - Generates new keys with same configurations
 * - Requires explicit confirmation
 * - Comprehensive audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { apiKeys, apiKeyAuditEvents, users, userAudit } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const KEY_PREFIXES = {
  production: "flwnt_live_",
  development: "sk_dev_",
  test: "flwnt_test_",
} as const;

function generateApiKey(environment: string): string {
  const prefix = KEY_PREFIXES[environment as keyof typeof KEY_PREFIXES] || "sk_";
  const randomPart = crypto.randomBytes(24).toString("hex");
  return `${prefix}${randomPart}`;
}

function getKeyPrefix(fullKey: string): string {
  return fullKey.substring(0, 16);
}

async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 12);
}

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
 * POST - Rotate all active API keys
 *
 * This is a destructive operation that invalidates ALL existing keys.
 * Requires confirmation parameter.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { confirm, reason } = body;

    // Require explicit confirmation
    if (confirm !== "ROTATE_ALL_TOKENS") {
      return NextResponse.json({
        error: "Confirmation required",
        message: "Send { confirm: 'ROTATE_ALL_TOKENS' } to proceed",
        warning: "This action will invalidate ALL your API keys immediately.",
      }, { status: 400 });
    }

    const db = getDb();

    // Get all active keys for the user
    const activeKeys = await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.userId, user.id),
        eq(apiKeys.isActive, true),
        isNull(apiKeys.revokedAt)
      ));

    if (activeKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active API keys to rotate",
        rotatedCount: 0,
      });
    }

    // Generate new keys for each existing key
    const rotatedKeys: Array<{
      id: string;
      name: string;
      oldPrefix: string;
      newPrefix: string;
      newKey: string;
    }> = [];

    for (const key of activeKeys) {
      const newFullKey = generateApiKey(key.environment);
      const newKeyPrefix = getKeyPrefix(newFullKey);
      const newKeyHash = await hashApiKey(newFullKey);

      // Update the key
      await db
        .update(apiKeys)
        .set({
          keyPrefix: newKeyPrefix,
          keyHash: newKeyHash,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, key.id));

      // Log rotation event for this key
      await db.insert(apiKeyAuditEvents).values({
        apiKeyId: key.id,
        eventType: "rotated_bulk",
        performedBy: user.id,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        changeDetails: {
          oldKeyPrefix: key.keyPrefix,
          newKeyPrefix,
          reason: reason || "Bulk rotation requested",
        },
      });

      rotatedKeys.push({
        id: key.id,
        name: key.name,
        oldPrefix: key.keyPrefix,
        newPrefix: newKeyPrefix,
        newKey: newFullKey, // Only returned once!
      });
    }

    // Log user audit event
    await db.insert(userAudit).values({
      userId: user.id,
      action: "all_api_keys_rotated",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        rotatedCount: rotatedKeys.length,
        reason: reason || "User requested",
        keyNames: rotatedKeys.map(k => k.name),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${rotatedKeys.length} API keys rotated successfully`,
      rotatedCount: rotatedKeys.length,
      keys: rotatedKeys.map(k => ({
        id: k.id,
        name: k.name,
        newKey: k.newKey,
        newPrefix: k.newPrefix,
      })),
      warning: "Save these keys now! They will not be shown again. Update all your integrations immediately.",
    });
  } catch (error) {
    console.error("[BULK_ROTATION_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to rotate API keys" },
      { status: 500 }
    );
  }
}

/**
 * GET - Preview which keys would be rotated
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Get all active keys
    const activeKeys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        lastUsedAt: apiKeys.lastUsedAt,
        usageCount: apiKeys.usageCount,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(and(
        eq(apiKeys.userId, user.id),
        eq(apiKeys.isActive, true),
        isNull(apiKeys.revokedAt)
      ));

    return NextResponse.json({
      keysToRotate: activeKeys,
      count: activeKeys.length,
      warning: "Rotating all keys will immediately invalidate them. Ensure you can update all integrations before proceeding.",
      confirmationRequired: "ROTATE_ALL_TOKENS",
    });
  } catch (error) {
    console.error("[BULK_ROTATION_PREVIEW_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get rotation preview" },
      { status: 500 }
    );
  }
}
