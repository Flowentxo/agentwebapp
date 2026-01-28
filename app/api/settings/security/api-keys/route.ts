/**
 * Enterprise API Key Management Endpoints
 *
 * Full CRUD operations for API keys with:
 * - Scoped permissions
 * - Rate limiting configuration
 * - IP restrictions
 * - Audit logging
 * - Key rotation
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { apiKeys, apiKeyAuditEvents, users, userAudit } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// API Key prefixes by environment
const KEY_PREFIXES = {
  production: "flwnt_live_",
  development: "sk_dev_",
  test: "flwnt_test_",
} as const;

/**
 * Generate a cryptographically secure API key
 */
function generateApiKey(environment: keyof typeof KEY_PREFIXES): string {
  const prefix = KEY_PREFIXES[environment];
  const randomPart = crypto.randomBytes(24).toString("hex");
  return `${prefix}${randomPart}`;
}

/**
 * Generate key prefix for storage (first 16 chars for lookup)
 */
function getKeyPrefix(fullKey: string): string {
  return fullKey.substring(0, 16);
}

/**
 * Hash API key for secure storage
 */
async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 12);
}

/**
 * Log audit event
 */
async function logKeyAudit(
  apiKeyId: string,
  eventType: string,
  performedBy: string,
  changeDetails: Record<string, unknown>,
  req: NextRequest
) {
  try {
    const db = getDb();
    await db.insert(apiKeyAuditEvents).values({
      apiKeyId,
      eventType,
      performedBy,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      changeDetails,
    });
  } catch (error) {
    console.error("[API_KEY_AUDIT_ERROR]", error);
  }
}

/**
 * Log user audit event
 */
async function logUserAudit(
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
    console.error("[USER_AUDIT_ERROR]", error);
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
 * GET - List all API keys for the authenticated user
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

    const db = getDb();
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        scopes: apiKeys.scopes,
        isActive: apiKeys.isActive,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        usageCount: apiKeys.usageCount,
        rateLimit: apiKeys.rateLimit,
        ipWhitelist: apiKeys.ipWhitelist,
        description: apiKeys.description,
        createdAt: apiKeys.createdAt,
        revokedAt: apiKeys.revokedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id))
      .orderBy(desc(apiKeys.createdAt));

    // Format response
    const formattedKeys = keys.map(key => ({
      ...key,
      status: key.revokedAt ? "revoked" : key.expiresAt && new Date(key.expiresAt) < new Date() ? "expired" : "active",
      keyPreview: `${key.keyPrefix}...`,
      lastUsed: key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : null,
      createdAgo: formatRelativeTime(key.createdAt),
    }));

    return NextResponse.json({
      keys: formattedKeys,
      count: keys.length,
    });
  } catch (error) {
    console.error("[API_KEYS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new API key
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

    const body = await req.json();
    const {
      name,
      scopes = [],
      environment = "production",
      expiresIn, // days: 30, 90, 365, or null for no expiration
      rateLimit = 1000,
      ipWhitelist = null,
      description = "",
    } = body;

    // Validation
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: "Name must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (scopes.length === 0) {
      return NextResponse.json(
        { error: "At least one scope is required" },
        { status: 400 }
      );
    }

    // Generate key
    const fullKey = generateApiKey(environment as keyof typeof KEY_PREFIXES);
    const keyPrefix = getKeyPrefix(fullKey);
    const keyHash = await hashApiKey(fullKey);

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (expiresIn && expiresIn !== "never") {
      const days = parseInt(expiresIn);
      if (!isNaN(days)) {
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    }

    // Create key in database
    const db = getDb();
    const [newKey] = await db
      .insert(apiKeys)
      .values({
        name: name.trim(),
        keyPrefix,
        keyHash,
        userId: user.id,
        createdBy: user.id,
        scopes,
        environment,
        isActive: true,
        expiresAt,
        rateLimit,
        ipWhitelist,
        description: description.trim(),
      })
      .returning();

    // Log audit
    await logKeyAudit(newKey.id, "created", user.id, {
      name: newKey.name,
      scopes,
      environment,
      expiresAt,
      rateLimit,
    }, req);

    await logUserAudit(user.id, "api_key_created", {
      keyId: newKey.id,
      keyName: newKey.name,
      scopeCount: scopes.length,
    }, req);

    return NextResponse.json({
      success: true,
      key: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        fullKey, // Only returned once at creation!
        environment: newKey.environment,
        scopes: newKey.scopes,
        expiresAt: newKey.expiresAt,
        rateLimit: newKey.rateLimit,
        createdAt: newKey.createdAt,
      },
      message: "API key created successfully. Save the full key now - it won't be shown again.",
    });
  } catch (error) {
    console.error("[API_KEY_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update an API key (name, scopes, rate limit, etc.)
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
    const {
      id,
      name,
      scopes,
      rateLimit,
      ipWhitelist,
      description,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Key ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify ownership
    const [existingKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)))
      .limit(1);

    if (!existingKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    if (existingKey.revokedAt) {
      return NextResponse.json(
        { error: "Cannot update a revoked key" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Partial<typeof apiKeys.$inferInsert> = {
      updatedAt: new Date(),
    };

    const changes: Record<string, unknown> = {};

    if (name !== undefined && name !== existingKey.name) {
      updateData.name = name.trim();
      changes.name = { from: existingKey.name, to: name.trim() };
    }

    if (scopes !== undefined) {
      updateData.scopes = scopes;
      changes.scopes = { from: existingKey.scopes, to: scopes };
    }

    if (rateLimit !== undefined && rateLimit !== existingKey.rateLimit) {
      updateData.rateLimit = rateLimit;
      changes.rateLimit = { from: existingKey.rateLimit, to: rateLimit };
    }

    if (ipWhitelist !== undefined) {
      updateData.ipWhitelist = ipWhitelist;
      changes.ipWhitelist = { from: existingKey.ipWhitelist, to: ipWhitelist };
    }

    if (description !== undefined && description !== existingKey.description) {
      updateData.description = description.trim();
      changes.description = { from: existingKey.description, to: description.trim() };
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({
        success: true,
        message: "No changes detected",
      });
    }

    // Update key
    const [updatedKey] = await db
      .update(apiKeys)
      .set(updateData)
      .where(eq(apiKeys.id, id))
      .returning();

    // Log audit
    await logKeyAudit(id, "updated", user.id, changes, req);

    return NextResponse.json({
      success: true,
      key: {
        id: updatedKey.id,
        name: updatedKey.name,
        scopes: updatedKey.scopes,
        rateLimit: updatedKey.rateLimit,
        ipWhitelist: updatedKey.ipWhitelist,
        description: updatedKey.description,
        updatedAt: updatedKey.updatedAt,
      },
      message: "API key updated successfully",
    });
  } catch (error) {
    console.error("[API_KEY_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Revoke or delete an API key
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const permanent = searchParams.get("permanent") === "true";
    const reason = searchParams.get("reason") || "User requested";

    if (!id) {
      return NextResponse.json(
        { error: "Key ID is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify ownership
    const [existingKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)))
      .limit(1);

    if (!existingKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    if (permanent) {
      // Permanently delete the key and all related data
      await db.delete(apiKeys).where(eq(apiKeys.id, id));

      await logUserAudit(user.id, "api_key_deleted", {
        keyId: id,
        keyName: existingKey.name,
        reason,
      }, req);

      return NextResponse.json({
        success: true,
        message: "API key permanently deleted",
      });
    } else {
      // Soft revoke - mark as revoked but keep for audit
      await db
        .update(apiKeys)
        .set({
          isActive: false,
          revokedAt: new Date(),
          revokedBy: user.id,
          revokedReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, id));

      await logKeyAudit(id, "revoked", user.id, { reason }, req);

      await logUserAudit(user.id, "api_key_revoked", {
        keyId: id,
        keyName: existingKey.name,
        reason,
      }, req);

      return NextResponse.json({
        success: true,
        message: "API key revoked successfully",
      });
    }
  } catch (error) {
    console.error("[API_KEY_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}

/**
 * Helper: Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return new Date(date).toLocaleDateString("de-DE");
  if (days > 0) return `vor ${days} Tag${days === 1 ? "" : "en"}`;
  if (hours > 0) return `vor ${hours} Stunde${hours === 1 ? "" : "n"}`;
  if (minutes > 0) return `vor ${minutes} Minute${minutes === 1 ? "" : "n"}`;
  return "Gerade eben";
}
