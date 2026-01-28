/**
 * MULTI-AGENT COMMUNICATION API
 *
 * Endpoints for agent-to-agent communication and task delegation
 */

import { Router } from 'express';
import { multiAgentCommService } from '../services/MultiAgentCommunicationService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const sendMessageSchema = z.object({
  fromAgentId: z.string(),
  toAgentId: z.string(),
  messageType: z.enum(['request', 'response', 'delegate', 'notify', 'handoff']),
  subject: z.string().optional(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  requiresResponse: z.boolean().optional(),
  replyToId: z.string().optional()
});

const delegateTaskSchema = z.object({
  taskId: z.string(),
  taskName: z.string(),
  taskDescription: z.string().optional(),
  delegatedBy: z.string(),
  delegatedTo: z.string(),
  taskData: z.record(z.any()).optional()
});

/**
 * POST /api/multi-agent/messages
 * Send message from one agent to another
 */
router.post('/messages', async (req, res) => {
  try {
    const data = sendMessageSchema.parse(req.body);
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;

    const message = await multiAgentCommService.sendMessage({
      ...data,
      userId,
      workspaceId
    });

    res.json({
      success: true,
      message
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Send message failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-agent/messages/:agentId
 * Get messages for an agent
 */
router.get('/messages/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const { status, limit } = req.query;

    const messages = await multiAgentCommService.getMessages({
      agentId,
      userId,
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      messages,
      count: messages.length
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Get messages failed:', error);
    res.status(500).json({
      error: 'Failed to get messages',
      message: error.message
    });
  }
});

/**
 * PUT /api/multi-agent/messages/:messageId/processed
 * Mark message as processed
 */
router.put('/messages/:messageId/processed', async (req, res) => {
  try {
    const { messageId } = req.params;

    await multiAgentCommService.markMessageProcessed(messageId);

    res.json({
      success: true,
      message: 'Message marked as processed'
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Mark processed failed:', error);
    res.status(500).json({
      error: 'Failed to mark message as processed',
      message: error.message
    });
  }
});

/**
 * POST /api/multi-agent/delegations
 * Delegate task to another agent
 */
router.post('/delegations', async (req, res) => {
  try {
    const data = delegateTaskSchema.parse(req.body);
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;

    const delegation = await multiAgentCommService.delegateTask({
      ...data,
      userId,
      workspaceId
    });

    res.json({
      success: true,
      delegation
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Delegate task failed:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to delegate task',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-agent/delegations/:agentId
 * Get delegations for an agent
 */
router.get('/delegations/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const { direction, status, limit } = req.query;

    const delegations = await multiAgentCommService.getDelegations({
      agentId,
      userId,
      direction: direction as 'delegated_by' | 'delegated_to' | undefined,
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      delegations,
      count: delegations.length
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Get delegations failed:', error);
    res.status(500).json({
      error: 'Failed to get delegations',
      message: error.message
    });
  }
});

/**
 * PUT /api/multi-agent/delegations/:delegationId/accept
 * Accept delegated task
 */
router.put('/delegations/:delegationId/accept', async (req, res) => {
  try {
    const { delegationId } = req.params;

    const delegation = await multiAgentCommService.acceptTask(delegationId);

    res.json({
      success: true,
      delegation
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Accept task failed:', error);
    res.status(500).json({
      error: 'Failed to accept task',
      message: error.message
    });
  }
});

/**
 * PUT /api/multi-agent/delegations/:delegationId/start
 * Start delegated task
 */
router.put('/delegations/:delegationId/start', async (req, res) => {
  try {
    const { delegationId } = req.params;

    const delegation = await multiAgentCommService.startTask(delegationId);

    res.json({
      success: true,
      delegation
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Start task failed:', error);
    res.status(500).json({
      error: 'Failed to start task',
      message: error.message
    });
  }
});

/**
 * PUT /api/multi-agent/delegations/:delegationId/complete
 * Complete delegated task
 */
router.put('/delegations/:delegationId/complete', async (req, res) => {
  try {
    const { delegationId } = req.params;
    const { result } = req.body;

    const delegation = await multiAgentCommService.completeTask(delegationId, result);

    res.json({
      success: true,
      delegation
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Complete task failed:', error);
    res.status(500).json({
      error: 'Failed to complete task',
      message: error.message
    });
  }
});

/**
 * PUT /api/multi-agent/delegations/:delegationId/fail
 * Fail delegated task
 */
router.put('/delegations/:delegationId/fail', async (req, res) => {
  try {
    const { delegationId } = req.params;
    const { error } = req.body;

    if (!error) {
      return res.status(400).json({
        error: 'Error message is required'
      });
    }

    const delegation = await multiAgentCommService.failTask(delegationId, error);

    res.json({
      success: true,
      delegation
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Fail task failed:', error);
    res.status(500).json({
      error: 'Failed to fail task',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-agent/stats
 * Get communication statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'demo-user';
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;

    const stats = await multiAgentCommService.getStats(userId, workspaceId);

    res.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Get stats failed:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-agent/stream
 * SSE stream for real-time multi-agent communications
 */
router.get('/stream', async (req, res) => {
  try {
    const agentId = req.query.agentId as string;

    if (!agentId) {
      return res.status(400).json({
        error: 'agentId query parameter is required'
      });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', agentId })}\n\n`);

    // Listen for messages to this agent
    const messageHandler = (message: any) => {
      res.write(`data: ${JSON.stringify({
        type: 'message',
        message
      })}\n\n`);
    };

    const delegationHandler = (delegation: any) => {
      res.write(`data: ${JSON.stringify({
        type: 'delegation',
        delegation
      })}\n\n`);
    };

    multiAgentCommService.on(`message:${agentId}`, messageHandler);
    multiAgentCommService.on(`delegation:${agentId}`, delegationHandler);

    // Clean up on client disconnect
    req.on('close', () => {
      multiAgentCommService.off(`message:${agentId}`, messageHandler);
      multiAgentCommService.off(`delegation:${agentId}`, delegationHandler);
      res.end();
    });

  } catch (error: any) {
    console.error('[MULTI_AGENT] Stream failed:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

export default router;
