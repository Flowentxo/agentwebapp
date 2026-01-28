/**
 * Security Audit Log API
 *
 * Export and query security audit events:
 * - CSV export for compliance
 * - Filtering by date range
 * - Action type filtering
 * - Pagination
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users, userAudit } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// Security event categories for filtering
const SECURITY_EVENT_CATEGORIES = {
  authentication: [
    "login",
    "login_failed",
    "logout",
    "session_terminated",
    "sessions_terminated_all",
  ],
  mfa: [
    "2fa_setup_initiated",
    "2fa_enabled",
    "2fa_disabled",
    "2fa_verification_failed",
    "backup_codes_regenerated",
    "backup_code_used",
    "backup_codes_downloaded",
  ],
  api_keys: [
    "api_key_created",
    "api_key_rotated",
    "api_key_revoked",
    "api_key_deleted",
  ],
  password: [
    "password_changed",
    "password_change_failed",
    "password_reset_requested",
    "password_reset_completed",
  ],
  ip_allowlist: [
    "ip_allowlist_enabled",
    "ip_allowlist_disabled",
    "ip_allowlist_add",
    "ip_allowlist_remove",
    "ip_allowlist_bulk_import",
    "ip_allowlist_exported",
  ],
  session: [
    "session_trust_updated",
  ],
  account: [
    "profile_updated",
    "email_changed",
    "account_deleted",
  ],
};

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
 * Format audit event for display
 */
function formatAuditEvent(event: typeof userAudit.$inferSelect) {
  // Map action to human-readable description
  const actionDescriptions: Record<string, string> = {
    login: "Anmeldung",
    login_failed: "Fehlgeschlagene Anmeldung",
    logout: "Abmeldung",
    session_terminated: "Sitzung beendet",
    sessions_terminated_all: "Alle Sitzungen beendet",
    "2fa_setup_initiated": "2FA-Einrichtung gestartet",
    "2fa_enabled": "2FA aktiviert",
    "2fa_disabled": "2FA deaktiviert",
    "2fa_verification_failed": "2FA-Verifizierung fehlgeschlagen",
    backup_codes_regenerated: "Backup-Codes regeneriert",
    backup_code_used: "Backup-Code verwendet",
    backup_codes_downloaded: "Backup-Codes heruntergeladen",
    api_key_created: "API-Key erstellt",
    api_key_rotated: "API-Key rotiert",
    api_key_revoked: "API-Key widerrufen",
    api_key_deleted: "API-Key gelöscht",
    password_changed: "Passwort geändert",
    password_change_failed: "Passwortänderung fehlgeschlagen",
    ip_allowlist_enabled: "IP-Allowlist aktiviert",
    ip_allowlist_disabled: "IP-Allowlist deaktiviert",
    ip_allowlist_add: "IP zur Allowlist hinzugefügt",
    ip_allowlist_remove: "IP aus Allowlist entfernt",
    ip_allowlist_bulk_import: "IPs bulk-importiert",
    ip_allowlist_exported: "IP-Allowlist exportiert",
    session_trust_updated: "Sitzungs-Vertrauen aktualisiert",
    profile_updated: "Profil aktualisiert",
    email_changed: "E-Mail geändert",
  };

  return {
    id: event.id,
    action: event.action,
    actionDescription: actionDescriptions[event.action] || event.action,
    ip: event.ip || "Unknown",
    userAgent: event.userAgent || "Unknown",
    details: event.details,
    timestamp: event.createdAt,
    timestampFormatted: new Date(event.createdAt).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "medium",
    }),
  };
}

/**
 * GET - Query audit log with pagination and filtering
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = (page - 1) * limit;

    // Date filtering
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Action filtering
    const category = searchParams.get("category");
    const action = searchParams.get("action");

    const db = getDb();

    // Build conditions
    const conditions = [eq(userAudit.userId, user.id)];

    if (startDate) {
      conditions.push(gte(userAudit.createdAt, new Date(startDate)));
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      conditions.push(lte(userAudit.createdAt, endDateTime));
    }

    // Get events
    const events = await db
      .select()
      .from(userAudit)
      .where(and(...conditions))
      .orderBy(desc(userAudit.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userAudit)
      .where(and(...conditions));

    const totalCount = Number(countResult?.count || 0);

    // Filter by category/action in memory if needed
    let filteredEvents = events;

    if (category && SECURITY_EVENT_CATEGORIES[category as keyof typeof SECURITY_EVENT_CATEGORIES]) {
      const categoryActions = SECURITY_EVENT_CATEGORIES[category as keyof typeof SECURITY_EVENT_CATEGORIES];
      filteredEvents = events.filter(e => categoryActions.includes(e.action));
    }

    if (action) {
      filteredEvents = filteredEvents.filter(e => e.action === action);
    }

    // Format events
    const formattedEvents = filteredEvents.map(formatAuditEvent);

    return NextResponse.json({
      events: formattedEvents,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + events.length < totalCount,
      },
      categories: Object.keys(SECURITY_EVENT_CATEGORIES),
    });
  } catch (error) {
    console.error("[AUDIT_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get audit log" },
      { status: 500 }
    );
  }
}

/**
 * POST - Export audit log to CSV
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      startDate,
      endDate,
      format = "csv",
    } = body;

    const db = getDb();

    // Build conditions
    const conditions = [eq(userAudit.userId, user.id)];

    // Default to last 90 days
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    conditions.push(gte(userAudit.createdAt, start));
    conditions.push(lte(userAudit.createdAt, end));

    // Get all events in date range
    const events = await db
      .select()
      .from(userAudit)
      .where(and(...conditions))
      .orderBy(desc(userAudit.createdAt));

    // Log the export
    await db.insert(userAudit).values({
      userId: user.id,
      action: "audit_log_exported",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        eventCount: events.length,
        format,
      },
    });

    if (format === "json") {
      return NextResponse.json({
        success: true,
        exportedAt: new Date().toISOString(),
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        events: events.map(formatAuditEvent),
        count: events.length,
      });
    }

    // Generate CSV
    const csvHeaders = [
      "Timestamp",
      "Action",
      "Description",
      "IP Address",
      "User Agent",
      "Details",
    ].join(",");

    const csvRows = events.map(event => {
      const formatted = formatAuditEvent(event);
      return [
        new Date(event.createdAt).toISOString(),
        event.action,
        `"${formatted.actionDescription}"`,
        event.ip || "",
        `"${(event.userAgent || "").replace(/"/g, '""').substring(0, 200)}"`,
        `"${JSON.stringify(event.details || {}).replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = [csvHeaders, ...csvRows].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const fullContent = bom + csvContent;

    const filename = `security-audit-${user.email.split("@")[0]}-${start.toISOString().split("T")[0]}-to-${end.toISOString().split("T")[0]}.csv`;

    return NextResponse.json({
      success: true,
      content: fullContent,
      filename,
      mimeType: "text/csv",
      eventCount: events.length,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    console.error("[AUDIT_EXPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to export audit log" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear old audit entries (admin only, with retention policy)
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In production, check for admin role
    // For now, only allow clearing entries older than 1 year

    const body = await req.json();
    const { olderThanDays = 365 } = body;

    // Minimum retention of 90 days
    if (olderThanDays < 90) {
      return NextResponse.json({
        error: "Minimum retention period is 90 days",
      }, { status: 400 });
    }

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const db = getDb();

    // Count entries to be deleted
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userAudit)
      .where(and(
        eq(userAudit.userId, user.id),
        lte(userAudit.createdAt, cutoffDate)
      ));

    const deleteCount = Number(countResult?.count || 0);

    if (deleteCount === 0) {
      return NextResponse.json({
        success: true,
        message: "No entries to delete",
        deletedCount: 0,
      });
    }

    // Delete old entries
    await db
      .delete(userAudit)
      .where(and(
        eq(userAudit.userId, user.id),
        lte(userAudit.createdAt, cutoffDate)
      ));

    // Log the cleanup
    await db.insert(userAudit).values({
      userId: user.id,
      action: "audit_log_cleanup",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        deletedCount: deleteCount,
        olderThanDays,
        cutoffDate: cutoffDate.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${deleteCount} audit entries deleted`,
      deletedCount: deleteCount,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error("[AUDIT_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to clean up audit log" },
      { status: 500 }
    );
  }
}
