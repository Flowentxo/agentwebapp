/**
 * Enterprise IP Allowlist API
 *
 * Manage IP restrictions for API access with:
 * - CIDR notation support
 * - IPv4 and IPv6 support
 * - Bulk import/export
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users, userAudit } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface IPAllowlistEntry {
  ip: string;
  label: string;
  addedAt: string;
  addedBy: string;
}

interface UserSecuritySettings {
  ipAllowlistEnabled: boolean;
  ipAllowlist: IPAllowlistEntry[];
}

/**
 * Validate IPv4 address or CIDR
 */
function isValidIPv4(ip: string): boolean {
  // Remove CIDR suffix if present
  const [address, cidr] = ip.split("/");

  // Validate CIDR if present
  if (cidr !== undefined) {
    const cidrNum = parseInt(cidr, 10);
    if (isNaN(cidrNum) || cidrNum < 0 || cidrNum > 32) return false;
  }

  // Validate IPv4 octets
  const octets = address.split(".");
  if (octets.length !== 4) return false;

  return octets.every(octet => {
    const num = parseInt(octet, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && String(num) === octet;
  });
}

/**
 * Validate IPv6 address or CIDR (simplified)
 */
function isValidIPv6(ip: string): boolean {
  const [address, cidr] = ip.split("/");

  // Validate CIDR if present
  if (cidr !== undefined) {
    const cidrNum = parseInt(cidr, 10);
    if (isNaN(cidrNum) || cidrNum < 0 || cidrNum > 128) return false;
  }

  // Basic IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}$|^::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])$|^([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])$/;

  return ipv6Regex.test(address);
}

/**
 * Validate IP address (IPv4 or IPv6) with optional CIDR
 */
function isValidIP(ip: string): boolean {
  const trimmed = ip.trim();
  return isValidIPv4(trimmed) || isValidIPv6(trimmed);
}

/**
 * Normalize IP address for storage
 */
function normalizeIP(ip: string): string {
  return ip.trim().toLowerCase();
}

/**
 * Get authenticated user
 */
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
 * Get user's security settings (stored in privacySettings JSONB)
 */
function getSecuritySettings(user: typeof users.$inferSelect): UserSecuritySettings {
  // In production, this would be in a separate table or dedicated column
  const settings = user.privacySettings as unknown as {
    ipAllowlistEnabled?: boolean;
    ipAllowlist?: IPAllowlistEntry[];
  } | null;

  return {
    ipAllowlistEnabled: settings?.ipAllowlistEnabled ?? false,
    ipAllowlist: settings?.ipAllowlist ?? [],
  };
}

/**
 * Log audit event
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
 * GET - Get IP allowlist configuration
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = getSecuritySettings(user);

    return NextResponse.json({
      enabled: settings.ipAllowlistEnabled,
      entries: settings.ipAllowlist,
      count: settings.ipAllowlist.length,
    });
  } catch (error) {
    console.error("[IP_ALLOWLIST_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get IP allowlist" },
      { status: 500 }
    );
  }
}

/**
 * POST - Add IP to allowlist
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ip, label } = body;

    if (!ip) {
      return NextResponse.json({ error: "IP address required" }, { status: 400 });
    }

    const normalizedIP = normalizeIP(ip);

    if (!isValidIP(normalizedIP)) {
      return NextResponse.json({
        error: "Invalid IP format. Use IPv4, IPv6, or CIDR notation.",
      }, { status: 400 });
    }

    const settings = getSecuritySettings(user);

    // Check for duplicates
    if (settings.ipAllowlist.some(e => normalizeIP(e.ip) === normalizedIP)) {
      return NextResponse.json({
        error: "IP already in allowlist",
      }, { status: 400 });
    }

    // Add new entry
    const newEntry: IPAllowlistEntry = {
      ip: normalizedIP,
      label: label?.trim() || "Unlabeled",
      addedAt: new Date().toISOString(),
      addedBy: user.id,
    };

    const updatedList = [...settings.ipAllowlist, newEntry];

    // Update user settings
    const db = getDb();
    await db
      .update(users)
      .set({
        privacySettings: {
          ...user.privacySettings as object,
          ipAllowlist: updatedList,
        },
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await logAudit(user.id, "ip_allowlist_add", {
      ip: normalizedIP,
      label: newEntry.label,
    }, req);

    return NextResponse.json({
      success: true,
      entry: newEntry,
      message: "IP added to allowlist",
    });
  } catch (error) {
    console.error("[IP_ALLOWLIST_ADD_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to add IP" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update allowlist settings or import multiple IPs
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { enabled, import: importData } = body;

    const settings = getSecuritySettings(user);
    const db = getDb();

    // Handle bulk import
    if (importData && Array.isArray(importData)) {
      const validEntries: IPAllowlistEntry[] = [];
      const invalidEntries: string[] = [];

      for (const line of importData) {
        if (typeof line === "string") {
          const [ip, label] = line.split(",").map(s => s.trim());

          if (ip && isValidIP(ip)) {
            const normalizedIP = normalizeIP(ip);

            // Skip duplicates
            if (!settings.ipAllowlist.some(e => normalizeIP(e.ip) === normalizedIP) &&
                !validEntries.some(e => e.ip === normalizedIP)) {
              validEntries.push({
                ip: normalizedIP,
                label: label || "Imported",
                addedAt: new Date().toISOString(),
                addedBy: user.id,
              });
            }
          } else {
            invalidEntries.push(ip || line);
          }
        }
      }

      const updatedList = [...settings.ipAllowlist, ...validEntries];

      await db
        .update(users)
        .set({
          privacySettings: {
            ...user.privacySettings as object,
            ipAllowlist: updatedList,
          },
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await logAudit(user.id, "ip_allowlist_bulk_import", {
        importedCount: validEntries.length,
        invalidCount: invalidEntries.length,
      }, req);

      return NextResponse.json({
        success: true,
        imported: validEntries.length,
        invalid: invalidEntries,
        total: updatedList.length,
        message: `${validEntries.length} IPs imported`,
      });
    }

    // Handle enable/disable toggle
    if (typeof enabled === "boolean") {
      // Can only enable if there are IPs in the list
      if (enabled && settings.ipAllowlist.length === 0) {
        return NextResponse.json({
          error: "Add at least one IP before enabling allowlist",
        }, { status: 400 });
      }

      await db
        .update(users)
        .set({
          privacySettings: {
            ...user.privacySettings as object,
            ipAllowlistEnabled: enabled,
          },
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await logAudit(user.id, enabled ? "ip_allowlist_enabled" : "ip_allowlist_disabled", {}, req);

      return NextResponse.json({
        success: true,
        enabled,
        message: enabled ? "IP allowlist enabled" : "IP allowlist disabled",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("[IP_ALLOWLIST_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update IP allowlist" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove IP from allowlist
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ip = searchParams.get("ip");
    const exportList = searchParams.get("export");

    // Handle export request
    if (exportList === "true") {
      const settings = getSecuritySettings(user);

      const csvContent = settings.ipAllowlist
        .map(e => `${e.ip},${e.label}`)
        .join("\n");

      await logAudit(user.id, "ip_allowlist_exported", {
        count: settings.ipAllowlist.length,
      }, req);

      return NextResponse.json({
        success: true,
        content: csvContent,
        filename: `ip-allowlist-${new Date().toISOString().split("T")[0]}.csv`,
        count: settings.ipAllowlist.length,
      });
    }

    // Handle IP deletion
    if (!ip) {
      return NextResponse.json({ error: "IP address required" }, { status: 400 });
    }

    const settings = getSecuritySettings(user);
    const normalizedIP = normalizeIP(ip);

    const entryIndex = settings.ipAllowlist.findIndex(
      e => normalizeIP(e.ip) === normalizedIP
    );

    if (entryIndex === -1) {
      return NextResponse.json({ error: "IP not found in allowlist" }, { status: 404 });
    }

    const removedEntry = settings.ipAllowlist[entryIndex];
    const updatedList = settings.ipAllowlist.filter((_, i) => i !== entryIndex);

    // If this was the last IP and allowlist is enabled, disable it
    let shouldDisable = false;
    if (updatedList.length === 0 && settings.ipAllowlistEnabled) {
      shouldDisable = true;
    }

    const db = getDb();
    await db
      .update(users)
      .set({
        privacySettings: {
          ...user.privacySettings as object,
          ipAllowlist: updatedList,
          ipAllowlistEnabled: shouldDisable ? false : settings.ipAllowlistEnabled,
        },
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await logAudit(user.id, "ip_allowlist_remove", {
      ip: normalizedIP,
      label: removedEntry.label,
      wasLastEntry: updatedList.length === 0,
    }, req);

    return NextResponse.json({
      success: true,
      removed: normalizedIP,
      remaining: updatedList.length,
      allowlistDisabled: shouldDisable,
      message: shouldDisable
        ? "IP removed. Allowlist disabled (no remaining IPs)."
        : "IP removed from allowlist",
    });
  } catch (error) {
    console.error("[IP_ALLOWLIST_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to remove IP" },
      { status: 500 }
    );
  }
}
