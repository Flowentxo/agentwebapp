/**
 * API Key Rotation Endpoint
 *
 * Securely rotate an API key while maintaining the same configuration
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { apiKeys, apiKeyAuditEvents, users, userAudit } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
 * POST - Rotate an API key
 * Generates a new key while keeping all settings intact
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const keyId = params.id;
    const db = getDb();

    // Verify ownership and get existing key
    const [existingKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, user.id)))
      .limit(1);

    if (!existingKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    if (existingKey.revokedAt) {
      return NextResponse.json(
        { error: "Cannot rotate a revoked key" },
        { status: 400 }
      );
    }

    // Generate new key
    const newFullKey = generateApiKey(existingKey.environment);
    const newKeyPrefix = getKeyPrefix(newFullKey);
    const newKeyHash = await hashApiKey(newFullKey);

    // Store old key prefix for audit
    const oldKeyPrefix = existingKey.keyPrefix;

    // Update key with new credentials
    const [updatedKey] = await db
      .update(apiKeys)
      .set({
        keyPrefix: newKeyPrefix,
        keyHash: newKeyHash,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, keyId))
      .returning();

    // Log rotation event
    await db.insert(apiKeyAuditEvents).values({
      apiKeyId: keyId,
      eventType: "rotated",
      performedBy: user.id,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      changeDetails: {
        oldKeyPrefix,
        newKeyPrefix,
      },
    });

    await db.insert(userAudit).values({
      userId: user.id,
      action: "api_key_rotated",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        keyId,
        keyName: existingKey.name,
      },
    });

    return NextResponse.json({
      success: true,
      key: {
        id: updatedKey.id,
        name: updatedKey.name,
        keyPrefix: updatedKey.keyPrefix,
        fullKey: newFullKey, // Only shown once!
        environment: updatedKey.environment,
        scopes: updatedKey.scopes,
        rateLimit: updatedKey.rateLimit,
        updatedAt: updatedKey.updatedAt,
      },
      message: "API key rotated successfully. Update your integrations with the new key.",
      warning: "The old key is now invalid. Save the new key - it won't be shown again.",
    });
  } catch (error) {
    console.error("[API_KEY_ROTATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to rotate API key" },
      { status: 500 }
    );
  }
}
