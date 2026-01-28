/**
 * PHASE 66-70: Aura Task Scheduler API Routes
 * Scheduled task management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuraCapabilities } from '@/lib/agents/aura';

// ============================================
// POST: Create or manage tasks
// ============================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, workspaceId, ...data } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'create': {
        if (!data.name || !data.type || !data.schedule) {
          return NextResponse.json(
            { success: false, error: 'name, type, and schedule are required' },
            { status: 400 }
          );
        }

        const task = AuraCapabilities.tasks.create(workspaceId, {
          name: data.name,
          description: data.description,
          type: data.type,
          schedule: data.schedule,
          payload: data.payload,
          retryPolicy: data.retryPolicy,
          createdBy: data.createdBy || 'api',
        });

        return NextResponse.json({
          success: true,
          data: task,
        });
      }

      case 'create_recurring': {
        if (!data.name || !data.cron || !data.taskType) {
          return NextResponse.json(
            { success: false, error: 'name, cron, and taskType are required' },
            { status: 400 }
          );
        }

        const task = await AuraCapabilities.scheduleRecurringTask(
          workspaceId,
          data.name,
          data.cron,
          data.taskType,
          data.payload || {}
        );

        return NextResponse.json({
          success: true,
          data: task,
        });
      }

      case 'update': {
        if (!data.taskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          );
        }

        const updated = AuraCapabilities.tasks.update(data.taskId, data.updates);

        if (!updated) {
          return NextResponse.json(
            { success: false, error: 'Task not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: updated,
        });
      }

      case 'delete': {
        if (!data.taskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          );
        }

        const deleted = AuraCapabilities.tasks.delete(data.taskId);

        return NextResponse.json({
          success: deleted,
          data: { deleted },
        });
      }

      case 'pause': {
        if (!data.taskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          );
        }

        const paused = AuraCapabilities.tasks.pause(data.taskId);

        return NextResponse.json({
          success: paused,
          data: { paused },
        });
      }

      case 'resume': {
        if (!data.taskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          );
        }

        const resumed = AuraCapabilities.tasks.resume(data.taskId);

        return NextResponse.json({
          success: resumed,
          data: { resumed },
        });
      }

      case 'run_now': {
        if (!data.taskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          );
        }

        const execution = await AuraCapabilities.tasks.runNow(data.taskId);

        return NextResponse.json({
          success: execution.status === 'completed',
          data: execution,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[AURA_TASKS_POST]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: Get tasks and statistics
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const action = searchParams.get('action');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'list': {
        const type = searchParams.get('type');
        const status = searchParams.get('status');

        const tasks = AuraCapabilities.tasks.list(workspaceId, {
          type: type as 'workflow' | undefined,
          status: status as 'active' | 'paused' | undefined,
        });

        return NextResponse.json({
          success: true,
          data: { tasks },
        });
      }

      case 'get': {
        const taskId = searchParams.get('taskId');
        if (!taskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          );
        }

        const task = AuraCapabilities.tasks.get(taskId);

        if (!task) {
          return NextResponse.json(
            { success: false, error: 'Task not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: task,
        });
      }

      case 'executions': {
        const taskId = searchParams.get('taskId');
        if (!taskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          );
        }

        const limit = parseInt(searchParams.get('limit') || '20');
        const executions = AuraCapabilities.tasks.getExecutions(taskId, limit);

        return NextResponse.json({
          success: true,
          data: { executions },
        });
      }

      case 'upcoming': {
        const hours = parseInt(searchParams.get('hours') || '24');
        const upcoming = AuraCapabilities.tasks.getUpcoming(workspaceId, hours);

        return NextResponse.json({
          success: true,
          data: { upcoming },
        });
      }

      case 'stats': {
        const stats = AuraCapabilities.tasks.getStats(workspaceId);

        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      case 'cron_parse': {
        const expression = searchParams.get('expression');
        if (!expression) {
          return NextResponse.json(
            { success: false, error: 'expression is required' },
            { status: 400 }
          );
        }

        const parsed = AuraCapabilities.cron.parse(expression);

        return NextResponse.json({
          success: parsed.valid,
          data: parsed,
        });
      }

      case 'cron_next': {
        const expression = searchParams.get('expression');
        if (!expression) {
          return NextResponse.json(
            { success: false, error: 'expression is required' },
            { status: 400 }
          );
        }

        const count = parseInt(searchParams.get('count') || '5');
        const nextRuns = AuraCapabilities.cron.getNextRuns(expression, count);
        const description = AuraCapabilities.cron.describe(expression);

        return NextResponse.json({
          success: true,
          data: {
            expression,
            description,
            nextRuns,
          },
        });
      }

      default: {
        // Default: list tasks
        const tasks = AuraCapabilities.tasks.list(workspaceId);

        return NextResponse.json({
          success: true,
          data: { tasks },
        });
      }
    }
  } catch (error) {
    console.error('[AURA_TASKS_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
