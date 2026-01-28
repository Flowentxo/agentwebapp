/**
 * Data Management API
 *
 * Export, import, and cleanup operations:
 * - Full data export (JSON/CSV)
 * - Knowledge base export
 * - Workflow definitions export
 * - Data import
 * - Cache clearing
 * - Orphaned data cleanup
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users, userAudit } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

interface ExportOptions {
  format: "json" | "csv";
  includeKnowledge: boolean;
  includeWorkflows: boolean;
  includeSettings: boolean;
  includeAudit: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
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
 * Export user data
 */
async function exportUserData(userId: string, options: ExportOptions) {
  const db = getDb();
  const exportData: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    userId,
    version: "1.0",
  };

  // Get user profile
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  exportData.profile = user;

  // Get knowledge base data
  if (options.includeKnowledge) {
    try {
      const knowledge = await db.execute(
        sql`SELECT id, title, content, source, created_at FROM brain_memories WHERE user_id = ${userId}`
      );
      exportData.knowledge = knowledge;
    } catch {
      exportData.knowledge = [];
    }
  }

  // Get workflows
  if (options.includeWorkflows) {
    try {
      const workflows = await db.execute(
        sql`SELECT id, name, description, nodes, edges, is_active, created_at FROM workflows WHERE user_id = ${userId}`
      );
      exportData.workflows = workflows;
    } catch {
      exportData.workflows = [];
    }
  }

  // Get settings
  if (options.includeSettings) {
    try {
      const settings = await db.execute(
        sql`SELECT key, value FROM user_settings WHERE user_id = ${userId}`
      );
      exportData.settings = settings;
    } catch {
      exportData.settings = [];
    }
  }

  // Get audit log
  if (options.includeAudit) {
    const audit = await db
      .select()
      .from(userAudit)
      .where(eq(userAudit.userId, userId))
      .limit(1000);
    exportData.auditLog = audit;
  }

  return exportData;
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: Record<string, unknown>): string {
  const lines: string[] = [];

  // Add metadata
  lines.push("# Export Metadata");
  lines.push(`exportedAt,${data.exportedAt}`);
  lines.push(`version,${data.version}`);
  lines.push("");

  // Add profile
  if (data.profile) {
    lines.push("# Profile");
    const profile = data.profile as Record<string, unknown>;
    Object.entries(profile).forEach(([key, value]) => {
      lines.push(`${key},${JSON.stringify(value)}`);
    });
    lines.push("");
  }

  // Add knowledge
  if (Array.isArray(data.knowledge) && data.knowledge.length > 0) {
    lines.push("# Knowledge Base");
    const headers = Object.keys(data.knowledge[0] as object).join(",");
    lines.push(headers);
    data.knowledge.forEach((item: unknown) => {
      const row = Object.values(item as object)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
      lines.push(row);
    });
    lines.push("");
  }

  // Add workflows
  if (Array.isArray(data.workflows) && data.workflows.length > 0) {
    lines.push("# Workflows");
    data.workflows.forEach((workflow: unknown) => {
      const w = workflow as Record<string, unknown>;
      lines.push(`id,${w.id}`);
      lines.push(`name,${w.name}`);
      lines.push(`description,${w.description}`);
      lines.push(`nodes,${JSON.stringify(w.nodes)}`);
      lines.push(`edges,${JSON.stringify(w.edges)}`);
      lines.push("");
    });
  }

  return lines.join("\n");
}

/**
 * GET - Get export preview or status
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Get data counts
    let knowledgeCount = 0;
    let workflowCount = 0;
    let auditCount = 0;

    try {
      const [kResult] = await db.execute(
        sql`SELECT COUNT(*) as count FROM brain_memories WHERE user_id = ${user.id}`
      );
      knowledgeCount = Number((kResult as Record<string, unknown>)?.count || 0);
    } catch {}

    try {
      const [wResult] = await db.execute(
        sql`SELECT COUNT(*) as count FROM workflows WHERE user_id = ${user.id}`
      );
      workflowCount = Number((wResult as Record<string, unknown>)?.count || 0);
    } catch {}

    try {
      const [aResult] = await db.execute(
        sql`SELECT COUNT(*) as count FROM user_audit WHERE user_id = ${user.id}`
      );
      auditCount = Number((aResult as Record<string, unknown>)?.count || 0);
    } catch {}

    return NextResponse.json({
      preview: {
        profile: 1,
        knowledge: knowledgeCount,
        workflows: workflowCount,
        auditLog: auditCount,
      },
      estimatedSize: Math.round(
        (knowledgeCount * 2 + workflowCount * 5 + auditCount * 0.5) / 1024
      ), // KB estimate
      formats: ["json", "csv"],
    });
  } catch (error) {
    console.error("[DATA_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get data preview" },
      { status: 500 }
    );
  }
}

/**
 * POST - Export data
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const options: ExportOptions = {
      format: body.format || "json",
      includeKnowledge: body.includeKnowledge !== false,
      includeWorkflows: body.includeWorkflows !== false,
      includeSettings: body.includeSettings !== false,
      includeAudit: body.includeAudit !== false,
      dateRange: body.dateRange,
    };

    const db = getDb();

    // Log export action
    await db.insert(userAudit).values({
      userId: user.id,
      action: "data_exported",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        format: options.format,
        includeKnowledge: options.includeKnowledge,
        includeWorkflows: options.includeWorkflows,
        includeAudit: options.includeAudit,
      },
    });

    const data = await exportUserData(user.id, options);

    if (options.format === "csv") {
      const csvContent = convertToCSV(data);
      const filename = `sintra-export-${user.email.split("@")[0]}-${
        new Date().toISOString().split("T")[0]
      }.csv`;

      return NextResponse.json({
        success: true,
        content: csvContent,
        filename,
        mimeType: "text/csv",
      });
    }

    // JSON format
    const filename = `sintra-export-${user.email.split("@")[0]}-${
      new Date().toISOString().split("T")[0]
    }.json`;

    return NextResponse.json({
      success: true,
      content: JSON.stringify(data, null, 2),
      filename,
      mimeType: "application/json",
    });
  } catch (error) {
    console.error("[DATA_EXPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Import data
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { data, mergeStrategy = "skip" } = body;

    if (!data) {
      return NextResponse.json(
        { error: "No data provided" },
        { status: 400 }
      );
    }

    const db = getDb();
    const results = {
      knowledge: { imported: 0, skipped: 0, errors: 0 },
      workflows: { imported: 0, skipped: 0, errors: 0 },
      settings: { imported: 0, skipped: 0, errors: 0 },
    };

    // Import knowledge
    if (data.knowledge && Array.isArray(data.knowledge)) {
      for (const item of data.knowledge) {
        try {
          // Check if exists
          const [existing] = await db.execute(
            sql`SELECT id FROM brain_memories WHERE id = ${item.id} AND user_id = ${user.id}`
          );

          if (existing && mergeStrategy === "skip") {
            results.knowledge.skipped++;
            continue;
          }

          if (existing && mergeStrategy === "replace") {
            await db.execute(
              sql`UPDATE brain_memories SET content = ${item.content}, title = ${item.title} WHERE id = ${item.id}`
            );
          } else {
            await db.execute(
              sql`INSERT INTO brain_memories (user_id, title, content, source) VALUES (${user.id}, ${item.title}, ${item.content}, 'import')`
            );
          }

          results.knowledge.imported++;
        } catch {
          results.knowledge.errors++;
        }
      }
    }

    // Import workflows
    if (data.workflows && Array.isArray(data.workflows)) {
      for (const workflow of data.workflows) {
        try {
          const [existing] = await db.execute(
            sql`SELECT id FROM workflows WHERE id = ${workflow.id} AND user_id = ${user.id}`
          );

          if (existing && mergeStrategy === "skip") {
            results.workflows.skipped++;
            continue;
          }

          // Create new workflow with new ID
          await db.execute(
            sql`INSERT INTO workflows (user_id, name, description, nodes, edges) VALUES (${user.id}, ${workflow.name}, ${workflow.description}, ${JSON.stringify(workflow.nodes)}, ${JSON.stringify(workflow.edges)})`
          );

          results.workflows.imported++;
        } catch {
          results.workflows.errors++;
        }
      }
    }

    // Log import action
    await db.insert(userAudit).values({
      userId: user.id,
      action: "data_imported",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        mergeStrategy,
        results,
      },
    });

    return NextResponse.json({
      success: true,
      results,
      message: "Import completed",
    });
  } catch (error) {
    console.error("[DATA_IMPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cleanup operations
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const operation = searchParams.get("operation");

    const db = getDb();
    const results: Record<string, number> = {};

    switch (operation) {
      case "clear-cache":
        // Clear Redis cache if available
        try {
          if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
            await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/flushdb`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
              },
            });
            results.cacheCleared = 1;
          }
        } catch {
          results.cacheCleared = 0;
        }
        break;

      case "clear-old-logs":
        // Delete audit logs older than 90 days
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        try {
          await db.execute(
            sql`DELETE FROM user_audit WHERE user_id = ${user.id} AND created_at < ${cutoff}`
          );
          results.logsDeleted = 1;
        } catch {
          results.logsDeleted = 0;
        }
        break;

      case "orphaned-data":
        // Clean up orphaned data
        try {
          // Delete messages without agents
          await db.execute(
            sql`DELETE FROM agent_messages WHERE agent_id NOT IN (SELECT id FROM agents)`
          );
          results.orphanedMessages = 1;

          // Delete orphaned workflow executions
          await db.execute(
            sql`DELETE FROM workflow_executions WHERE workflow_id NOT IN (SELECT id FROM workflows)`
          );
          results.orphanedExecutions = 1;
        } catch {
          results.orphanedData = 0;
        }
        break;

      default:
        return NextResponse.json(
          { error: "Unknown operation. Use: clear-cache, clear-old-logs, or orphaned-data" },
          { status: 400 }
        );
    }

    // Log cleanup action
    await db.insert(userAudit).values({
      userId: user.id,
      action: "data_cleanup",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      details: {
        operation,
        results,
      },
    });

    return NextResponse.json({
      success: true,
      operation,
      results,
    });
  } catch (error) {
    console.error("[DATA_CLEANUP_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to perform cleanup" },
      { status: 500 }
    );
  }
}
