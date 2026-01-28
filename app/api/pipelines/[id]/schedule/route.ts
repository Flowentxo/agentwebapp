/**
 * Pipeline Scheduling API
 *
 * Manage cron-based pipeline schedules using BullMQ repeatable jobs
 * Part of Phase 4: Enterprise Features
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { pipelineQueue } from "@/server/lib/pipeline-queue";

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
 * Validate cron expression
 */
function isValidCron(expression: string): boolean {
  // Basic cron validation (5 or 6 fields)
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) return false;

  // Each field should match valid cron patterns
  const patterns = [
    /^(\*|[0-9]|[1-5][0-9])(-([0-9]|[1-5][0-9]))?(\/[0-9]+)?$/,     // minute
    /^(\*|[0-9]|1[0-9]|2[0-3])(-([0-9]|1[0-9]|2[0-3]))?(\/[0-9]+)?$/, // hour
    /^(\*|[1-9]|[12][0-9]|3[01])(-([1-9]|[12][0-9]|3[01]))?(\/[0-9]+)?$/, // day of month
    /^(\*|[1-9]|1[0-2])(-([1-9]|1[0-2]))?(\/[0-9]+)?$/,              // month
    /^(\*|[0-6])(-[0-6])?(\/[0-9]+)?$/,                              // day of week
  ];

  for (let i = 0; i < Math.min(parts.length, 5); i++) {
    // Allow wildcards and ranges
    const field = parts[i];
    if (field === '*' || field === '?') continue;

    // Allow comma-separated values
    const values = field.split(',');
    for (const val of values) {
      if (!patterns[i].test(val) && !val.includes('-') && !val.includes('/')) {
        // More lenient check for complex patterns
        if (!/^[\d\*\-\/,]+$/.test(val)) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Describe cron expression in human readable format
 */
function describeCron(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const descriptions: string[] = [];

  // Common patterns
  if (expression === '* * * * *') return 'Every minute';
  if (expression === '0 * * * *') return 'Every hour';
  if (expression === '0 0 * * *') return 'Every day at midnight';
  if (expression === '0 0 * * 0') return 'Every Sunday at midnight';
  if (expression === '0 0 1 * *') return 'First day of every month at midnight';

  // Build description
  if (minute !== '*') {
    descriptions.push(`at minute ${minute}`);
  }
  if (hour !== '*') {
    descriptions.push(`at ${hour}:00`);
  }
  if (dayOfMonth !== '*') {
    descriptions.push(`on day ${dayOfMonth}`);
  }
  if (month !== '*') {
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    descriptions.push(`in ${months[parseInt(month)] || month}`);
  }
  if (dayOfWeek !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    descriptions.push(`on ${days[parseInt(dayOfWeek)] || dayOfWeek}`);
  }

  return descriptions.length > 0 ? descriptions.join(' ') : expression;
}

/**
 * GET - List schedules for a pipeline
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
      SELECT id, name FROM workflows WHERE id = ${pipelineId} AND user_id = ${user.id}
    `);

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Get schedules from database
    const schedules = await db.execute(sql`
      SELECT
        id,
        name,
        cron_expression,
        timezone,
        is_active,
        next_run_at,
        last_run_at,
        run_count,
        inputs,
        created_at
      FROM pipeline_schedules
      WHERE pipeline_id = ${pipelineId}
      ORDER BY created_at DESC
    `);

    // Add human-readable descriptions
    const schedulesWithDescriptions = (schedules as unknown[]).map((s: unknown) => {
      const schedule = s as {
        id: string;
        name: string;
        cron_expression: string;
        timezone: string;
        is_active: boolean;
        next_run_at: string;
        last_run_at: string;
        run_count: number;
        inputs: unknown;
        created_at: string;
      };
      return {
        ...schedule,
        description: describeCron(schedule.cron_expression),
      };
    });

    return NextResponse.json({ schedules: schedulesWithDescriptions });
  } catch (error) {
    console.error("[SCHEDULE_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get schedules" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new schedule
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
      cronExpression,
      timezone = "UTC",
      inputs = {},
      isActive = true,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Schedule name is required" },
        { status: 400 }
      );
    }

    if (!cronExpression) {
      return NextResponse.json(
        { error: "Cron expression is required" },
        { status: 400 }
      );
    }

    if (!isValidCron(cronExpression)) {
      return NextResponse.json(
        { error: "Invalid cron expression" },
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

    const scheduleId = uuidv4();

    // Create schedule in database
    await db.execute(sql`
      INSERT INTO pipeline_schedules (
        id,
        pipeline_id,
        user_id,
        name,
        cron_expression,
        timezone,
        is_active,
        inputs,
        run_count
      )
      VALUES (
        ${scheduleId},
        ${pipelineId},
        ${user.id},
        ${name},
        ${cronExpression},
        ${timezone},
        ${isActive},
        ${JSON.stringify(inputs)}::jsonb,
        0
      )
    `);

    // Create BullMQ repeatable job if active
    if (isActive) {
      try {
        await pipelineQueue.add(
          'scheduled-pipeline',
          {
            pipelineId,
            executionId: '', // Will be generated per execution
            userId: user.id,
            triggerType: 'scheduled',
            inputs,
          },
          {
            repeat: {
              pattern: cronExpression,
              tz: timezone,
            },
            jobId: `schedule-${scheduleId}`,
          }
        );
      } catch (queueError) {
        console.error("[SCHEDULE_QUEUE_ERROR]", queueError);
        // Continue - schedule is saved to DB
      }
    }

    return NextResponse.json({
      success: true,
      schedule: {
        id: scheduleId,
        name,
        cronExpression,
        timezone,
        isActive,
        description: describeCron(cronExpression),
      },
      message: `Schedule created for pipeline "${pipeline.name}"`,
    });
  } catch (error) {
    console.error("[SCHEDULE_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update schedule
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
      scheduleId,
      name,
      cronExpression,
      timezone,
      inputs,
      isActive,
    } = body;

    if (!scheduleId) {
      return NextResponse.json(
        { error: "scheduleId is required" },
        { status: 400 }
      );
    }

    if (cronExpression && !isValidCron(cronExpression)) {
      return NextResponse.json(
        { error: "Invalid cron expression" },
        { status: 400 }
      );
    }

    // Verify ownership
    const [schedule] = await db.execute(sql`
      SELECT ps.id, ps.cron_expression, ps.timezone, ps.is_active
      FROM pipeline_schedules ps
      JOIN workflows w ON w.id = ps.pipeline_id
      WHERE ps.id = ${scheduleId}
        AND ps.pipeline_id = ${pipelineId}
        AND w.user_id = ${user.id}
    `) as {
      id: string;
      cron_expression: string;
      timezone: string;
      is_active: boolean;
    }[];

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Build update
    const updates: string[] = [];

    if (name !== undefined) updates.push(`name = '${name}'`);
    if (cronExpression !== undefined) updates.push(`cron_expression = '${cronExpression}'`);
    if (timezone !== undefined) updates.push(`timezone = '${timezone}'`);
    if (inputs !== undefined) updates.push(`inputs = '${JSON.stringify(inputs)}'::jsonb`);
    if (isActive !== undefined) updates.push(`is_active = ${isActive}`);

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    await db.execute(sql.raw(`
      UPDATE pipeline_schedules
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = '${scheduleId}'
    `));

    // Update BullMQ job
    try {
      // Remove old repeatable job
      await pipelineQueue.removeRepeatableByKey(`schedule-${scheduleId}`);

      // Add new one if active
      if (isActive !== false && (isActive || schedule.is_active)) {
        await pipelineQueue.add(
          'scheduled-pipeline',
          {
            pipelineId,
            executionId: '',
            userId: user.id,
            triggerType: 'scheduled',
            inputs: inputs || {},
          },
          {
            repeat: {
              pattern: cronExpression || schedule.cron_expression,
              tz: timezone || schedule.timezone,
            },
            jobId: `schedule-${scheduleId}`,
          }
        );
      }
    } catch (queueError) {
      console.error("[SCHEDULE_QUEUE_UPDATE_ERROR]", queueError);
    }

    return NextResponse.json({
      success: true,
      schedule: {
        id: scheduleId,
        description: describeCron(cronExpression || schedule.cron_expression),
      },
    });
  } catch (error) {
    console.error("[SCHEDULE_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete schedule
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
    const scheduleId = searchParams.get("scheduleId");

    if (!scheduleId) {
      return NextResponse.json(
        { error: "scheduleId is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const pipelineId = params.id;

    // Verify and delete
    const result = await db.execute(sql`
      DELETE FROM pipeline_schedules ps
      USING workflows w
      WHERE ps.id = ${scheduleId}
        AND ps.pipeline_id = ${pipelineId}
        AND w.id = ps.pipeline_id
        AND w.user_id = ${user.id}
      RETURNING ps.id
    `);

    if (!result || (result as unknown[]).length === 0) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Remove BullMQ job
    try {
      await pipelineQueue.removeRepeatableByKey(`schedule-${scheduleId}`);
    } catch (queueError) {
      console.error("[SCHEDULE_QUEUE_DELETE_ERROR]", queueError);
    }

    return NextResponse.json({
      success: true,
      message: "Schedule deleted",
    });
  } catch (error) {
    console.error("[SCHEDULE_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
