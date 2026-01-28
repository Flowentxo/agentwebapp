/**
 * Pipeline Webhooks Management API
 *
 * CRUD operations for pipeline webhooks
 * Part of Phase 4: Enterprise Features
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

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
 * Generate a secure webhook token
 */
function generateWebhookToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * GET - List webhooks for a pipeline
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const pipelineId = params.id;

    // Verify pipeline ownership
    const [pipeline] = await db.execute(sql`
      SELECT id FROM workflows WHERE id = ${pipelineId} AND user_id = ${user.id}
    `);

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Get webhooks
    const webhooks = await db.execute(sql`
      SELECT
        id,
        name,
        token,
        is_active,
        secret_header,
        allowed_ips,
        rate_limit,
        created_at,
        last_triggered_at,
        trigger_count
      FROM pipeline_webhooks
      WHERE pipeline_id = ${pipelineId}
      ORDER BY created_at DESC
    `);

    // Build webhook URLs
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const webhooksWithUrls = (webhooks as unknown[]).map((wh: unknown) => {
      const webhook = wh as {
        id: string;
        token: string;
        name: string;
        is_active: boolean;
        secret_header: string | null;
        allowed_ips: string[] | null;
        rate_limit: number | null;
        created_at: string;
        last_triggered_at: string | null;
        trigger_count: number;
      };
      return {
        ...webhook,
        url: `${baseUrl}/api/webhooks/pipelines/${webhook.token}`,
      };
    });

    return NextResponse.json({ webhooks: webhooksWithUrls });
  } catch (error) {
    console.error("[WEBHOOKS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get webhooks" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new webhook
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const pipelineId = params.id;
    const body = await req.json();

    const {
      name,
      secretHeader,
      secretValue,
      allowedIps,
      rateLimit,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Webhook name is required" },
        { status: 400 }
      );
    }

    // Verify pipeline ownership
    const [pipeline] = await db.execute(sql`
      SELECT id, name FROM workflows WHERE id = ${pipelineId} AND user_id = ${user.id}
    `) as { id: string; name: string }[];

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Generate webhook token
    const token = generateWebhookToken();
    const webhookId = uuidv4();

    // Create webhook
    await db.execute(sql`
      INSERT INTO pipeline_webhooks (
        id,
        pipeline_id,
        user_id,
        token,
        name,
        is_active,
        secret_header,
        secret_value,
        allowed_ips,
        rate_limit,
        trigger_count
      )
      VALUES (
        ${webhookId},
        ${pipelineId},
        ${user.id},
        ${token},
        ${name},
        true,
        ${secretHeader || null},
        ${secretValue || null},
        ${allowedIps ? JSON.stringify(allowedIps) : null}::jsonb,
        ${rateLimit || null},
        0
      )
    `);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhooks/pipelines/${token}`;

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhookId,
        name,
        token,
        url: webhookUrl,
        isActive: true,
        secretHeader,
        allowedIps,
        rateLimit,
      },
      message: `Webhook created for pipeline "${pipeline.name}"`,
    });
  } catch (error) {
    console.error("[WEBHOOKS_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update webhook
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const pipelineId = params.id;
    const body = await req.json();

    const {
      webhookId,
      name,
      isActive,
      secretHeader,
      secretValue,
      allowedIps,
      rateLimit,
      regenerateToken,
    } = body;

    if (!webhookId) {
      return NextResponse.json(
        { error: "webhookId is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const [webhook] = await db.execute(sql`
      SELECT pw.id, pw.token
      FROM pipeline_webhooks pw
      JOIN workflows w ON w.id = pw.pipeline_id
      WHERE pw.id = ${webhookId}
        AND pw.pipeline_id = ${pipelineId}
        AND w.user_id = ${user.id}
    `) as { id: string; token: string }[];

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Build update parts
    const updates: string[] = [];

    if (name !== undefined) {
      updates.push(`name = '${name}'`);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = ${isActive}`);
    }
    if (secretHeader !== undefined) {
      updates.push(`secret_header = ${secretHeader ? `'${secretHeader}'` : 'NULL'}`);
    }
    if (secretValue !== undefined) {
      updates.push(`secret_value = ${secretValue ? `'${secretValue}'` : 'NULL'}`);
    }
    if (allowedIps !== undefined) {
      updates.push(`allowed_ips = ${allowedIps ? `'${JSON.stringify(allowedIps)}'::jsonb` : 'NULL'}`);
    }
    if (rateLimit !== undefined) {
      updates.push(`rate_limit = ${rateLimit || 'NULL'}`);
    }

    // Regenerate token if requested
    let newToken = webhook.token;
    if (regenerateToken) {
      newToken = generateWebhookToken();
      updates.push(`token = '${newToken}'`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    await db.execute(sql.raw(`
      UPDATE pipeline_webhooks
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = '${webhookId}'
    `));

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhookId,
        token: newToken,
        url: `${baseUrl}/api/webhooks/pipelines/${newToken}`,
      },
    });
  } catch (error) {
    console.error("[WEBHOOKS_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete webhook
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const webhookId = searchParams.get("webhookId");

    if (!webhookId) {
      return NextResponse.json(
        { error: "webhookId is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const pipelineId = params.id;

    // Verify ownership and delete
    const result = await db.execute(sql`
      DELETE FROM pipeline_webhooks pw
      USING workflows w
      WHERE pw.id = ${webhookId}
        AND pw.pipeline_id = ${pipelineId}
        AND w.id = pw.pipeline_id
        AND w.user_id = ${user.id}
      RETURNING pw.id
    `);

    if (!result || (result as unknown[]).length === 0) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook deleted",
    });
  } catch (error) {
    console.error("[WEBHOOKS_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
