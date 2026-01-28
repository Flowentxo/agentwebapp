/**
 * PHASE 66-70: Aura Workflow API Routes
 * Workflow management and execution endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuraCapabilities } from '@/lib/agents/aura';

// ============================================
// POST: Create workflow or execute actions
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
        if (!data.name || !data.steps) {
          return NextResponse.json(
            { success: false, error: 'name and steps are required' },
            { status: 400 }
          );
        }

        const workflowId = await AuraCapabilities.createSimpleWorkflow(
          workspaceId,
          data.name,
          data.steps
        );

        return NextResponse.json({
          success: true,
          data: { workflowId },
        });
      }

      case 'register': {
        if (!data.workflow) {
          return NextResponse.json(
            { success: false, error: 'workflow definition is required' },
            { status: 400 }
          );
        }

        AuraCapabilities.workflows.register(data.workflow);

        return NextResponse.json({
          success: true,
          data: { registered: true, workflowId: data.workflow.id },
        });
      }

      case 'execute': {
        if (!data.workflowId) {
          return NextResponse.json(
            { success: false, error: 'workflowId is required' },
            { status: 400 }
          );
        }

        const execution = await AuraCapabilities.workflows.execute(
          data.workflowId,
          data.inputs || {},
          {
            workspaceId,
            userId: data.userId || 'anonymous',
            async: data.async || false,
          }
        );

        return NextResponse.json({
          success: true,
          data: execution,
        });
      }

      case 'pause': {
        if (!data.executionId) {
          return NextResponse.json(
            { success: false, error: 'executionId is required' },
            { status: 400 }
          );
        }

        const paused = await AuraCapabilities.workflows.pauseExecution(data.executionId);

        return NextResponse.json({
          success: paused,
          data: { paused },
        });
      }

      case 'resume': {
        if (!data.executionId) {
          return NextResponse.json(
            { success: false, error: 'executionId is required' },
            { status: 400 }
          );
        }

        const resumed = await AuraCapabilities.workflows.resumeExecution(data.executionId);

        return NextResponse.json({
          success: resumed,
          data: { resumed },
        });
      }

      case 'cancel': {
        if (!data.executionId) {
          return NextResponse.json(
            { success: false, error: 'executionId is required' },
            { status: 400 }
          );
        }

        const cancelled = await AuraCapabilities.workflows.cancelExecution(data.executionId);

        return NextResponse.json({
          success: cancelled,
          data: { cancelled },
        });
      }

      case 'validate': {
        if (!data.workflow) {
          return NextResponse.json(
            { success: false, error: 'workflow definition is required' },
            { status: 400 }
          );
        }

        const validation = AuraCapabilities.workflows.validate(data.workflow);

        return NextResponse.json({
          success: validation.valid,
          data: validation,
        });
      }

      case 'delete': {
        if (!data.workflowId) {
          return NextResponse.json(
            { success: false, error: 'workflowId is required' },
            { status: 400 }
          );
        }

        const deleted = AuraCapabilities.workflows.delete(data.workflowId);

        return NextResponse.json({
          success: deleted,
          data: { deleted },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[AURA_WORKFLOWS_POST]', error);
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
// GET: Get workflows and executions
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const workspaceId = searchParams.get('workspaceId');

    switch (action) {
      case 'list': {
        const workflows = AuraCapabilities.workflows.list();

        return NextResponse.json({
          success: true,
          data: { workflows },
        });
      }

      case 'get': {
        const workflowId = searchParams.get('workflowId');
        if (!workflowId) {
          return NextResponse.json(
            { success: false, error: 'workflowId is required' },
            { status: 400 }
          );
        }

        const workflow = AuraCapabilities.workflows.get(workflowId);

        if (!workflow) {
          return NextResponse.json(
            { success: false, error: 'Workflow not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: workflow,
        });
      }

      case 'execution': {
        const executionId = searchParams.get('executionId');
        if (!executionId) {
          return NextResponse.json(
            { success: false, error: 'executionId is required' },
            { status: 400 }
          );
        }

        const execution = AuraCapabilities.workflows.getExecution(executionId);

        if (!execution) {
          return NextResponse.json(
            { success: false, error: 'Execution not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: execution,
        });
      }

      case 'dashboard': {
        if (!workspaceId) {
          return NextResponse.json(
            { success: false, error: 'workspaceId is required' },
            { status: 400 }
          );
        }

        const dashboard = await AuraCapabilities.getAutomationDashboard(workspaceId);

        return NextResponse.json({
          success: true,
          data: dashboard,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Use action=list, get, execution, or dashboard' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[AURA_WORKFLOWS_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow data' },
      { status: 500 }
    );
  }
}
