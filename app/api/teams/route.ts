import { NextRequest, NextResponse } from 'next/server';
import { OrchestratorFactory, TeamConfig } from '@/lib/teams/orchestrator';
import { TraceLogger } from '@/lib/tracing/trace-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/teams
 * List all agent teams
 */
export async function GET(req: NextRequest) {
  try {
    // In-memory teams for demo (in production, fetch from DB)
    const teams = getDefaultTeams();

    return NextResponse.json({
      success: true,
      data: teams,
      count: teams.length,
    });
  } catch (error) {
    console.error('[TEAMS_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams
 * Create a new team
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { name, description, icon, color, members, orchestratorType, settings } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Team name is required' },
        { status: 400 }
      );
    }

    if (!members || members.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Team must have at least 2 members' },
        { status: 400 }
      );
    }

    // Create team
    const team: TeamConfig = {
      teamId: `team_${Date.now()}`,
      name,
      members: members.map((m: any, index: number) => ({
        agentId: m.agentId,
        role: m.role,
        order: index,
      })),
      orchestratorType: orchestratorType || 'sequential',
      settings,
    };

    return NextResponse.json({
      success: true,
      data: team,
      message: 'Team created successfully',
    });
  } catch (error) {
    console.error('[TEAMS_POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

/**
 * GET Default Teams
 * Pre-configured teams for demo
 */
function getDefaultTeams(): TeamConfig[] {
  return [
    {
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
    {
      teamId: 'team_customer_service',
      name: 'Customer Service Team',
      members: [
        { agentId: 'cassie', role: 'Support Agent', order: 0 },
        { agentId: 'emmie', role: 'Follow-up Specialist', order: 1 },
      ],
      orchestratorType: 'sequential',
      settings: {
        maxRounds: 3,
        timeout: 20000,
      },
    },
    {
      teamId: 'team_content_creation',
      name: 'Content Creation Team',
      members: [
        { agentId: 'dexter', role: 'Data & Research', order: 0 },
        { agentId: 'emmie', role: 'Content Writer', order: 1 },
        { agentId: 'aura', role: 'Brand Voice', order: 2 },
      ],
      orchestratorType: 'sequential',
    },
  ];
}
