/**
 * AGENT FACTORY API ROUTES
 *
 * REST API for agent creation, management, and collaboration
 */

import express, { Request, Response } from 'express';
import { agentBuilder } from '../services/AgentBuilderService';
import { teamFormation } from '../services/TeamFormationService';
import { logger } from '../../lib/logger';

const router = express.Router();

// ============================================
// AGENT CREATION
// ============================================

/**
 * POST /api/agent-factory/create
 * Create a new personalized agent
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { request } = req.body;

    if (!request || typeof request !== 'string') {
      return res.status(400).json({ error: 'Request description is required' });
    }

    logger.info(`[API] Agent creation request from ${userId}: "${request}"`);

    // For SSE streaming
    if (req.headers.accept === 'text/event-stream') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const agent = await agentBuilder.createAgent(userId, request, (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      });

      res.write(`data: ${JSON.stringify({
        stage: 'completed',
        progress: 100,
        agent: {
          id: agent.id,
          name: (agent as any).blueprint?.name,
          status: agent.status
        }
      })}\n\n`);
      res.end();
    } else {
      // Regular JSON response
      const agent = await agentBuilder.createAgent(userId, request);
      res.json({ success: true, agent });
    }
  } catch (error: any) {
    logger.error('[API] Agent creation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-factory/agents
 * Get all user's custom agents
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';

    const agents = await agentBuilder.getUserAgents(userId);

    res.json({ agents });
  } catch (error: any) {
    logger.error('[API] Failed to get agents:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-factory/agents/:id
 * Get specific agent instance
 */
router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await agentBuilder.getAgentInstance(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ agent });
  } catch (error: any) {
    logger.error('[API] Failed to get agent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/agent-factory/agents/:id
 * Delete an agent instance
 */
router.delete('/agents/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { id } = req.params;

    await agentBuilder.deleteAgent(id, userId);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('[API] Failed to delete agent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-factory/blueprints
 * Get available agent blueprints (including public ones)
 */
router.get('/blueprints', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';

    const blueprints = await agentBuilder.getAvailableBlueprints(userId);

    res.json({ blueprints });
  } catch (error: any) {
    logger.error('[API] Failed to get blueprints:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEAM FORMATION
// ============================================

/**
 * POST /api/agent-factory/teams/create
 * Form a new agent team
 */
router.post('/teams/create', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { mission, requiredSkills, preferredAgents, maxSize } = req.body;

    if (!mission) {
      return res.status(400).json({ error: 'Mission is required' });
    }

    const team = await teamFormation.formTeam(userId, {
      mission,
      requiredSkills: requiredSkills || [],
      preferredAgents,
      maxSize
    });

    res.json({ success: true, team });
  } catch (error: any) {
    logger.error('[API] Team formation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-factory/teams
 * Get user's active teams
 */
router.get('/teams', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';

    const teams = await teamFormation.getUserTeams(userId);

    res.json({ teams });
  } catch (error: any) {
    logger.error('[API] Failed to get teams:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-factory/teams/:id
 * Get team details
 */
router.get('/teams/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const team = await teamFormation.getTeam(id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ team });
  } catch (error: any) {
    logger.error('[API] Failed to get team:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent-factory/teams/:id/complete
 * Complete team mission
 */
router.post('/teams/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { result } = req.body;

    await teamFormation.completeTeam(id, result);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('[API] Failed to complete team:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent-factory/teams/:id/dissolve
 * Dissolve team
 */
router.post('/teams/:id/dissolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await teamFormation.dissolveTeam(id);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('[API] Failed to dissolve team:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent-factory/status
 * Get factory system status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';

    const agents = await agentBuilder.getUserAgents(userId);
    const teams = await teamFormation.getUserTeams(userId);

    res.json({
      status: 'operational',
      stats: {
        totalAgents: agents.length,
        activeTeams: teams.length,
        factoryAgents: ['CREATOR', 'CODER', 'SAP-CONNECT']
      }
    });
  } catch (error: any) {
    logger.error('[API] Failed to get status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
