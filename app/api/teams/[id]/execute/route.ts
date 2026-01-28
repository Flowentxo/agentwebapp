import { NextRequest, NextResponse } from 'next/server';
import { OrchestratorFactory, TeamConfig } from '@/lib/teams/orchestrator';
import { TraceLogger } from '@/lib/tracing/trace-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/teams/[id]/execute
 * Execute a team with a task
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const { userInput } = await req.json();

    if (!userInput?.trim()) {
      return NextResponse.json(
        { success: false, error: 'User input is required' },
        { status: 400 }
      );
    }

    // Get team config (in production, fetch from DB)
    const team = getTeamById(teamId);

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    // Create trace for this execution
    const traceId = TraceLogger.generateTraceId();
    const sessionId = req.headers.get('x-session-id') || `session_${Date.now()}`;
    const userId = req.headers.get('x-user-id') || 'demo-user';

    const trace = new TraceLogger(traceId, team.teamId, userId, sessionId);

    trace.logSystemEvent(`Team ${team.name} starting execution`, {
      teamId: team.teamId,
      userInput,
      memberCount: team.members.length,
      orchestratorType: team.orchestratorType,
    });

    // Create orchestrator
    const orchestrator = OrchestratorFactory.create(team, trace);

    // Execute team
    const startTime = Date.now();
    const result = await orchestrator.execute(userInput);
    const totalLatencyMs = Date.now() - startTime;

    // Log completion
    if (result.success) {
      trace.logSystemEvent(`Team ${team.name} completed successfully`, {
        teamId: team.teamId,
        totalLatencyMs,
        totalTokens: result.totalTokens,
        stepsCompleted: result.steps.length,
      });
    } else {
      trace.logError(new Error(result.error || 'Team execution failed'), {
        teamId: team.teamId,
        totalLatencyMs,
      });
    }

    trace.end();

    return NextResponse.json({
      success: result.success,
      data: {
        finalOutput: result.finalOutput,
        steps: result.steps,
        totalLatencyMs: result.totalLatencyMs,
        totalTokens: result.totalTokens,
        traceId,
      },
      error: result.error,
    });
  } catch (error) {
    console.error('[TEAM_EXECUTE]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Get team by ID (demo data)
 */
function getTeamById(teamId: string): TeamConfig | null {
  const teams: Record<string, TeamConfig> = {
    team_research: {
      teamId: 'team_research',
      name: 'Research & Analysis Team',
      members: [
        { agentId: 'dexter', role: 'Data Researcher & Analyst', order: 0 },
        { agentId: 'aura', role: 'Strategic Insights', order: 1 },
      ],
      orchestratorType: 'sequential',
      settings: {
        maxRounds: 5,
        timeout: 30000,
        fallbackBehavior: 'partial',
      },
    },
    team_customer_service: {
      teamId: 'team_customer_service',
      name: 'Customer Service Team',
      members: [
        { agentId: 'cassie', role: 'Support Agent', order: 0 },
        { agentId: 'emmie', role: 'Follow-up Specialist', order: 1 },
      ],
      orchestratorType: 'sequential',
    },
    team_content_creation: {
      teamId: 'team_content_creation',
      name: 'Content Creation Team',
      members: [
        { agentId: 'dexter', role: 'Data & Research', order: 0 },
        { agentId: 'emmie', role: 'Content Writer', order: 1 },
        { agentId: 'aura', role: 'Brand Voice', order: 2 },
      ],
      orchestratorType: 'sequential',
    },
  };

  return teams[teamId] || null;
}
