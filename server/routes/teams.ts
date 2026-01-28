import { Router } from 'express';
import { OrchestratorFactory, TeamConfig } from '@/lib/teams/orchestrator';
import { TraceLogger } from '@/lib/tracing/trace-logger';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/teams
 * List all agent teams
 */
router.get('/', (req, res) => {
  try {
    const teams = getDefaultTeams();

    res.json({
      success: true,
      data: teams,
      count: teams.length,
    });
  } catch (error) {
    logger.error('[TEAMS_GET]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teams',
    });
  }
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', (req, res) => {
  try {
    const { name, description, members, orchestratorType, settings } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Team name is required',
      });
    }

    if (!members || members.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Team must have at least 2 members',
      });
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

    res.json({
      success: true,
      data: team,
      message: 'Team created successfully',
    });
  } catch (error) {
    logger.error('[TEAMS_POST]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create team',
    });
  }
});

/**
 * POST /api/teams/:id/execute
 * Execute a team with a task
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const { userInput } = req.body;

    if (!userInput?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'User input is required',
      });
    }

    // Get team config
    const team = getTeamById(teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found',
      });
    }

    // Create trace for this execution
    const traceId = TraceLogger.generateTraceId();
    const sessionId = req.headers['x-session-id'] as string || `session_${Date.now()}`;
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const trace = new TraceLogger(traceId, team.teamId, userId, sessionId);

    logger.info(`[TEAMS_EXECUTE] Team ${team.name} starting execution`, {
      teamId: team.teamId,
      userInput,
      memberCount: team.members.length,
      orchestratorType: team.orchestratorType,
    });

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
      logger.info(`[TEAMS_EXECUTE] Team ${team.name} completed successfully`, {
        teamId: team.teamId,
        totalLatencyMs,
        totalTokens: result.totalTokens,
        stepsCompleted: result.steps.length,
      });

      trace.logSystemEvent(`Team ${team.name} completed successfully`, {
        teamId: team.teamId,
        totalLatencyMs,
        totalTokens: result.totalTokens,
        stepsCompleted: result.steps.length,
      });
    } else {
      logger.error(`[TEAMS_EXECUTE] Team ${team.name} execution failed`, {
        teamId: team.teamId,
        error: result.error,
      });

      trace.logError(new Error(result.error || 'Team execution failed'), {
        teamId: team.teamId,
        totalLatencyMs,
      });
    }

    trace.end();

    res.json({
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
    logger.error('[TEAMS_EXECUTE]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed',
    });
  }
});

/**
 * Get default teams (demo data)
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

/**
 * Get team by ID
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

export default router;
// Trigger restart
