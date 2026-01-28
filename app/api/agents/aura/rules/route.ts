/**
 * PHASE 66-70: Aura Automation Rules API Routes
 * Event-driven automation rule management
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuraCapabilities } from '@/lib/agents/aura';

// ============================================
// POST: Create rules or process events
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
        if (!data.name || !data.trigger || !data.actions) {
          return NextResponse.json(
            { success: false, error: 'name, trigger, and actions are required' },
            { status: 400 }
          );
        }

        const rule = AuraCapabilities.rules.create(workspaceId, {
          name: data.name,
          description: data.description,
          trigger: data.trigger,
          conditions: data.conditions,
          actions: data.actions,
          priority: data.priority,
          cooldown: data.cooldown,
          maxExecutionsPerHour: data.maxExecutionsPerHour,
          createdBy: data.createdBy || 'api',
        });

        return NextResponse.json({
          success: true,
          data: rule,
        });
      }

      case 'create_simple': {
        if (!data.name || !data.eventType || !data.actions) {
          return NextResponse.json(
            { success: false, error: 'name, eventType, and actions are required' },
            { status: 400 }
          );
        }

        const rule = await AuraCapabilities.createSimpleRule(
          workspaceId,
          data.name,
          {
            eventType: data.eventType,
            filters: data.filters,
          },
          data.actions
        );

        return NextResponse.json({
          success: true,
          data: rule,
        });
      }

      case 'update': {
        if (!data.ruleId) {
          return NextResponse.json(
            { success: false, error: 'ruleId is required' },
            { status: 400 }
          );
        }

        const updated = AuraCapabilities.rules.update(data.ruleId, data.updates);

        if (!updated) {
          return NextResponse.json(
            { success: false, error: 'Rule not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: updated,
        });
      }

      case 'delete': {
        if (!data.ruleId) {
          return NextResponse.json(
            { success: false, error: 'ruleId is required' },
            { status: 400 }
          );
        }

        const deleted = AuraCapabilities.rules.delete(data.ruleId);

        return NextResponse.json({
          success: deleted,
          data: { deleted },
        });
      }

      case 'enable': {
        if (!data.ruleId) {
          return NextResponse.json(
            { success: false, error: 'ruleId is required' },
            { status: 400 }
          );
        }

        const enabled = AuraCapabilities.rules.enable(data.ruleId);

        return NextResponse.json({
          success: enabled,
          data: { enabled },
        });
      }

      case 'disable': {
        if (!data.ruleId) {
          return NextResponse.json(
            { success: false, error: 'ruleId is required' },
            { status: 400 }
          );
        }

        const disabled = AuraCapabilities.rules.disable(data.ruleId);

        return NextResponse.json({
          success: disabled,
          data: { disabled },
        });
      }

      case 'process_event': {
        if (!data.eventType || !data.eventData) {
          return NextResponse.json(
            { success: false, error: 'eventType and eventData are required' },
            { status: 400 }
          );
        }

        const results = await AuraCapabilities.processIncomingEvent(
          workspaceId,
          data.eventType,
          data.eventData
        );

        return NextResponse.json({
          success: true,
          data: {
            rulesTriggered: results.length,
            results,
          },
        });
      }

      case 'test': {
        if (!data.ruleId || !data.testEvent) {
          return NextResponse.json(
            { success: false, error: 'ruleId and testEvent are required' },
            { status: 400 }
          );
        }

        const rule = AuraCapabilities.rules.get(data.ruleId);
        if (!rule) {
          return NextResponse.json(
            { success: false, error: 'Rule not found' },
            { status: 404 }
          );
        }

        const testResult = AuraCapabilities.rules.testRule(rule, {
          type: data.testEvent.type,
          source: 'test',
          data: data.testEvent.data,
          timestamp: new Date(),
        });

        return NextResponse.json({
          success: true,
          data: testResult,
        });
      }

      case 'execute': {
        if (!data.ruleId || !data.event) {
          return NextResponse.json(
            { success: false, error: 'ruleId and event are required' },
            { status: 400 }
          );
        }

        const rule = AuraCapabilities.rules.get(data.ruleId);
        if (!rule) {
          return NextResponse.json(
            { success: false, error: 'Rule not found' },
            { status: 404 }
          );
        }

        const result = await AuraCapabilities.rules.executeRule(rule, {
          type: data.event.type,
          source: 'api',
          data: data.event.data,
          timestamp: new Date(),
        });

        return NextResponse.json({
          success: result.triggered,
          data: result,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[AURA_RULES_POST]', error);
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
// GET: Get rules and statistics
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
        const enabled = searchParams.get('enabled');
        const triggerType = searchParams.get('triggerType');

        const rules = AuraCapabilities.rules.list(workspaceId, {
          enabled: enabled ? enabled === 'true' : undefined,
          triggerType: triggerType as 'event' | undefined,
        });

        return NextResponse.json({
          success: true,
          data: { rules },
        });
      }

      case 'get': {
        const ruleId = searchParams.get('ruleId');
        if (!ruleId) {
          return NextResponse.json(
            { success: false, error: 'ruleId is required' },
            { status: 400 }
          );
        }

        const rule = AuraCapabilities.rules.get(ruleId);

        if (!rule) {
          return NextResponse.json(
            { success: false, error: 'Rule not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: rule,
        });
      }

      case 'stats': {
        const ruleId = searchParams.get('ruleId');
        const days = parseInt(searchParams.get('days') || '30');

        if (ruleId) {
          const stats = AuraCapabilities.rules.getStats(ruleId, days);
          if (!stats) {
            return NextResponse.json(
              { success: false, error: 'Rule not found' },
              { status: 404 }
            );
          }
          return NextResponse.json({
            success: true,
            data: stats,
          });
        }

        const workspaceStats = AuraCapabilities.rules.getWorkspaceStats(workspaceId);
        return NextResponse.json({
          success: true,
          data: workspaceStats,
        });
      }

      default: {
        // Default: list rules
        const rules = AuraCapabilities.rules.list(workspaceId);

        return NextResponse.json({
          success: true,
          data: { rules },
        });
      }
    }
  } catch (error) {
    console.error('[AURA_RULES_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}
